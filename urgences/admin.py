from django.contrib import admin
from .models import PassageUrgence


@admin.register(PassageUrgence)
class PassageUrgenceAdmin(admin.ModelAdmin):
    list_display = ('patient', 'service', 'niveau_tri', 'date_arrivee', 'statut', 'decision')
    list_filter = ('statut', 'niveau_tri', 'service')
    search_fields = ('patient__nom', 'patient__prenom', 'motif')
