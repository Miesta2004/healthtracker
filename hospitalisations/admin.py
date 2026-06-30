from django.contrib import admin
from .models import Hospitalisation


@admin.register(Hospitalisation)
class HospitalisationAdmin(admin.ModelAdmin):
    list_display = ('patient', 'service', 'medecin_responsable', 'date_admission', 'date_sortie', 'statut')
    list_filter = ('statut', 'service')
    search_fields = ('patient__nom', 'patient__prenom', 'motif_admission')
