from rest_framework import serializers
from .models import Deces, Autopsie


class AutopsieSerializer(serializers.ModelSerializer):
    medecin_legiste_nom = serializers.SerializerMethodField()
    type_label           = serializers.CharField(source='get_type_display', read_only=True)

    class Meta:
        model = Autopsie
        fields = [
            'id', 'deces', 'medecin_legiste', 'medecin_legiste_nom', 'type', 'type_label',
            'date_autopsie', 'cause_deces_determinee', 'constatations',
            'rapport_valide', 'date_validation', 'date_creation',
        ]

    def get_medecin_legiste_nom(self, obj):
        if obj.medecin_legiste:
            return f"{obj.medecin_legiste.prenom} {obj.medecin_legiste.nom}"
        return None


class DecesSerializer(serializers.ModelSerializer):
    patient_nom          = serializers.CharField(source='patient.nom', read_only=True)
    patient_prenom       = serializers.CharField(source='patient.prenom', read_only=True)
    patient_dossier      = serializers.CharField(source='patient.numero_dossier', read_only=True)
    medecin_constatant_nom = serializers.SerializerMethodField()
    statut_label          = serializers.CharField(source='get_statut_display', read_only=True)
    lieu_deces_label       = serializers.CharField(source='get_lieu_deces_display', read_only=True)
    autopsie               = AutopsieSerializer(read_only=True)

    class Meta:
        model = Deces
        fields = [
            'id', 'patient', 'patient_nom', 'patient_prenom', 'patient_dossier',
            'date_deces', 'lieu_deces', 'lieu_deces_label', 'cause_presumee',
            'necessite_autopsie', 'statut', 'statut_label',
            'medecin_constatant', 'medecin_constatant_nom',
            'reclamant_nom', 'reclamant_lien', 'reclamant_telephone', 'date_remise_corps',
            'notes', 'autopsie', 'date_creation', 'date_modification',
        ]

    def get_medecin_constatant_nom(self, obj):
        if obj.medecin_constatant:
            return f"{obj.medecin_constatant.prenom} {obj.medecin_constatant.nom}"
        return None
