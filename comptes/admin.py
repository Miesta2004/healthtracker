from django.contrib import admin
from .models import Employe

@admin.register(Employe)
class EmployeAdmin(admin.ModelAdmin):
    list_display = ['__str__' , 'matricule' , 'role' , 'telephone' , 'actif']
    list_filter = ['role' , 'actif' , 'sexe']
    search_fields = ['nom' , 'prenom' , 'matricule' , 'user__email']