from rest_framework import serializers
from .models import PassageUrgence


class PassageUrgenceSerializer(serializers.ModelSerializer):
    patient_nom        = serializers.SerializerMethodField()
    patient_dossier     = serializers.SerializerMethodField()
    patient_age         = serializers.SerializerMethodField()
    service_nom         = serializers.SerializerMethodField()
    infirmier_nom       = serializers.SerializerMethodField()
    medecin_nom         = serializers.SerializerMethodField()
    niveau_tri_label    = serializers.CharField(source='get_niveau_tri_display', read_only=True)
    mode_arrivee_label  = serializers.CharField(source='get_mode_arrivee_display', read_only=True)
    statut_label        = serializers.CharField(source='get_statut_display', read_only=True)
    decision_label      = serializers.CharField(source='get_decision_display', read_only=True)
    temps_attente_minutes = serializers.IntegerField(read_only=True)

    class Meta:
        model = PassageUrgence
        fields = '__all__'

    def get_patient_nom(self, obj):
        return f"{obj.patient.prenom} {obj.patient.nom}"

    def get_patient_dossier(self, obj):
        return obj.patient.numero_dossier

    def get_patient_age(self, obj):
        return obj.patient.age

    def get_service_nom(self, obj):
        return obj.service.nom if obj.service else None

    def get_infirmier_nom(self, obj):
        if obj.infirmier_accueil:
            e = obj.infirmier_accueil
            return f"{e.prenom} {e.nom}"
        return None

    def get_medecin_nom(self, obj):
        if obj.medecin_examinateur:
            e = obj.medecin_examinateur
            return f"{e.prenom} {e.nom}"
        return None
