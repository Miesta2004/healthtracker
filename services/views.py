from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import Service
from .serializers import ServiceSerializer
from comptes.permissions import IsAdminRole, IsInSameService


class ServiceViewSet(viewsets.ModelViewSet):
    """
    CRUD services — création et suppression réservées aux superusers.
    Tout employé authentifié peut lister et lire.
    """
    serializer_class   = ServiceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        # Superuser voit tout
        if user.is_superuser:
            return Service.objects.all()
        # Employé normal : seulement son service
        try:
            return Service.objects.filter(id=user.employe.service_id)
        except Exception:
            return Service.objects.none()

    def get_permissions(self):
        if self.action in ['create', 'destroy', 'update', 'partial_update']:
            return [IsAdminRole()]
        return [IsAuthenticated()]

    @action(detail=True, methods=['get'], url_path='patients')
    def patients(self, request, pk=None):
        """Liste des patients du service."""
        service = self.get_object()
        from patients.serializers import PatientSerializer
        qs = service.patients.filter(actif=True).order_by('nom', 'prenom')
        return Response(PatientSerializer(qs, many=True).data)

    @action(detail=True, methods=['get'], url_path='employes')
    def employes(self, request, pk=None):
        """Liste des employés du service."""
        service = self.get_object()
        from comptes.serializers import EmployeSerializer
        qs = service.employes.filter(actif=True).order_by('role', 'nom')
        return Response(EmployeSerializer(qs, many=True).data)