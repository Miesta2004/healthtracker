from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated, SAFE_METHODS

from comptes.permissions import IsMedecinOuInfirmier, IsAdminRole, IsLectureAutorisee, get_employe
from .models import SignesVitaux
from .serializers import SignesSerializer


class SignesVitauxViewSet(viewsets.ModelViewSet):
    serializer_class   = SignesSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        patient_id = self.request.query_params.get('patient')

        if user.is_superuser:
            qs = SignesVitaux.objects.select_related('patient').all()
            if patient_id:
                qs = qs.filter(patient_id=patient_id)
            return qs

        emp = get_employe(user)
        if emp is None or emp.role in ('secretaire', 'laborantin'):
            return SignesVitaux.objects.none()

        qs = SignesVitaux.objects.select_related('patient')

        # Filtrer par service
        if emp.service:
            qs = qs.filter(patient__service=emp.service)
        else:
            return SignesVitaux.objects.none()

        # Filtrer par patient si passé en query param (?patient=<id>)
        if patient_id:
            qs = qs.filter(patient_id=patient_id)

        return qs

    def get_permissions(self):
        if self.request.method in SAFE_METHODS:
            return [IsLectureAutorisee()]
        if self.action == 'destroy':
            return [IsAdminRole()]
        return [IsMedecinOuInfirmier()]