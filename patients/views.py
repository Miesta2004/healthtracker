from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import Patient
from .serializers import PatientSerializer

# Create your views here.
class PatientViewSet(viewsets.ModelViewSet):
    #ModelViewSet c'est la classe la plus puissante de Django REST Framework.
    # Elle contient déjà codés en interne les 5 endpoints CRUD — tu ne réécris rien.
    queryset = Patient.objects.all()
    #queryset = Patient.objects.all() c'est ta requête SQL par défaut.
    # En Spring Boot tu écrirais patientRepository.findAll(). Ici Django le fait pour toi.
    serializer_class = PatientSerializer
    permission_classes = [IsAuthenticated]
    #permission_classes = [IsAuthenticated] c'est le vigile — sans token JWT valide,
    # la requête est rejetée avec une erreur 401.