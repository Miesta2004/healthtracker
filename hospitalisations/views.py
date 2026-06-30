from django.utils import timezone
from rest_framework import viewsets
from rest_framework.permissions import SAFE_METHODS, IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response

from comptes.permissions import IsAdminRole, IsLectureAutorisee, IsMedecinOuAdmin, get_employe
from .models import Hospitalisation, StatutHospitalisation
from .serializers import HospitalisationSerializer


class HospitalisationViewSet(viewsets.ModelViewSet):
    serializer_class   = HospitalisationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            qs = Hospitalisation.objects.select_related('patient', 'service', 'medecin_responsable').all()
        else:
            emp = get_employe(user)
            if emp is None or emp.role == 'laborantin':
                return Hospitalisation.objects.none()
            if emp.service:
                qs = Hospitalisation.objects.select_related(
                    'patient', 'service', 'medecin_responsable'
                ).filter(service=emp.service)
            else:
                return Hospitalisation.objects.none()

        patient_id = self.request.query_params.get('patient')
        if patient_id:
            qs = qs.filter(patient_id=patient_id)

        statut = self.request.query_params.get('statut')
        if statut:
            qs = qs.filter(statut=statut)

        return qs

    def get_permissions(self):
        if self.request.method in SAFE_METHODS:
            return [IsLectureAutorisee()]
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'sortie']:
            return [IsMedecinOuAdmin()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        emp = get_employe(self.request.user)
        extra = {}
        if emp and emp.service and not serializer.validated_data.get('service'):
            extra['service'] = emp.service
        serializer.save(**extra)

    @action(detail=True, methods=['post'], url_path='sortie')
    def sortie(self, request, pk=None):
        """Enregistre la sortie d'un patient hospitalisé."""
        hospitalisation = self.get_object()
        hospitalisation.date_sortie = request.data.get('date_sortie') or timezone.now()
        hospitalisation.diagnostic_sortie = request.data.get('diagnostic_sortie', hospitalisation.diagnostic_sortie)
        hospitalisation.notes = request.data.get('notes', hospitalisation.notes)
        hospitalisation.statut = request.data.get('statut', StatutHospitalisation.TERMINEE)
        hospitalisation.save()
        return Response(HospitalisationSerializer(hospitalisation).data)
