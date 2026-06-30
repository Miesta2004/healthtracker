from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import Alerte
from .serializers import AlerteSerializer
from comptes.permissions import get_employe, IsLectureAutorisee


class AlerteViewSet(viewsets.ModelViewSet):
    serializer_class   = AlerteSerializer
    permission_classes = [IsLectureAutorisee]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return Alerte.objects.select_related('patient').all()

        emp = get_employe(user)
        if emp is None:
            return Alerte.objects.none()

        if emp.service:
            return Alerte.objects.select_related('patient').filter(
                patient__service=emp.service
            )
        return Alerte.objects.none()