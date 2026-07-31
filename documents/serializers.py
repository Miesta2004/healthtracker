from rest_framework import serializers
from .models import ModeleDocument, DocumentGenere


class ModeleDocumentSerializer(serializers.ModelSerializer):
    type_document_label = serializers.CharField(source='get_type_document_display', read_only=True)
    cree_par_nom = serializers.SerializerMethodField()

    class Meta:
        model = ModeleDocument
        fields = [
            'id', 'nom', 'type_document', 'type_document_label', 'corps',
            'actif', 'cree_par', 'cree_par_nom', 'date_creation', 'date_modification',
        ]
        read_only_fields = ['cree_par', 'date_creation', 'date_modification']

    def get_cree_par_nom(self, obj):
        if obj.cree_par:
            return f"{obj.cree_par.prenom} {obj.cree_par.nom}"
        return None


class DocumentGenereSerializer(serializers.ModelSerializer):
    type_document_label = serializers.CharField(source='get_type_document_display', read_only=True)
    patient_nom = serializers.CharField(source='patient.nom', read_only=True)
    patient_prenom = serializers.CharField(source='patient.prenom', read_only=True)
    modele_nom = serializers.CharField(source='modele.nom', read_only=True, default=None)
    genere_par_nom = serializers.SerializerMethodField()

    class Meta:
        model = DocumentGenere
        fields = [
            'id', 'patient', 'patient_nom', 'patient_prenom', 'consultation',
            'modele', 'modele_nom', 'type_document', 'type_document_label',
            'titre', 'contenu', 'genere_par', 'genere_par_nom', 'date_creation',
        ]
        # 'titre' et 'contenu' restent modifiables après génération (ex. compléter
        # une date d'arrêt de travail) — tout le reste (provenance, patient,
        # auteur...) est figé pour garder une trace fidèle de la génération.
        read_only_fields = [
            'id', 'patient', 'patient_nom', 'patient_prenom', 'consultation',
            'modele', 'modele_nom', 'type_document', 'type_document_label',
            'genere_par', 'genere_par_nom', 'date_creation',
        ]

    def get_genere_par_nom(self, obj):
        if obj.genere_par:
            return f"{obj.genere_par.prenom} {obj.genere_par.nom}"
        return None
