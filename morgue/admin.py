from django.contrib import admin
from .models import Deces, Autopsie


class AutopsieInline(admin.StackedInline):
    model = Autopsie
    extra = 0


@admin.register(Deces)
class DecesAdmin(admin.ModelAdmin):
    list_display = ('patient', 'date_deces', 'lieu_deces', 'necessite_autopsie', 'statut')
    list_filter = ('statut', 'lieu_deces', 'necessite_autopsie')
    search_fields = ('patient__nom', 'patient__prenom', 'patient__numero_dossier')
    inlines = [AutopsieInline]


@admin.register(Autopsie)
class AutopsieAdmin(admin.ModelAdmin):
    list_display = ('deces', 'medecin_legiste', 'type', 'date_autopsie', 'rapport_valide')
    list_filter = ('type', 'rapport_valide')
