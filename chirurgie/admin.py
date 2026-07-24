from django.contrib import admin
from .models import SalleBloc, InterventionChirurgicale


@admin.register(SalleBloc)
class SalleBlocAdmin(admin.ModelAdmin):
    list_display = ('nom', 'service', 'statut')
    list_filter = ('service', 'statut')


@admin.register(InterventionChirurgicale)
class InterventionChirurgicaleAdmin(admin.ModelAdmin):
    list_display = ('type_acte', 'patient', 'service_chirurgie', 'chirurgien_principal', 'heure_debut', 'statut')
    list_filter = ('statut', 'service_chirurgie')
    search_fields = ('patient__nom', 'patient__prenom', 'type_acte')
