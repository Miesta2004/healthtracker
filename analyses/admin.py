from django.contrib import admin
from .models import DemandeAnalyse

@admin.register(DemandeAnalyse)
class DemandeAnalyseAdmin(admin.ModelAdmin):
    list_display  = ['patient', 'type_analyse', 'statut', 'urgence', 'demandeur', 'date_demande']
    list_filter   = ['statut', 'urgence', 'type_analyse']
    search_fields = ['patient__nom', 'patient__prenom', 'patient__numero_dossier']