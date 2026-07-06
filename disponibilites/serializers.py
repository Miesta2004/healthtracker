from rest_framework import serializers
from .models import CreneauDisponibilite, ExceptionDisponibilite


class CreneauSerializer(serializers.ModelSerializer):
    jour_label = serializers.CharField(source='get_jour_display', read_only=True)
    type_label = serializers.CharField(source='get_type_display', read_only=True)

    class Meta:
        model  = CreneauDisponibilite
        fields = [
            'id', 'employe', 'jour', 'jour_label',
            'heure_debut', 'heure_fin', 'type', 'type_label', 'actif'
        ]
        read_only_fields = ['employe']


class ExceptionSerializer(serializers.ModelSerializer):
    type_label = serializers.CharField(source='get_type_display', read_only=True)

    class Meta:
        model  = ExceptionDisponibilite
        fields = [
            'id', 'employe', 'type', 'type_label',
            'date_debut', 'date_fin', 'motif', 'valide', 'date_creation'
        ]
        read_only_fields = ['employe', 'valide', 'date_creation']