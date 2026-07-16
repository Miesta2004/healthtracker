from rest_framework import serializers
from .models import CreneauDisponibilite, ExceptionDisponibilite, AssignationPatient


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


class AssignationPatientSerializer(serializers.ModelSerializer):
    shift_label      = serializers.CharField(source='get_shift_display', read_only=True)
    infirmier_nom    = serializers.CharField(source='infirmier.nom', read_only=True)
    infirmier_prenom = serializers.CharField(source='infirmier.prenom', read_only=True)
    patient_nom      = serializers.CharField(source='patient.nom', read_only=True)
    patient_prenom   = serializers.CharField(source='patient.prenom', read_only=True)
    patient_dossier  = serializers.CharField(source='patient.numero_dossier', read_only=True)
    service_nom      = serializers.CharField(source='service.nom', read_only=True)

    class Meta:
        model  = AssignationPatient
        fields = [
            'id', 'infirmier', 'infirmier_nom', 'infirmier_prenom',
            'patient', 'patient_nom', 'patient_prenom', 'patient_dossier',
            'service', 'service_nom', 'date', 'shift', 'shift_label', 'date_creation',
        ]
        read_only_fields = ['service', 'date_creation']

    def validate_infirmier(self, infirmier):
        if infirmier.role != 'infirmier':
            raise serializers.ValidationError("Seul un employé avec le rôle infirmier peut être assigné à un patient.")
        return infirmier