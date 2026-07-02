from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Count, Q

from .models import Service
from .serializers import ServiceSerializer
from comptes.permissions import IsAdminRole


class ServiceViewSet(viewsets.ModelViewSet):
    serializer_class   = ServiceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # annotate() calcule nb_patients et nb_employes en 1 seule requête SQL
        qs = Service.objects.select_related('chef_de_service').annotate(
            nb_patients=Count('patients', filter=Q(patients__actif=True), distinct=True),
            nb_employes=Count('employes', filter=Q(employes__actif=True), distinct=True),
        )
        user = self.request.user
        if user.is_superuser:
            return qs
        try:
            return qs.filter(id=user.employe.service_id)
        except Exception:
            return Service.objects.none()

    def get_permissions(self):
        if self.action in ['create', 'destroy', 'update', 'partial_update']:
            return [IsAdminRole()]
        return [IsAuthenticated()]

    @action(detail=True, methods=['get'], url_path='patients')
    def patients(self, request, pk=None):
        service = self.get_object()
        from patients.serializers import PatientListSerializer
        qs = service.patients.filter(actif=True).order_by('nom', 'prenom')
        return Response(PatientListSerializer(qs, many=True).data)

    @action(detail=True, methods=['get'], url_path='employes')
    def employes(self, request, pk=None):
        service = self.get_object()
        from comptes.serializers import EmployeSerializer
        qs = service.employes.select_related('user').filter(actif=True).order_by('role', 'nom')
        return Response(EmployeSerializer(qs, many=True).data)