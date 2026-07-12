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
    type_label          = serializers.CharField(source='get_type_display', read_only=True)
    statut_label        = serializers.CharField(source='get_statut_display', read_only=True)
    employe_nom         = serializers.CharField(source='employe.nom', read_only=True)
    employe_prenom      = serializers.CharField(source='employe.prenom', read_only=True)
    employe_role_label  = serializers.CharField(source='employe.get_role_display', read_only=True)

    class Meta:
        model  = ExceptionDisponibilite
        fields = [
            'id', 'employe', 'employe_nom', 'employe_prenom', 'employe_role_label',
            'type', 'type_label', 'date_debut', 'date_fin', 'motif',
            'valide', 'statut', 'statut_label', 'date_creation'
        ]
        read_only_fields = ['employe', 'valide', 'statut', 'date_creation']