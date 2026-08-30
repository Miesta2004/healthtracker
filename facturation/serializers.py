from django.db.models import Sum
from rest_framework import serializers

from .models import (
    Facture, LigneFacture, Paiement, EcheancierPaiement, Echeance, TarifActe, BordereauAssurance,
    StatutValidationAssurance,
)


class BordereauAssuranceSerializer(serializers.ModelSerializer):
    nombre_lignes = serializers.SerializerMethodField()
    montant_total_demande = serializers.SerializerMethodField()
    cree_par_nom = serializers.SerializerMethodField()

    class Meta:
        model = BordereauAssurance
        fields = '__all__'
        # numero_bordereau/statut/date_soumission changent uniquement via
        # les actions dédiées (generer/soumettre) — jamais par PATCH direct,
        # pour garder une trace cohérente de qui a soumis quoi et quand.
        read_only_fields = ('numero_bordereau', 'statut', 'date_soumission', 'cree_par')

    def get_nombre_lignes(self, obj):
        return obj.lignes.count()

    def get_montant_total_demande(self, obj):
        total = obj.lignes.aggregate(total=Sum('montant_part_assurance_ligne'))['total']
        return total or 0

    def get_cree_par_nom(self, obj):
        if obj.cree_par:
            return f"{obj.cree_par.prenom} {obj.cree_par.nom}"
        return None


class TarifActeSerializer(serializers.ModelSerializer):
    service_nom = serializers.CharField(source='service.nom', default=None, read_only=True)

    class Meta:
        model = TarifActe
        fields = '__all__'


class LigneFactureSerializer(serializers.ModelSerializer):
    class Meta:
        model = LigneFacture
        fields = '__all__'
        # montant_ligne / montant_part_assurance_ligne / montant_part_patient_ligne
        # sont calculés dans LigneFacture.save() — jamais acceptés en entrée,
        # sinon un client pourrait forcer un montant qui ne correspond pas à
        # quantite * prix_unitaire. prix_unitaire reste en lecture seule dès
        # qu'un tarif_acte est déjà associé (voir validate()).
        read_only_fields = (
            'montant_ligne', 'montant_part_assurance_ligne', 'montant_part_patient_ligne',
        )

    def validate(self, attrs):
        # Un seul lien source à la fois (consultation / hospitalisation /
        # demande_analyse) — évite une ligne ambiguë sur sa provenance.
        liens = [attrs.get(champ) for champ in ('consultation', 'hospitalisation', 'demande_analyse')]
        if sum(1 for l in liens if l is not None) > 1:
            raise serializers.ValidationError(
                "Une ligne de facture ne peut être liée qu'à une seule source "
                "(consultation, hospitalisation OU demande d'analyse)."
            )
        return attrs


class PaiementSerializer(serializers.ModelSerializer):
    encaisse_par_nom = serializers.SerializerMethodField()

    class Meta:
        model = Paiement
        fields = '__all__'
        read_only_fields = ('date_paiement', 'encaisse_par')

    def get_encaisse_par_nom(self, obj):
        if obj.encaisse_par:
            e = obj.encaisse_par
            return f"{e.prenom} {e.nom}"
        return None

    def validate(self, attrs):
        if attrs.get('mode_paiement') == 'mobile_money' and not attrs.get('operateur_mobile_money'):
            raise serializers.ValidationError(
                "operateur_mobile_money est requis quand mode_paiement = 'mobile_money'."
            )
        return attrs


class EcheanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Echeance
        fields = '__all__'
        read_only_fields = ('montant_paye', 'statut')


class EcheancierPaiementSerializer(serializers.ModelSerializer):
    echeances = EcheanceSerializer(many=True, read_only=True)

    class Meta:
        model = EcheancierPaiement
        fields = '__all__'
        # facture non modifiable après coup (OneToOne, créé une seule fois
        # via l'action dédiée sur FactureViewSet) ; date_signature/
        # document_signe_url passent par une action séparée 'signer' (voir
        # views.py) plutôt que par un PATCH direct, pour tracer qui a
        # enregistré la signature.
        read_only_fields = ('facture', 'date_creation')

    def validate(self, attrs):
        facture = attrs.get('facture') or getattr(self.instance, 'facture', None)
        montant = attrs.get('montant_total_echeancier')
        if facture and montant is not None and montant > facture.montant_part_patient:
            raise serializers.ValidationError(
                "Le montant de l'échéancier ne peut pas dépasser la part "
                "patient de la facture (la part assurance suit son propre circuit)."
            )
        return attrs


class FactureSerializer(serializers.ModelSerializer):
    patient_nom     = serializers.CharField(source='patient.nom', read_only=True)
    patient_prenom  = serializers.CharField(source='patient.prenom', read_only=True)
    patient_dossier = serializers.CharField(source='patient.numero_dossier', read_only=True)
    service_nom     = serializers.CharField(source='service.nom', default=None, read_only=True)
    statut_label    = serializers.CharField(source='get_statut_display', read_only=True)
    cree_par_nom    = serializers.SerializerMethodField()

    lignes     = LigneFactureSerializer(many=True, read_only=True)
    paiements  = PaiementSerializer(many=True, read_only=True)
    echeancier = EcheancierPaiementSerializer(read_only=True)

    class Meta:
        model = Facture
        fields = '__all__'
        # Les 5 montants agrégés + numero_facture + statut ne sont JAMAIS
        # acceptés en entrée : ils sont calculés par Facture.save() /
        # recalculer_montants(), jamais par le client (cf. discussion sur
        # la source de vérité unique). Ajouter/modifier des lignes ou
        # paiements est ce qui les fait évoluer, pas un PATCH direct sur la facture.
        read_only_fields = (
            'numero_facture', 'statut',
            'montant_total', 'montant_part_assurance', 'montant_part_patient',
            'montant_paye', 'montant_restant',
            'cree_par',
        )

    def get_cree_par_nom(self, obj):
        if obj.cree_par:
            e = obj.cree_par
            return f"{e.prenom} {e.nom}"
        return None


class NouvelleLigneFactureSerializer(serializers.ModelSerializer):
    """
    Payload de création d'une ligne, utilisé par l'action
    FactureViewSet.ajouter_ligne() — distinct de LigneFactureSerializer pour
    ne jamais accepter `facture` en entrée (déduit de l'URL, pas du body).

    type_acte / description / prix_unitaire deviennent optionnels dès qu'un
    tarif_acte est fourni : LigneFacture.save() les déduit du tarif catalogué
    et IGNORE tout prix_unitaire envoyé par le client dans ce cas (défense
    contre un prix falsifié sur un acte pourtant standardisé) — voir
    LigneFacture.save().
    """
    class Meta:
        model = LigneFacture
        exclude = ('facture', 'montant_ligne', 'montant_part_assurance_ligne', 'montant_part_patient_ligne')
        extra_kwargs = {
            'prix_unitaire': {'required': False},
            'type_acte':     {'required': False},
            'description':   {'required': False},
        }

    def validate(self, attrs):
        if not attrs.get('tarif_acte'):
            manquants = [c for c in ('type_acte', 'description', 'prix_unitaire') if not attrs.get(c)]
            if manquants:
                raise serializers.ValidationError(
                    f"{', '.join(manquants)} requis pour un acte hors nomenclature (sans tarif_acte)."
                )
        elif attrs['tarif_acte'].actif is False:
            raise serializers.ValidationError("Ce tarif est désactivé — il ne peut plus être utilisé pour une nouvelle ligne.")
        return attrs


class ReponseAssuranceSerializer(serializers.Serializer):
    """Payload de l'action LigneFactureViewSet.reponse_assurance()."""
    statut = serializers.ChoiceField(choices=[
        StatutValidationAssurance.VALIDE,
        StatutValidationAssurance.REJETE,
        StatutValidationAssurance.REJETE_PARTIEL,
    ])
    montant_valide = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    motif_rejet = serializers.CharField(required=False, allow_blank=True, default='')

    def validate(self, attrs):
        if attrs['statut'] == StatutValidationAssurance.REJETE_PARTIEL and 'montant_valide' not in attrs:
            raise serializers.ValidationError("montant_valide est requis pour un rejet partiel.")
        return attrs


class GenererBordereauSerializer(serializers.Serializer):
    """Payload de l'action BordereauAssuranceViewSet.generer()."""
    mutuelle_nom = serializers.CharField(max_length=150)