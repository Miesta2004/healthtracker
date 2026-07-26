from rest_framework import serializers
from services.models import Service
from .models import Patient, Accompagnant


class AccompagnantSerializer(serializers.ModelSerializer):
    """Serializer complet — utilisé pour la vue « Contrôle Accompagnants » et le CRUD dédié."""
    patient_nom        = serializers.CharField(source='patient.nom', read_only=True)
    patient_prenom     = serializers.CharField(source='patient.prenom', read_only=True)
    patient_dossier    = serializers.CharField(source='patient.numero_dossier', read_only=True)
    statut_label       = serializers.CharField(source='get_statut_display', read_only=True)
    enregistre_par_nom = serializers.SerializerMethodField()

    class Meta:
        model  = Accompagnant
        fields = [
            'id', 'patient', 'patient_nom', 'patient_prenom', 'patient_dossier',
            'nom', 'prenom', 'lien_parente', 'cni', 'telephone',
            'statut', 'statut_label', 'date_entree', 'date_sortie',
            'enregistre_par', 'enregistre_par_nom',
        ]
        read_only_fields = ['id', 'statut', 'date_entree', 'date_sortie', 'enregistre_par']

    def get_enregistre_par_nom(self, obj):
        if obj.enregistre_par:
            e = obj.enregistre_par
            return f"{e.prenom} {e.nom}"
        return None


class AccompagnantAdmissionSerializer(serializers.ModelSerializer):
    """Sous-partie « accompagnant » écrite en même temps que le formulaire unique d'admission."""

    class Meta:
        model  = Accompagnant
        fields = ['nom', 'prenom', 'lien_parente', 'cni', 'telephone']


class PatientListSerializer(serializers.ModelSerializer):
    """Serializer léger pour la liste — champs minimaux, pas de SerializerMethodField lourd."""
    age         = serializers.IntegerField(read_only=True)
    service_nom = serializers.CharField(source='service.nom', default=None, read_only=True)
    statut_orientation_label = serializers.CharField(source='get_statut_orientation_display', read_only=True)

    class Meta:
        model  = Patient
        fields = [
            'id', 'nom', 'prenom', 'age', 'sexe', 'telephone',
            'groupe_sanguin', 'allergies', 'antecedents', 'actif',
            'numero_dossier', 'date_creation', 'service_nom',
            'date_naissance_estimee', 'statut_vital',
            'statut_orientation', 'statut_orientation_label',
            'identite_provisoire',
        ]


class PatientSearchSerializer(serializers.ModelSerializer):
    """
    Résultat de recherche pour l'identitovigilance (GET /patients/search/).
    Volontairement compact — l'agent doit pouvoir scanner une liste de
    résultats en un coup d'œil — et inclut les accompagnants qui ont fait
    matcher ce patient (recherche inversée), pour que l'agent comprenne
    *pourquoi* le patient est remonté quand ce n'est pas via son propre nom.
    """
    age                       = serializers.IntegerField(read_only=True)
    service_nom               = serializers.CharField(source='service.nom', default=None, read_only=True)
    statut_orientation_label  = serializers.CharField(source='get_statut_orientation_display', read_only=True)
    accompagnants_correspondants = serializers.SerializerMethodField()

    class Meta:
        model  = Patient
        fields = [
            'id', 'nom', 'prenom', 'age', 'date_naissance', 'sexe', 'telephone',
            'numero_dossier', 'service_nom', 'statut_orientation', 'statut_orientation_label',
            'identite_provisoire', 'accompagnants_correspondants',
        ]

    def get_accompagnants_correspondants(self, obj):
        query = (self.context.get('query') or '').strip()
        if not query:
            return []
        from django.db.models import Q
        matches = obj.accompagnants.filter(
            Q(nom__icontains=query) | Q(prenom__icontains=query) |
            Q(telephone__icontains=query) | Q(cni__icontains=query)
        )
        return AccompagnantSerializer(matches, many=True).data


class PatientSerializer(serializers.ModelSerializer):
    """Serializer complet pour le détail d'un patient."""
    age           = serializers.IntegerField(read_only=True)
    service_nom   = serializers.SerializerMethodField()
    medecin_nom   = serializers.SerializerMethodField()
    regularise_par_nom = serializers.SerializerMethodField()
    accompagnants = AccompagnantSerializer(many=True, read_only=True)

    class Meta:
        model  = Patient
        fields = '__all__'

    def get_service_nom(self, obj):
        return obj.service.nom if obj.service else None

    def get_medecin_nom(self, obj):
        if obj.medecin_referent:
            e = obj.medecin_referent
            return f"Dr {e.prenom} {e.nom}"
        return None

    def get_regularise_par_nom(self, obj):
        if obj.regularise_par:
            e = obj.regularise_par
            return f"{e.prenom} {e.nom}"
        return None


class AdmissionSerializer(serializers.ModelSerializer):
    """
    FORMULAIRE UNIQUE de création d'un dossier patient par le Service des
    Admissions (POST /patients/admission/) — un seul point d'entrée, il n'y a
    plus de formulaire "nouveau patient" séparé pour les services : l'état
    civil, les coordonnées, les données administratives (contact d'urgence,
    mutuelle) ET le service de destination sont saisis en une fois, avec le
    bloc dynamique Accompagnants.

    Deux modes, exclusifs :

    - Mode NORMAL (`mode_urgence_vitale=False`, par défaut) : `nom`, `prenom`,
      `date_naissance`, `sexe` et `service` sont requis. Le patient est créé
      au statut EN_ATTENTE_VALIDATION_SERVICE — le secrétariat du service
      choisi doit ensuite « confirmer l'arrivée » (PATCH .../confirmer-arrivee/)
      pour qu'il passe à ADMIS_DANS_LE_SERVICE. Si le motif n'est pas clair,
      l'agent choisit simplement le service "Consultation Externe / Triage"
      comme n'importe quel autre — pas de logique spéciale requise ici.

    - Mode URGENCE (`mode_urgence_vitale=True`) : pour un patient inconscient
      ou seul, sans identité fiable. `nom`/`prenom` deviennent optionnels
      (repli sur "Patient" / "Inconnu" si absents — un accompagnant présent
      peut cependant les renseigner via le bloc `accompagnants`, à valider
      plus tard). Le `service` envoyé par le client est IGNORÉ et forcé sur
      "Urgences" ; le statut est forcé à ADMIS_URGENCES (pas de validation à
      attendre — l'urgence prime) et `identite_provisoire=True`. Le dossier
      est ensuite complété via l'action `regulariser`.

    Dans les deux cas, ce que le client envoie pour `statut_orientation`,
    `identite_provisoire` et `service` (en mode urgence) est ignoré et
    recalculé côté serveur — jamais dépendant du payload brut.
    """
    accompagnants        = AccompagnantAdmissionSerializer(many=True, required=False)
    mode_urgence_vitale   = serializers.BooleanField(write_only=True, required=False, default=False)
    nom                   = serializers.CharField(required=False, allow_blank=True, max_length=100)
    prenom                = serializers.CharField(required=False, allow_blank=True, max_length=100)
    service               = serializers.PrimaryKeyRelatedField(
        queryset=Service.objects.filter(actif=True), required=False, allow_null=True,
        help_text="Service de destination — requis hors mode urgence (ignoré et "
                  "remplacé par 'Urgences' en mode urgence).",
    )

    class Meta:
        model  = Patient
        fields = [
            'id',
            # État civil
            'nom', 'prenom', 'date_naissance', 'date_naissance_estimee', 'sexe',
            'telephone', 'adresse',
            # Contact d'urgence
            'contact_urgence_nom', 'contact_urgence_telephone', 'contact_urgence_lien',
            # Couverture / mutuelle
            'mutuelle', 'numero_mutuelle',
            # Infos médicales de base, utiles dès l'admission (facultatives)
            'groupe_sanguin', 'allergies', 'antecedents',
            # Accompagnant(s) présent(s) à l'admission
            'accompagnants',
            # Orientation et mode urgence
            'service', 'mode_urgence_vitale',
            # Lecture seule
            'numero_dossier', 'statut_orientation', 'identite_provisoire', 'date_creation',
        ]
        read_only_fields = ['id', 'numero_dossier', 'statut_orientation', 'identite_provisoire', 'date_creation']

    def validate(self, attrs):
        mode_urgence = attrs.get('mode_urgence_vitale', False)
        if mode_urgence:
            if not attrs.get('sexe'):
                raise serializers.ValidationError({
                    'sexe': "Le sexe (estimé) est requis même en admission d'urgence."
                })
            if not attrs.get('date_naissance'):
                raise serializers.ValidationError({
                    'date_naissance': "Un âge approximatif (converti en date de naissance "
                                      "estimée côté client) est requis même en admission d'urgence."
                })
        else:
            manquants = {}
            for champ in ('nom', 'prenom', 'date_naissance', 'sexe'):
                if not attrs.get(champ):
                    manquants[champ] = "Ce champ est requis hors admission d'urgence."
            if not attrs.get('service'):
                manquants['service'] = "Le service de destination est requis hors admission d'urgence."
            if manquants:
                raise serializers.ValidationError(manquants)
        return attrs

    def create(self, validated_data):
        mode_urgence = validated_data.pop('mode_urgence_vitale', False)
        accompagnants_data = validated_data.pop('accompagnants', [])

        if mode_urgence:
            service_urgences = Service.objects.filter(nom__iexact='Urgences').first()
            validated_data['service'] = service_urgences
            validated_data['statut_orientation'] = Patient.StatutOrientation.ADMIS_URGENCES
            validated_data['identite_provisoire'] = True
            if not validated_data.get('nom'):
                validated_data['nom'] = 'Inconnu'
            if not validated_data.get('prenom'):
                validated_data['prenom'] = 'Patient'
        else:
            validated_data['statut_orientation'] = Patient.StatutOrientation.EN_ATTENTE_VALIDATION_SERVICE
            validated_data['identite_provisoire'] = False

        patient = Patient.objects.create(**validated_data)

        request = self.context.get('request')
        from comptes.permissions import get_employe
        emp = get_employe(request.user) if request is not None else None
        for acc_data in accompagnants_data:
            Accompagnant.objects.create(patient=patient, enregistre_par=emp, **acc_data)

        return patient


class RegularisationSerializer(serializers.ModelSerializer):
    """
    Action « Régulariser / Compléter le dossier » (PATCH /patients/{id}/regulariser/)
    — réservée aux dossiers créés en mode urgence (`identite_provisoire=True`).
    Ne touche QUE l'identité administrative : jamais les données médicales
    déjà saisies pendant la prise en charge d'urgence (consultations, signes
    vitaux…), qui restent intactes.
    """

    class Meta:
        model  = Patient
        fields = [
            'nom', 'prenom', 'date_naissance', 'date_naissance_estimee', 'sexe',
            'telephone', 'adresse',
            'contact_urgence_nom', 'contact_urgence_telephone', 'contact_urgence_lien',
            'mutuelle', 'numero_mutuelle',
        ]

    def validate(self, attrs):
        if not self.instance.identite_provisoire:
            raise serializers.ValidationError(
                "Ce dossier n'est pas une identité provisoire — il n'y a rien à régulariser."
            )
        return attrs

    def update(self, instance, validated_data):
        from django.utils import timezone
        from comptes.permissions import get_employe

        for champ, valeur in validated_data.items():
            setattr(instance, champ, valeur)
        instance.identite_provisoire = False
        request = self.context.get('request')
        instance.regularise_par = get_employe(request.user) if request is not None else None
        instance.date_regularisation = timezone.now()
        instance.save()
        return instance


class TransfertSerializer(serializers.ModelSerializer):
    """
    Affectation/réaffectation d'un patient à un service (PATCH
    /patients/{id}/transferer/) — sert à la fois pour un premier routage par
    l'agent d'admission et pour un transfert mi-parcours par un médecin ou
    une secrétaire de service. Par défaut, le service destinataire doit
    reconfirmer l'arrivée (repasse à EN_ATTENTE_VALIDATION_SERVICE) ; passer
    `confirmation_immediate=true` saute cette étape (cas d'une coordination
    déjà faite entre les deux services, ex. par téléphone).
    """
    confirmation_immediate = serializers.BooleanField(write_only=True, required=False, default=False)

    class Meta:
        model  = Patient
        fields = ['service', 'confirmation_immediate']

    def validate_service(self, value):
        if value is None:
            raise serializers.ValidationError("Le service de destination est requis.")
        return value

    def update(self, instance, validated_data):
        confirmation_immediate = validated_data.pop('confirmation_immediate', False)
        instance.service = validated_data['service']
        instance.statut_orientation = (
            Patient.StatutOrientation.ADMIS_DANS_LE_SERVICE if confirmation_immediate
            else Patient.StatutOrientation.EN_ATTENTE_VALIDATION_SERVICE
        )
        instance.save(update_fields=['service', 'statut_orientation', 'date_modification'])
        return instance


class BadgeSerializer(serializers.Serializer):
    """
    Payload pour l'impression du badge / bracelet patient (GET /patients/{id}/badge/).
    `serializers.Serializer` simple (pas de ModelSerializer) : la source est
    un dict construit dans la vue, pas directement l'instance Patient —
    `service_nom` y est déjà résolu, et `qr_payload` est une donnée calculée
    qui n'existe pas sur le modèle.
    """
    patient_id          = serializers.IntegerField()
    numero_dossier      = serializers.CharField()
    nom                 = serializers.CharField()
    prenom              = serializers.CharField()
    date_naissance      = serializers.DateField()
    sexe                = serializers.CharField()
    service_nom         = serializers.CharField()
    statut_orientation  = serializers.CharField()
    identite_provisoire = serializers.BooleanField()
    groupe_sanguin      = serializers.CharField(allow_blank=True)
    allergies           = serializers.CharField(allow_blank=True)
    qr_payload          = serializers.CharField()
    genere_le           = serializers.DateTimeField()


class AccompagnantBadgeSerializer(serializers.Serializer):
    """Payload pour le pass d'accès accompagnant (GET /accompagnants/{id}/badge/)."""
    accompagnant_id = serializers.IntegerField()
    nom             = serializers.CharField()
    prenom          = serializers.CharField()
    lien_parente    = serializers.CharField(allow_blank=True)
    patient_nom     = serializers.CharField()
    patient_prenom  = serializers.CharField()
    patient_dossier = serializers.CharField()
    statut          = serializers.CharField()
    qr_payload      = serializers.CharField()
    genere_le       = serializers.DateTimeField()


class PatientLaboSerializer(serializers.ModelSerializer):
    """Serializer restreint pour le laborantin — infos minimales uniquement."""
    age = serializers.IntegerField(read_only=True)

    class Meta:
        model  = Patient
        fields = [
            'id', 'nom', 'prenom', 'age', 'sexe',
            'groupe_sanguin', 'allergies', 'numero_dossier',
        ]
        read_only_fields = fields
