from rest_framework import serializers
from django.utils import timezone
from .models import DemandeAnalyse


class DemandeAnalyseSerializer(serializers.ModelSerializer):
    """Sérialiseur complet — pour médecins et admins."""
    patient_nom     = serializers.SerializerMethodField()
    patient_dossier = serializers.SerializerMethodField()
    demandeur_nom   = serializers.SerializerMethodField()
    laborantin_nom  = serializers.SerializerMethodField()
    type_label      = serializers.CharField(source='get_type_analyse_display', read_only=True)
    statut_label    = serializers.CharField(source='get_statut_display', read_only=True)
    urgence_label   = serializers.CharField(source='get_urgence_display', read_only=True)

    class Meta:
        model  = DemandeAnalyse
        fields = '__all__'

    def get_patient_nom(self, obj):
        return f"{obj.patient.prenom} {obj.patient.nom}"

    def get_patient_dossier(self, obj):
        return obj.patient.numero_dossier

    def get_demandeur_nom(self, obj):
        if obj.demandeur:
            return f"Dr {obj.demandeur.prenom} {obj.demandeur.nom}"
        return None

    def get_laborantin_nom(self, obj):
        if obj.laborantin:
            return f"{obj.laborantin.prenom} {obj.laborantin.nom}"
        return None


class DemandeAnalyseLaboSerializer(serializers.ModelSerializer):
    """Sérialiseur restreint pour le laborantin — pas de dossier médical complet."""
    patient_prenom         = serializers.CharField(source='patient.prenom', read_only=True)
    patient_nom_famille    = serializers.CharField(source='patient.nom', read_only=True)
    patient_dossier        = serializers.CharField(source='patient.numero_dossier', read_only=True)
    patient_age            = serializers.IntegerField(source='patient.age', read_only=True)
    patient_sexe           = serializers.CharField(source='patient.sexe', read_only=True)
    patient_groupe_sanguin = serializers.CharField(source='patient.groupe_sanguin', read_only=True)
    patient_allergies      = serializers.CharField(source='patient.allergies', read_only=True)
    demandeur_nom          = serializers.SerializerMethodField()
    type_label             = serializers.CharField(source='get_type_analyse_display', read_only=True)
    statut_label           = serializers.CharField(source='get_statut_display', read_only=True)
    urgence_label          = serializers.CharField(source='get_urgence_display', read_only=True)

    class Meta:
        model  = DemandeAnalyse
        fields = [
            'id', 'statut', 'statut_label', 'urgence', 'urgence_label',
            'type_analyse', 'type_label',
            'notes_medecin', 'resultats', 'valeurs_normales',
            'date_demande', 'date_resultat', 'demandeur_nom',
            'patient_prenom', 'patient_nom_famille', 'patient_dossier',
            'patient_age', 'patient_sexe', 'patient_groupe_sanguin', 'patient_allergies',
        ]
        read_only_fields = [
            'type_analyse', 'notes_medecin', 'urgence',
            'date_demande', 'patient', 'demandeur', 'consultation',
        ]

    def get_demandeur_nom(self, obj):
        if obj.demandeur:
            return f"Dr {obj.demandeur.prenom} {obj.demandeur.nom}"
        return None

    def update(self, instance, validated_data):
        if validated_data.get('resultats'):
            validated_data['statut'] = 'terminee'
            validated_data['date_resultat'] = timezone.now()
        return super().update(instance, validated_data)