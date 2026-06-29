from rest_framework import viewsets
from rest_framework.permissions import SAFE_METHODS
from comptes.permissions import IsAdminRole, IsMedecinOuInfirmier, IsLectureAutorisee
from .models import Consultation, RendezVous
from rest_framework.permissions import IsAuthenticated
from .serializers import ConsultSerializer, RdvSerializer


class ConsultViewSet(viewsets.ModelViewSet):
    serializer_class = ConsultSerializer

    def get_queryset(self):
        queryset = Consultation.objects.all()
        patient_id = self.request.query_params.get('patient')
        if patient_id:
            queryset = queryset.filter(patient_id=patient_id)
        return queryset

    def get_permissions(self):
        if self.request.method in SAFE_METHODS:
            return [IsLectureAutorisee()]
        if self.action == 'destroy':
            return [IsAdminRole()]
        return [IsMedecinOuInfirmier()]


class RdvViewSet(viewsets.ModelViewSet):
    serializer_class = RdvSerializer

    def get_queryset(self):
        queryset = RendezVous.objects.all()
        patient_id = self.request.query_params.get('patient')
        if patient_id:
            queryset = queryset.filter(patient_id=patient_id)
        return queryset

    def get_permissions(self):
        if self.request.method in SAFE_METHODS:
            # Les rendez-vous sont visibles par tous (y compris secrétaire)
            return [IsLectureAutorisee()]
        if self.action == 'destroy':
            return [IsAdminRole()]
        # Création/modification RDV : secrétaire aussi → on réutilise IsAuthenticated
        return [IsAuthenticated()]