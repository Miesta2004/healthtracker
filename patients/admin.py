from django.contrib import admin
from .models import Patient, Accompagnant

# Register your models here.
@admin.register(Patient)
class PatientAdmin(admin.ModelAdmin):
    list_display = ['nom','prenom','date_naissance','sexe','groupe_sanguin','actif','statut_orientation','identite_provisoire']
    search_fields = ['nom','prenom','telephone']
    list_filter = ['sexe','groupe_sanguin','actif','statut_orientation','identite_provisoire']


@admin.register(Accompagnant)
class AccompagnantAdmin(admin.ModelAdmin):
    list_display = ['nom', 'prenom', 'patient', 'lien_parente', 'statut', 'date_entree', 'date_sortie']
    search_fields = ['nom', 'prenom', 'cni', 'telephone', 'patient__nom', 'patient__prenom']
    list_filter = ['statut']