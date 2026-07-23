from datetime import timedelta
from rest_framework import serializers
from .models import Consultation, RendezVous


class ConsultSerializer(serializers.ModelSerializer):
    # source= évite le SerializerMethodField + requête séparée
    patient_nom    = serializers.CharField(source='patient.nom', read_only=True)
    patient_prenom = serializers.CharField(source='patient.prenom', read_only=True)
    statut_label   = serializers.CharField(source='get_statut_display', read_only=True)

    class Meta:
        model  = Consultation
        fields = '__all__'


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
    branché sur Patient : on ne veut exposer que 4 champs dans ce contexte,
    pas risquer une fuite de champs sensibles via '__all__' comme d'autres
    endpoints du projet.
    """
    id = serializers.IntegerField()
    nom_complet = serializers.SerializerMethodField()
    numero_dossier = serializers.CharField()
    age = serializers.IntegerField()

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

    class Meta:
        model = RendezVous
        fields = [
            'id', 'start_time', 'end_time', 'statut', 'statut_label',
            'type_evenement', 'type_evenement_label',
            'motif', 'notes', 'patient', 'a_alerte_critique', 'consultation_id',
            'medecin_id', 'medecin_nom', 'medecin_prenom',
        ]

    def get_end_time(self, obj):
        return obj.date_heure + timedelta(minutes=obj.duree_minutes)

    def get_a_alerte_critique(self, obj):
        # Alimenté via annotation Exists() en amont (RdvViewSet.mon_planning)
        # pour éviter une requête par ligne — cf. commentaire dans la vue.
        return getattr(obj, '_a_alerte_critique', False)


class IndisponibiliteSerializer(serializers.Serializer):
    type = serializers.CharField()
    type_label = serializers.SerializerMethodField()
    date_debut = serializers.DateField()
    date_fin = serializers.DateField()
    motif = serializers.CharField()

    def get_type_label(self, obj):
        return obj.get_type_display()
