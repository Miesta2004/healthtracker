from rest_framework import serializers
from .models import Antecedent

class AntecedentSerializer(serializers.ModelSerializer):
    type_antecedent_label = serializers.CharField(source='get_type_antecedent_display',read_only=True)
    statut_label = serializers.CharField(source='get_statut_display',read_only=True)

    class Meta:
        model = Antecedent
        fields = [
            'id', 'patient',
            'type_antecedent', 'type_antecedent_label',
            'libelle', 'observations',
            'statut', 'statut_label',
            'date_diagnostic', 'consultation_source',
            'date_creation', 'date_modification',
        ]