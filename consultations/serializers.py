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

    class Meta:
        model  = RendezVous
        fields = '__all__'
