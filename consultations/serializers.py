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
    medecin_nom     = serializers.CharField(source='medecin.nom', read_only=True, default=None)
    medecin_prenom  = serializers.CharField(source='medecin.prenom', read_only=True, default=None)

    class Meta:
        model  = RendezVous
        fields = '__all__'

    def validate(self, data):
        medecin    = data.get('medecin', getattr(self.instance, 'medecin', None))
        date_heure = data.get('date_heure', getattr(self.instance, 'date_heure', None))

        if medecin and date_heure:
            conflit = RendezVous.objects.filter(
                medecin=medecin, date_heure=date_heure
            ).exclude(statut='annule')
            if self.instance:
                conflit = conflit.exclude(pk=self.instance.pk)
            if conflit.exists():
                raise serializers.ValidationError(
                    "Ce créneau est déjà réservé pour ce médecin. "
                    "Merci de choisir un autre horaire."
                )
        return data


# ─── Planning du médecin (calendrier dashboard) ──────────────────────────────
# Sérialiseurs dédiés à GET /consultations/rendez_vous/mon_planning/ — un
# contrat de lecture optimisé pour un composant calendrier, distinct du CRUD
# générique de RdvSerializer (qui expose __all__ et sert RendezVousPage.tsx).

class PatientPlanningSerializer(serializers.Serializer):
    id             = serializers.IntegerField()
    nom_complet    = serializers.SerializerMethodField()
    numero_dossier = serializers.CharField()
    age            = serializers.IntegerField()

    def get_nom_complet(self, obj):
        return f"{obj.prenom} {obj.nom}"


class RdvPlanningSerializer(serializers.ModelSerializer):
    start_time      = serializers.DateTimeField(source='date_heure')
    end_time        = serializers.SerializerMethodField()
    statut_label    = serializers.CharField(source='get_statut_display')
    patient         = PatientPlanningSerializer()
    a_alerte_critique = serializers.SerializerMethodField()
    # Le champ modèle s'appelle `consultation_liee` (FK) — l'attribut Django
    # généré est donc `consultation_liee_id`, pas `consultation_id`. On le
    # remappe explicitement pour respecter le contrat JSON de la spec
    # (`consultation_id`), sans quoi Meta.fields échouerait à l'introspection
    # (aucun champ modèle littéralement nommé `consultation_id`).
    consultation_id = serializers.IntegerField(source='consultation_liee_id', allow_null=True)

    class Meta:
        model  = RendezVous
        fields = [
            'id', 'start_time', 'end_time', 'statut', 'statut_label',
            'motif', 'patient', 'a_alerte_critique', 'consultation_id',
        ]

    def get_end_time(self, obj):
        return obj.date_heure + timedelta(minutes=obj.duree_minutes)

    def get_a_alerte_critique(self, obj):
        # Alimenté via annotation Exists() en amont dans la vue (cf.
        # RdvViewSet.mon_planning), pour éviter une requête N+1 : une seule
        # sous-requête corrélée pour tout le queryset plutôt qu'un aller-
        # retour par rendez-vous.
        return getattr(obj, '_a_alerte_critique', False)


class IndisponibiliteSerializer(serializers.Serializer):
    """Exception de disponibilité (congé/absence/formation/mission) validée,
    projetée sous une forme plate pour le calendrier — pas un miroir du
    modèle ExceptionDisponibilite (pas besoin de `employe`/`statut`/
    `valide`/`date_creation` côté planning)."""
    type       = serializers.CharField()
    type_label = serializers.SerializerMethodField()
    date_debut = serializers.DateField()
    date_fin   = serializers.DateField()
    motif      = serializers.CharField()

    def get_type_label(self, obj):
        return obj.get_type_display()