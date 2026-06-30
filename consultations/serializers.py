from rest_framework import serializers
from .models import Consultation, RendezVous


class ConsultSerializer(serializers.ModelSerializer):
    patient_nom = serializers.SerializerMethodField()

    class Meta:
            model = Consultation
            fields = '__all__'

    def get_patient_nom(self, obj):
        return f"{obj.patient.prenom} {obj.patient.nom}"

class RdvSerializer(serializers.ModelSerializer):
    patient_nom    = serializers.SerializerMethodField()
    patient_dossier = serializers.SerializerMethodField()

    class Meta:
        model = RendezVous
        fields = '__all__'

    def get_patient_nom(self, obj):
        return f"{obj.patient.prenom} {obj.patient.nom}"

    def get_patient_dossier(self, obj):
        return obj.patient.numero_dossier
