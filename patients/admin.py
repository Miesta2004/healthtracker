from django.contrib import admin
from .models import Patient

# Register your models here.
@admin.register(Patient)
class PatientAdmin(admin.ModelAdmin):
    list_display = ['nom','prenom','date_naissance','sexe','groupe_sanguin','actif']
    search_fields = ['nom','prenom','telephone']
    list_filter = ['sexe','groupe_sanguin','actif']