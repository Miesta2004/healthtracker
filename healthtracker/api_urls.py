from django.urls import path, include

urlpatterns = [
    path('', include('patients.urls')),
    path('', include('consultations.urls')),
    path('', include('signes_vitaux.urls')),
    path('', include('alertes.urls')),
]