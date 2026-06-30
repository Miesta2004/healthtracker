from rest_framework import serializers
from .models import Hospitalisation


class HospitalisationSerializer(serializers.ModelSerializer):
    patient_nom     = serializers.SerializerMethodField()
    patient_dossier = serializers.SerializerMethodField()
    service_nom     = serializers.SerializerMethodField()
    medecin_nom     = serializers.SerializerMethodField()
    statut_label    = serializers.CharField(source='get_statut_display', read_only=True)
    duree_jours     = serializers.IntegerField(read_only=True)

    class Meta:
        model = Hospitalisation
        fields = '__all__'

    def get_patient_nom(self, obj):
        return f"{obj.patient.prenom} {obj.patient.nom}"

    def get_patient_dossier(self, obj):
        return obj.patient.numero_dossier

    def get_service_nom(self, obj):
        return obj.service.nom if obj.service else None

    def get_medecin_nom(self, obj):
        if obj.medecin_responsable:
            e = obj.medecin_responsable
            return f"{e.prenom} {e.nom}"
        return None
