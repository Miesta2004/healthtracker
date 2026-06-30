from rest_framework import viewsets
from rest_framework.permissions import SAFE_METHODS, IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response

from comptes.permissions import IsAdminRole, IsLectureAutorisee, IsMedecinOuAdmin, get_employe
from .models import Consultation, RendezVous
from .serializers import ConsultSerializer, RdvSerializer
from antecedents.models import Antecedent, TypeAntecedent, StatutAntecedent
from antecedents.serializers import AntecedentSerializer


class ConsultViewSet(viewsets.ModelViewSet):
    serializer_class   = ConsultSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return Consultation.objects.select_related('patient').all()

        emp = get_employe(user)
        if emp is None or emp.role == 'laborantin':
            return Consultation.objects.none()

        if emp.service:
            return Consultation.objects.select_related('patient').filter(
                patient__service=emp.service
            )
        return Consultation.objects.none()

    def get_permissions(self):
        if self.request.method in SAFE_METHODS:
            return [IsLectureAutorisee()]
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsMedecinOuAdmin()]
        return [IsAuthenticated()]

    @action(detail=True, methods=['post'], url_path='promouvoir_antecedent')
    def promouvoir_antecedent(self, request, pk=None):
        """
        Transforme le diagnostic de cette consultation en antécédent durable.
        """
        consultation = self.get_object()
        libelle = (
                request.data.get('libelle')
                or consultation.diagnostic
                or consultation.motif
                or ''
        ).strip()

        if not libelle:
            return Response(
                {'detail': "Impossible de créer un antécédent sans libellé ni diagnostic."},
                status=400
            )

        antecedent = Antecedent.objects.create(
            patient=consultation.patient,
            consultation_source=consultation,
            libelle=libelle,
            type_antecedent=request.data.get('type_antecedent', TypeAntecedent.AUTRE),
            observations=request.data.get('observations', consultation.notes or ''),
            statut=request.data.get('statut', StatutAntecedent.ACTIF),
            date_diagnostic=request.data.get('date_diagnostic') or consultation.date.date(),
        )
        return Response(AntecedentSerializer(antecedent).data, status=201)


class RdvViewSet(viewsets.ModelViewSet):
    serializer_class   = RdvSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return RendezVous.objects.select_related('patient').all()

        emp = get_employe(user)
        if emp is None or emp.role == 'laborantin':
            return RendezVous.objects.none()

        if emp.service:
            return RendezVous.objects.select_related('patient').filter(
                patient__service=emp.service
            ).order_by('date_heure')
        return RendezVous.objects.none()

    def get_permissions(self):
        if self.request.method in SAFE_METHODS:
            return [IsLectureAutorisee()]
        if self.action == 'destroy':
            return [IsAdminRole()]
        return [IsAuthenticated()]