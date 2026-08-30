from decimal import Decimal

from django.core.exceptions import ValidationError as DjangoValidationError
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import SAFE_METHODS, IsAuthenticated
from rest_framework.response import Response

from comptes.permissions import (
    get_employe, IsAdminRole, PeutGererFacturation, PeutEncaisserPaiement, PeutLireFacturation,
)
from .models import Facture, LigneFacture, Paiement, EcheancierPaiement, Echeance, TarifActe, BordereauAssurance, StatutFacture, StatutEcheance, StatutBordereauAssurance, StatutValidationAssurance
from .nuitees import generer_nuitees_manquantes
from .pdf_utils import generer_pdf_facture, generer_pdf_recu
from .serializers import (
    FactureSerializer, LigneFactureSerializer, NouvelleLigneFactureSerializer,
    PaiementSerializer, EcheancierPaiementSerializer, EcheanceSerializer, TarifActeSerializer,
    BordereauAssuranceSerializer, ReponseAssuranceSerializer, GenererBordereauSerializer,
)

# Statuts pendant lesquels une facture reste modifiable (lignes ajoutables/
# supprimables) — au-delà (en_attente, payee_partiellement, payee, annulee),
# on ne touche plus aux lignes : seul un Paiement ou un événement
# d'échéancier peut encore faire évoluer la facture.
STATUTS_FACTURE_MODIFIABLE = (StatutFacture.BROUILLON, StatutFacture.OUVERTE)


class FactureViewSet(viewsets.ModelViewSet):
    serializer_class = FactureSerializer

    def get_queryset(self):
        user = self.request.user
        qs = Facture.objects.select_related('patient', 'service', 'cree_par').prefetch_related(
            'lignes', 'paiements', 'echeancier__echeances',
        )

        if not user.is_superuser:
            emp = get_employe(user)
            if emp is None:
                return Facture.objects.none()
            # Le facturier reste scopé à son service, comme le sont
            # médecin/secrétaire ailleurs dans le projet. La caisse, elle,
            # est centralisée dans la plupart des hôpitaux (un seul guichet
            # pour tout l'établissement) — un caissier n'est donc PAS
            # restreint par service, il doit pouvoir encaisser n'importe
            # quel patient qui se présente.
            if emp.role == 'facturier' and emp.service_id:
                qs = qs.filter(service_id=emp.service_id)
            elif emp.role == 'admin' and emp.service_id:
                qs = qs.filter(service_id=emp.service_id)
            # caissier (+ tout autre rôle autorisé par PeutLireFacturation) : pas de filtre service

        patient_id = self.request.query_params.get('patient')
        if patient_id:
            qs = qs.filter(patient_id=patient_id)

        statut = self.request.query_params.get('statut')
        if statut:
            qs = qs.filter(statut=statut)

        numero = self.request.query_params.get('numero_facture')
        if numero:
            qs = qs.filter(numero_facture__icontains=numero)

        return qs

    def get_permissions(self):
        if self.request.method in SAFE_METHODS:
            return [PeutLireFacturation()]
        if self.action in ('destroy',):
            return [IsAdminRole()]
        # create / update / partial_update + toutes les actions custom
        # d'administration de la facture (ajouter_ligne, valider, annuler,
        # mettre_en_place_echeancier...) restent exclusives à la facturation.
        return [PeutGererFacturation()]

    def perform_create(self, serializer):
        emp = get_employe(self.request.user)
        extra = {'cree_par': emp}
        if emp and emp.service and not serializer.validated_data.get('service'):
            extra['service'] = emp.service
        facture = serializer.save(**extra)
        # Une facture liée à une hospitalisation en cours démarre "ouverte"
        # (accumule les lignes au fil du séjour) — sinon "brouillon" par défaut.
        if facture.hospitalisation_id and facture.statut == StatutFacture.BROUILLON:
            facture.statut = StatutFacture.OUVERTE
            facture.save(update_fields=['statut'])

    def _verifier_modifiable(self, facture):
        if facture.statut not in STATUTS_FACTURE_MODIFIABLE:
            raise ValidationError(
                f"Impossible de modifier les lignes d'une facture au statut "
                f"'{facture.get_statut_display()}'."
            )

    @action(detail=True, methods=['post'], url_path='ajouter-ligne')
    def ajouter_ligne(self, request, pk=None):
        """Ajoute une ligne d'acte à une facture brouillon/ouverte."""
        facture = self.get_object()
        self._verifier_modifiable(facture)

        serializer = NouvelleLigneFactureSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ligne = serializer.save(facture=facture)  # LigneFacture.save() recalcule les montants de la facture

        return Response(LigneFactureSerializer(ligne).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='valider')
    def valider(self, request, pk=None):
        """
        Clôture le brouillon et le rend visible/payable — passe à 'ouverte'
        si liée à une hospitalisation en cours, sinon 'en_attente'.
        """
        facture = self.get_object()
        if facture.statut != StatutFacture.BROUILLON:
            raise ValidationError("Seule une facture en brouillon peut être validée.")
        if not facture.lignes.exists():
            raise ValidationError("Impossible de valider une facture sans aucune ligne.")

        facture.statut = (
            StatutFacture.OUVERTE if facture.hospitalisation_id else StatutFacture.EN_ATTENTE
        )
        facture.save(update_fields=['statut'])
        return Response(self.get_serializer(facture).data)

    @action(detail=True, methods=['post'], url_path='cloturer')
    def cloturer(self, request, pk=None):
        """
        Clôture une facture 'ouverte' (fin de séjour) — plus aucune ligne ne
        pourra être ajoutée après ça, cf. STATUTS_FACTURE_MODIFIABLE.
        """
        facture = self.get_object()
        if facture.statut != StatutFacture.OUVERTE:
            raise ValidationError("Seule une facture ouverte peut être clôturée.")
        facture.statut = StatutFacture.EN_ATTENTE
        facture.save(update_fields=['statut'])
        facture.recalculer_montants()  # recalcule le statut final (payee/en_attente/...) d'un coup
        return Response(self.get_serializer(facture).data)

    @action(detail=True, methods=['post'], url_path='annuler')
    def annuler(self, request, pk=None):
        facture = self.get_object()
        if facture.montant_paye > 0:
            raise ValidationError(
                "Impossible d'annuler une facture qui a déjà reçu un paiement — "
                "voir avec l'administration pour un avoir/remboursement."
            )
        facture.statut = StatutFacture.ANNULEE
        facture.save(update_fields=['statut'])
        return Response(self.get_serializer(facture).data)

    @action(detail=True, methods=['post'], url_path='echeancier')
    def mettre_en_place_echeancier(self, request, pk=None):
        """
        Crée l'échéancier de paiement fractionné (part patient uniquement)
        et génère immédiatement ses échéances.
        """
        facture = self.get_object()
        if hasattr(facture, 'echeancier'):
            raise ValidationError("Cette facture a déjà un échéancier en cours.")

        serializer = EcheancierPaiementSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        montant = serializer.validated_data['montant_total_echeancier']
        if montant > facture.montant_part_patient:
            raise ValidationError(
                "Le montant de l'échéancier ne peut pas dépasser la part "
                "patient de la facture."
            )

        emp = get_employe(request.user)
        echeancier = serializer.save(facture=facture, cree_par=emp)
        echeancier.generer_echeances()

        return Response(
            EcheancierPaiementSerializer(echeancier).data, status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=['get'], url_path='pdf')
    def telecharger_pdf(self, request, pk=None):
        """
        Bordereau complet (lignes + ventilation + échéancier) — même
        permission que la lecture de la facture (PeutLireFacturation),
        donc accessible au facturier ET au caissier, pas seulement à celui
        qui l'a créée.
        """
        facture = self.get_object()
        buffer = generer_pdf_facture(facture)
        response = HttpResponse(buffer, content_type='application/pdf')
        response['Content-Disposition'] = f'inline; filename="{facture.numero_facture}.pdf"'
        return response

    @action(detail=True, methods=['post'], url_path='actualiser-nuitees')
    def actualiser_nuitees(self, request, pk=None):
        """
        Déclenchement manuel (en plus du cron quotidien
        `generer_nuitees`) : ajoute les nuits déjà passées et pas encore
        facturées pour CETTE facture uniquement. Utile quand le facturier
        veut un état à jour tout de suite, sans attendre le prochain
        passage planifié.
        """
        facture = self.get_object()
        if not facture.hospitalisation_id:
            raise ValidationError("Cette facture n'est pas liée à une hospitalisation.")
        resultat = generer_nuitees_manquantes(facture_id=facture.id)
        facture.refresh_from_db()
        return Response({
            'facture': FactureSerializer(facture).data,
            'nuitees_ajoutees': resultat['ajoutees'],
            'avertissements': resultat['avertissements'],
        })


class LigneFactureViewSet(viewsets.ModelViewSet):
    """
    Lignes d'actes — toujours consultées/filtrées via ?facture=<id> (ou
    ?bordereau=<id> / ?statut_assurance=... pour le circuit assurance). La
    création d'une ligne passe normalement par FactureViewSet.ajouter_ligne()
    (plus lisible dans l'API), mais ce ViewSet reste accessible pour
    l'édition/suppression d'une ligne précise.
    """
    serializer_class = LigneFactureSerializer

    def get_queryset(self):
        qs = LigneFacture.objects.select_related('facture', 'bordereau_assurance')
        facture_id = self.request.query_params.get('facture')
        if facture_id:
            qs = qs.filter(facture_id=facture_id)
        bordereau_id = self.request.query_params.get('bordereau')
        if bordereau_id:
            qs = qs.filter(bordereau_assurance_id=bordereau_id)
        statut_assurance = self.request.query_params.get('statut_assurance')
        if statut_assurance:
            qs = qs.filter(statut_assurance=statut_assurance)
        mutuelle = self.request.query_params.get('mutuelle')
        if mutuelle:
            qs = qs.filter(facture__mutuelle_nom=mutuelle)
        return qs

    def get_permissions(self):
        if self.request.method in SAFE_METHODS:
            return [PeutLireFacturation()]
        return [PeutGererFacturation()]

    def perform_update(self, serializer):
        facture = serializer.instance.facture
        if facture.statut not in STATUTS_FACTURE_MODIFIABLE:
            raise ValidationError(
                f"Impossible de modifier une ligne d'une facture au statut "
                f"'{facture.get_statut_display()}'."
            )
        serializer.save()

    def perform_destroy(self, instance):
        if instance.facture.statut not in STATUTS_FACTURE_MODIFIABLE:
            raise ValidationError(
                f"Impossible de supprimer une ligne d'une facture au statut "
                f"'{instance.facture.get_statut_display()}'."
            )
        instance.delete()  # LigneFacture.delete() recalcule les montants de la facture

    @action(detail=True, methods=['post'], url_path='reponse-assurance')
    def reponse_assurance(self, request, pk=None):
        """
        Enregistre la réponse de l'assureur sur cette ligne précise — la
        part non couverte bascule automatiquement sur le patient (voir
        LigneFacture.appliquer_reponse_assurance()). Peut ramener une
        facture déjà 'payee' à 'payee_partiellement'/'en_attente' si le
        rejet arrive après un paiement complet — c'est le comportement
        voulu (cf. discussion produit : un "payé" côté hôpital n'est
        jamais garanti tant que l'assureur n'a pas validé).
        """
        ligne = self.get_object()
        serializer = ReponseAssuranceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            ligne.appliquer_reponse_assurance(**serializer.validated_data)
        except DjangoValidationError as e:
            raise ValidationError(e.messages[0] if getattr(e, 'messages', None) else str(e))
        return Response(LigneFactureSerializer(ligne).data)


class PaiementViewSet(viewsets.ModelViewSet):
    """
    Encaissements — pas de modification une fois créé (un encaissement erroné
    se corrige par suppression + recréation, jamais par édition silencieuse :
    voir get_permissions, aucune permission 'update' n'est accordée).
    """
    serializer_class = PaiementSerializer

    def get_queryset(self):
        qs = Paiement.objects.select_related('facture', 'echeance', 'encaisse_par')
        facture_id = self.request.query_params.get('facture')
        if facture_id:
            qs = qs.filter(facture_id=facture_id)
        return qs

    def get_permissions(self):
        if self.request.method in SAFE_METHODS:
            return [PeutLireFacturation()]
        if self.action == 'create':
            return [PeutEncaisserPaiement()]
        # update/partial_update/destroy : réservé à l'admin (correction d'une
        # erreur de caisse), jamais au caissier lui-même après coup.
        return [IsAdminRole()]

    def perform_create(self, serializer):
        emp = get_employe(self.request.user)
        serializer.save(encaisse_par=emp)  # Paiement.save() recalcule Facture + Echeance liée

    @action(detail=True, methods=['get'], url_path='recu')
    def recu_pdf(self, request, pk=None):
        """Reçu court d'un encaissement précis — remis au guichet."""
        paiement = self.get_object()
        buffer = generer_pdf_recu(paiement)
        response = HttpResponse(buffer, content_type='application/pdf')
        response['Content-Disposition'] = f'inline; filename="recu-{paiement.facture.numero_facture}-{paiement.id}.pdf"'
        return response


class EcheancierPaiementViewSet(viewsets.ModelViewSet):
    """
    En pratique, la création passe surtout par
    FactureViewSet.mettre_en_place_echeancier() (qui génère aussi les
    échéances) — ce ViewSet reste utile pour la consultation directe et la
    mise à jour du garant/de la signature.
    """
    serializer_class = EcheancierPaiementSerializer

    def get_queryset(self):
        return EcheancierPaiement.objects.select_related('facture').prefetch_related('echeances')

    def get_permissions(self):
        if self.request.method in SAFE_METHODS:
            return [PeutLireFacturation()]
        return [PeutGererFacturation()]

    @action(detail=True, methods=['post'], url_path='signer')
    def signer(self, request, pk=None):
        """
        Enregistre la signature de l'engagement de paiement — action dédiée
        plutôt qu'un simple PATCH, pour toujours horodater au moment réel
        de la signature (pas une date arbitraire envoyée par le client).
        """
        echeancier = self.get_object()
        echeancier.engagement_signe = True
        echeancier.date_signature = timezone.now()
        document_url = request.data.get('document_signe_url')
        if document_url:
            echeancier.document_signe_url = document_url
        echeancier.save(update_fields=['engagement_signe', 'date_signature', 'document_signe_url'])
        return Response(self.get_serializer(echeancier).data)


class EcheanceViewSet(viewsets.ModelViewSet):
    """
    Essentiellement en lecture — les échéances sont générées par
    EcheancierPaiement.generer_echeances(), jamais créées à la main.
    Seule action d'écriture : l'escalade manuelle vers 'impayee'
    (cf. Echeance.recalculer_statut(), qui ne pose jamais ce statut seule).
    """
    serializer_class = EcheanceSerializer
    http_method_names = ['get', 'post', 'head', 'options']  # pas de create/update/destroy standard

    def get_queryset(self):
        qs = Echeance.objects.select_related('echeancier')
        echeancier_id = self.request.query_params.get('echeancier')
        if echeancier_id:
            qs = qs.filter(echeancier_id=echeancier_id)
        return qs

    def get_permissions(self):
        if self.request.method in SAFE_METHODS:
            return [PeutLireFacturation()]
        return [PeutGererFacturation()]

    @action(detail=True, methods=['post'], url_path='marquer-impayee')
    def marquer_impayee(self, request, pk=None):
        """Escalade manuelle après échec de recouvrement — jamais automatique."""
        echeance = self.get_object()
        if echeance.statut == StatutEcheance.PAYEE:
            raise ValidationError("Cette échéance est déjà payée.")
        echeance.statut = StatutEcheance.IMPAYEE
        echeance.save(update_fields=['statut'])

        echeancier = echeance.echeancier
        echeancier.statut = 'en_defaut'
        echeancier.save(update_fields=['statut'])

        return Response(self.get_serializer(echeance).data)


class TarifActeViewSet(viewsets.ModelViewSet):
    """
    Nomenclature des actes facturables. Lecture ouverte à tout employé
    connecté (c'est une liste de prix, pas une donnée sensible — le
    facturier ET le caissier en ont besoin). Écriture réservée à l'admin
    (chef de service / superuser) : si le facturier pouvait librement fixer
    les tarifs, ça viderait de son sens la protection apportée par
    LigneFacture.save() (le prix catalogué prime toujours sur ce qu'envoie
    le client).
    """
    serializer_class = TarifActeSerializer

    def get_queryset(self):
        qs = TarifActe.objects.select_related('service')
        actif = self.request.query_params.get('actif')
        if actif is not None:
            qs = qs.filter(actif=actif.lower() in ('1', 'true'))
        type_acte = self.request.query_params.get('type_acte')
        if type_acte:
            qs = qs.filter(type_acte=type_acte)
        return qs

    def get_permissions(self):
        if self.request.method in SAFE_METHODS:
            return [IsAuthenticated()]
        return [IsAdminRole()]


class BordereauAssuranceViewSet(viewsets.ModelViewSet):
    """
    Circuit de soumission à l'assurance. Centralisé (pas de scoping par
    service, comme la Caisse) — réservé à PeutGererFacturation en écriture.
    La création directe (POST standard) reste possible pour ajuster
    mutuelle_nom/notes, mais le rattachement des lignes passe par l'action
    generer() plutôt qu'un champ M2M en écriture libre.
    """
    serializer_class = BordereauAssuranceSerializer

    def get_queryset(self):
        qs = BordereauAssurance.objects.select_related('cree_par').prefetch_related('lignes')
        statut = self.request.query_params.get('statut')
        if statut:
            qs = qs.filter(statut=statut)
        mutuelle = self.request.query_params.get('mutuelle_nom')
        if mutuelle:
            qs = qs.filter(mutuelle_nom__icontains=mutuelle)
        return qs

    def get_permissions(self):
        if self.request.method in SAFE_METHODS:
            return [PeutLireFacturation()]
        return [PeutGererFacturation()]

    def perform_create(self, serializer):
        serializer.save(cree_par=get_employe(self.request.user))

    @action(detail=False, methods=['post'], url_path='generer')
    def generer(self, request):
        """
        Crée un bordereau en BROUILLON et y rattache toutes les lignes
        actuellement NON_SOUMIS pour la mutuelle donnée, sur des factures
        déjà finalisées (pas brouillon/ouverte — on ne soumet jamais un
        acte encore en cours de saisie à l'assureur).
        """
        payload = GenererBordereauSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        mutuelle_nom = payload.validated_data['mutuelle_nom']

        lignes_eligibles = LigneFacture.objects.filter(
            statut_assurance=StatutValidationAssurance.NON_SOUMIS,
            facture__mutuelle_nom=mutuelle_nom,
            montant_part_assurance_ligne__gt=0,
        ).exclude(facture__statut__in=[StatutFacture.BROUILLON, StatutFacture.OUVERTE])

        if not lignes_eligibles.exists():
            raise ValidationError(
                f"Aucune ligne non soumise à facturer pour « {mutuelle_nom} » sur une facture finalisée."
            )

        bordereau = BordereauAssurance.objects.create(
            mutuelle_nom=mutuelle_nom, cree_par=get_employe(request.user),
        )
        lignes_eligibles.update(bordereau_assurance=bordereau)

        return Response(BordereauAssuranceSerializer(bordereau).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='soumettre')
    def soumettre(self, request, pk=None):
        """Fige l'envoi — voir BordereauAssurance.soumettre() pour le détail."""
        bordereau = self.get_object()
        try:
            bordereau.soumettre()
        except DjangoValidationError as e:
            raise ValidationError(e.messages[0] if getattr(e, 'messages', None) else str(e))
        return Response(BordereauAssuranceSerializer(bordereau).data)