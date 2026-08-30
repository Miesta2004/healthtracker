from django.contrib import admin
from .models import ModeleDocument, DocumentGenere, Medicament


@admin.register(ModeleDocument)
class ModeleDocumentAdmin(admin.ModelAdmin):
    list_display = ['nom', 'type_document', 'actif', 'cree_par', 'date_modification']
    list_filter = ['type_document', 'actif']
    search_fields = ['nom']


@admin.register(DocumentGenere)
class DocumentGenereAdmin(admin.ModelAdmin):
    list_display = ['titre', 'patient', 'type_document', 'statut', 'genere_par', 'date_creation']
    list_filter = ['type_document', 'statut']
    search_fields = ['titre', 'patient__nom', 'patient__prenom']
    readonly_fields = ['patient', 'consultation', 'modele', 'type_document', 'titre', 'donnees', 'contenu', 'genere_par', 'date_creation']


@admin.register(Medicament)
class MedicamentAdmin(admin.ModelAdmin):
    list_display = ['nom', 'dci', 'forme', 'dosages_courants', 'actif']
    list_filter = ['actif', 'forme']
    search_fields = ['nom', 'dci']
