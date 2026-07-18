from django.contrib import admin
from .models import SalleBloc, Operation


@admin.register(SalleBloc)
class SalleBlocAdmin(admin.ModelAdmin):
    list_display = ('nom', 'service', 'actif')
    list_filter = ('service', 'actif')


@admin.register(Operation)
class OperationAdmin(admin.ModelAdmin):
    list_display = ('type_intervention', 'patient', 'service_chirurgie', 'chirurgien_principal', 'date_heure_prevue', 'statut')
    list_filter = ('statut', 'service_chirurgie')
    search_fields = ('patient__nom', 'patient__prenom', 'type_intervention')
