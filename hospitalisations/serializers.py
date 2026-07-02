from rest_framework import serializers
from .models import Hospitalisation


class HospitalisationSerializer(serializers.ModelSerializer):
    patient_nom     = serializers.CharField(source='patient.nom', read_only=True)
    patient_prenom  = serializers.CharField(source='patient.prenom', read_only=True)
    patient_dossier = serializers.CharField(source='patient.numero_dossier', read_only=True)
    service_nom     = serializers.CharField(source='service.nom', default=None, read_only=True)
    medecin_nom     = serializers.SerializerMethodField()
    statut_label    = serializers.CharField(source='get_statut_display', read_only=True)
    duree_jours     = serializers.IntegerField(read_only=True)

    class Meta:
        model  = Hospitalisation
        fields = '__all__'

    def get_medecin_nom(self, obj):
        if obj.medecin_responsable:
            e = obj.medecin_responsable
            return f"{e.prenom} {e.nom}"
        return None
