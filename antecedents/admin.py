from django.contrib import admin
from .models import Antecedent


@admin.register(Antecedent)
class AntecedentAdmin(admin.ModelAdmin):
    list_display = ['libelle', 'patient', 'type_antecedent', 'statut', 'date_diagnostic']
    list_filter = ['type_antecedent', 'statut']
    search_fields = ['libelle', 'patient__nom', 'patient__prenom']
