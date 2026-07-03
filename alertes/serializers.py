from rest_framework import serializers
from .models import Alerte

class AlerteSerializer(serializers.ModelSerializer):
    patient_nom = serializers.SerializerMethodField()
    type_label = serializers.CharField(source='get_type_display', read_only=True)

    class Meta:
        model = Alerte
        fields = '__all__'

    def get_patient_nom(self, obj):
        return f"{obj.patient.prenom} {obj.patient.nom}"
