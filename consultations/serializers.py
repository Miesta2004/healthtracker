from datetime import timedelta
from rest_framework import serializers
from .models import Consultation, RendezVous, EvenementAdministratif


class ConsultSerializer(serializers.ModelSerializer):
    # source= évite le SerializerMethodField + requête séparée
    patient_nom    = serializers.CharField(source='patient.nom', read_only=True)
    patient_prenom = serializers.CharField(source='patient.prenom', read_only=True)
    statut_label   = serializers.CharField(source='get_statut_display', read_only=True)
    decision_orientation_label = serializers.CharField(
        source='get_decision_orientation_display', read_only=True, default=''
    )
    type_consultation_label = serializers.CharField(
        source='get_type_consultation_display', read_only=True, default=''
    )
    # Calculée à partir de started_at/ended_at (cf. Consultation.duree_secondes)
    # plutôt que stockée — voir modèle.
    duree_secondes = serializers.SerializerMethodField()

    class Meta:
        model  = Consultation
        fields = '__all__'

    def get_duree_secondes(self, obj):
        return obj.duree_secondes

    def validate(self, data):
        statut = data.get('statut', getattr(self.instance, 'statut', None))
        decision = data.get(
            'decision_orientation', getattr(self.instance, 'decision_orientation', '')
        )
        if statut == 'terminee' and not decision:
            raise serializers.ValidationError({
                'decision_orientation': (
                    "Indiquez où va le patient (sortie, hospitalisation, "
                    "rendez-vous de suivi) avant de terminer la consultation."
                )
            })
        return data


class RdvSerializer(serializers.ModelSerializer):
    patient_nom     = serializers.CharField(source='patient.nom', read_only=True)
    patient_prenom  = serializers.CharField(source='patient.prenom', read_only=True)
    patient_dossier = serializers.CharField(source='patient.numero_dossier', read_only=True)
    statut_label    = serializers.CharField(source='get_statut_display', read_only=True)
    type_evenement_label = serializers.CharField(source='get_type_evenement_display', read_only=True)
    medecin_nom     = serializers.CharField(source='medecin.nom', read_only=True, default=None)
    medecin_prenom  = serializers.CharField(source='medecin.prenom', read_only=True, default=None)

    class Meta:
        model  = RendezVous
        fields = '__all__'

    def validate(self, data):
        medecin       = data.get('medecin', getattr(self.instance, 'medecin', None))
        patient       = data.get('patient', getattr(self.instance, 'patient', None))
        date_heure    = data.get('date_heure', getattr(self.instance, 'date_heure', None))
        duree_minutes = data.get('duree_minutes', getattr(self.instance, 'duree_minutes', 30))
        statut        = data.get('statut', getattr(self.instance, 'statut', None))

        if not date_heure or statut == 'annule':
            return data

        fin = date_heure + timedelta(minutes=duree_minutes)

        def premier_chevauchement(queryset):
            # Filtre grossier en base (borné à ±24h pour rester performant même
            # avec beaucoup de RDV), puis vérification exacte de chevauchement
            # en Python — un simple `date_heure__lt=fin` ne suffit pas seul
            # car il faut aussi comparer la fin de CHAQUE candidat à notre
            # propre début (impossible à exprimer simplement avec F() sur un
            # DurationField dérivé de duree_minutes).
            candidats = (
                queryset.exclude(statut='annule')
                .filter(date_heure__lt=fin, date_heure__gt=date_heure - timedelta(hours=24))
            )
            if self.instance:
                candidats = candidats.exclude(pk=self.instance.pk)
            for rdv in candidats:
                if rdv.date_heure + timedelta(minutes=rdv.duree_minutes) > date_heure:
                    return rdv
            return None

        if medecin:
            conflit = premier_chevauchement(RendezVous.objects.filter(medecin=medecin))
            if conflit:
                raise serializers.ValidationError({
                    'date_heure': (
                        f"Ce créneau chevauche un autre événement de ce médecin "
                        f"({conflit.get_type_evenement_display()} à {conflit.date_heure.strftime('%H:%M')})."
                    )
                })

        if patient:
            conflit = premier_chevauchement(RendezVous.objects.filter(patient=patient))
            if conflit:
                raise serializers.ValidationError({
                    'date_heure': (
                        f"Ce patient a déjà un événement sur ce créneau "
                        f"({conflit.get_type_evenement_display()} à {conflit.date_heure.strftime('%H:%M')})."
                    )
                })

        return data


class PatientPlanningSerializer(serializers.Serializer):
    """
    Sérialiseur allégé pour le planning médecin — pas un ModelSerializer
    branché sur Patient : on ne veut exposer que 5 champs dans ce contexte,
    pas risquer une fuite de champs sensibles via '__all__' comme d'autres
    endpoints du projet.
    """
    id = serializers.IntegerField()
    nom_complet = serializers.SerializerMethodField()
    numero_dossier = serializers.CharField()
    age = serializers.IntegerField()
    sexe = serializers.CharField()

    def get_nom_complet(self, obj):
        return f"{obj.prenom} {obj.nom}"


class RdvPlanningSerializer(serializers.ModelSerializer):
    start_time = serializers.DateTimeField(source='date_heure')
    end_time = serializers.SerializerMethodField()
    statut_label = serializers.CharField(source='get_statut_display', read_only=True)
    type_evenement_label = serializers.CharField(source='get_type_evenement_display', read_only=True)
    patient = PatientPlanningSerializer()
    a_alerte_critique = serializers.SerializerMethodField()
    consultation_id = serializers.IntegerField(source='consultation_liee_id', read_only=True)
    medecin_id = serializers.IntegerField(read_only=True, default=None)
    medecin_nom = serializers.CharField(source='medecin.nom', read_only=True, default=None)
    medecin_prenom = serializers.CharField(source='medecin.prenom', read_only=True, default=None)
    source = serializers.SerializerMethodField()

    class Meta:
        model = RendezVous
        fields = [
            'id', 'start_time', 'end_time', 'statut', 'statut_label',
            'type_evenement', 'type_evenement_label',
            'motif', 'notes', 'patient', 'a_alerte_critique', 'consultation_id',
            'medecin_id', 'medecin_nom', 'medecin_prenom', 'source',
        ]

    def get_source(self, obj):
        return 'medical'

    def get_end_time(self, obj):
        return obj.date_heure + timedelta(minutes=obj.duree_minutes)

    def get_a_alerte_critique(self, obj):
        # Alimenté via annotation Exists() en amont (RdvViewSet.mon_planning)
        # pour éviter une requête par ligne — cf. commentaire dans la vue.
        return getattr(obj, '_a_alerte_critique', False)


class EvenementAdministratifSerializer(serializers.ModelSerializer):
    """CRUD complet — utilisé par EvenementAdministratifViewSet."""
    type_evenement_label = serializers.CharField(source='get_type_evenement_display', read_only=True)
    statut_label = serializers.CharField(source='get_statut_display', read_only=True)
    service_nom = serializers.CharField(source='service.nom', read_only=True, default=None)
    organisateur_nom = serializers.CharField(source='organisateur.nom', read_only=True, default=None)
    organisateur_prenom = serializers.CharField(source='organisateur.prenom', read_only=True, default=None)

    class Meta:
        model = EvenementAdministratif
        fields = [
            'id', 'titre', 'type_evenement', 'type_evenement_label',
            'service', 'service_nom', 'date_heure_debut', 'date_heure_fin',
            'lieu', 'description', 'participants',
            'organisateur', 'organisateur_nom', 'organisateur_prenom',
            'statut', 'statut_label', 'date_creation',
        ]
        read_only_fields = ['date_creation']


class EvenementAdminPlanningSerializer(serializers.ModelSerializer):
    """
    Vue allégée d'EvenementAdministratif, format compatible avec
    RdvPlanningSerializer (mêmes clés start_time/end_time/statut/...) pour
    que le frontend fusionne les deux sources en une seule liste, distinguées
    par `source`.
    """
    start_time = serializers.DateTimeField(source='date_heure_debut')
    end_time = serializers.DateTimeField(source='date_heure_fin')
    statut_label = serializers.CharField(source='get_statut_display', read_only=True)
    type_evenement_label = serializers.CharField(source='get_type_evenement_display', read_only=True)
    motif = serializers.CharField(source='titre')
    notes = serializers.CharField(source='description', default='', read_only=True)
    source = serializers.SerializerMethodField()
    service_nom = serializers.CharField(source='service.nom', read_only=True, default=None)

    class Meta:
        model = EvenementAdministratif
        fields = [
            'id', 'start_time', 'end_time', 'statut', 'statut_label',
            'type_evenement', 'type_evenement_label', 'motif', 'notes', 'source',
            'lieu', 'service', 'service_nom',
        ]

    def get_source(self, obj):
        return 'administratif'


class IndisponibiliteSerializer(serializers.Serializer):
    type = serializers.CharField()
    type_label = serializers.SerializerMethodField()
    date_debut = serializers.DateField()
    date_fin = serializers.DateField()
    motif = serializers.CharField()

    def get_type_label(self, obj):
        return obj.get_type_display()
