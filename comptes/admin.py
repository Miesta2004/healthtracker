from django.contrib import admin
from .models import Employe, HabilitationService

@admin.register(Employe)
class EmployeAdmin(admin.ModelAdmin):
    list_display = ['__str__' , 'matricule' , 'role' , 'telephone' , 'actif']
    list_filter = ['role' , 'actif' , 'sexe']
    search_fields = ['nom' , 'prenom' , 'matricule' , 'user__email']


@admin.register(HabilitationService)
class HabilitationServiceAdmin(admin.ModelAdmin):
    list_display = ['employe', 'service', 'date_debut', 'date_fin', 'actif']
    list_filter = ['actif', 'service']
    search_fields = ['employe__nom', 'employe__prenom', 'service__nom']