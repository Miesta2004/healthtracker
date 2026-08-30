from rest_framework import serializers
from .models import ModeleDocument, DocumentGenere, Medicament


class ModeleDocumentSerializer(serializers.ModelSerializer):
    type_document_label = serializers.CharField(source='get_type_document_display', read_only=True)
    cree_par_nom = serializers.SerializerMethodField()

    class Meta:
        model = ModeleDocument
        fields = [
            'id', 'nom', 'type_document', 'type_document_label', 'entete', 'pied_de_page',
            'actif', 'cree_par', 'cree_par_nom', 'date_creation', 'date_modification',
        ]
        read_only_fields = ['cree_par', 'date_creation', 'date_modification']

    def get_cree_par_nom(self, obj):
        if obj.cree_par:
            return f"{obj.cree_par.prenom} {obj.cree_par.nom}"
        return None


class MedicamentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Medicament
        fields = ['id', 'nom', 'dci', 'forme', 'dosages_courants']


class DocumentGenereSerializer(serializers.ModelSerializer):
    type_document_label = serializers.CharField(source='get_type_document_display', read_only=True)
    statut_label = serializers.CharField(source='get_statut_display', read_only=True)
    patient_nom = serializers.CharField(source='patient.nom', read_only=True)
    patient_prenom = serializers.CharField(source='patient.prenom', read_only=True)
    modele_nom = serializers.CharField(source='modele.nom', read_only=True, default=None)
    genere_par_nom = serializers.SerializerMethodField()
    entete_rendue = serializers.SerializerMethodField()
    pied_de_page_rendu = serializers.SerializerMethodField()

    class Meta:
        model = DocumentGenere
        fields = [
            'id', 'patient', 'consultation', 'modele', 'modele_nom',
            'type_document', 'type_document_label', 'statut', 'statut_label',
            'titre', 'donnees', 'contenu', 'genere_par', 'genere_par_nom',
            'patient_nom', 'patient_prenom', 'date_creation', 'date_modification',
            'entete_rendue', 'pied_de_page_rendu',
        ]
        read_only_fields = [
            'id', 'patient', 'consultation', 'type_document', 'type_document_label',
            'modele_nom', 'contenu', 'genere_par', 'genere_par_nom',
            'patient_nom', 'patient_prenom', 'date_creation', 'date_modification', 'statut_label',
            'entete_rendue', 'pied_de_page_rendu',
        ]

    def get_genere_par_nom(self, obj):
        if obj.genere_par:
            return f"{obj.genere_par.prenom} {obj.genere_par.nom}"
        return None

    def get_entete_rendue(self, obj):
        if not obj.modele:
            return ''
        return obj.modele.rendre_entete((obj.donnees or {}).get('contexte', {}))

    def get_pied_de_page_rendu(self, obj):
        if not obj.modele:
            return ''
        return obj.modele.rendre_pied_de_page((obj.donnees or {}).get('contexte', {}))
