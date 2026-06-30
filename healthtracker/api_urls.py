from django.urls import path, include

urlpatterns = [
    path('', include('patients.urls')),
    path('', include('consultations.urls')),
    path('', include('signes_vitaux.urls')),
    path('', include('alertes.urls')),
    path('', include('comptes.urls')),
    path('', include('antecedents.urls')),
    path('', include('services.urls')),
    path('', include('analyses.urls')),
    path('', include('hospitalisations.urls')),
    path('', include('urgences.urls')),
]