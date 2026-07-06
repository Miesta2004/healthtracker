from django.utils import timezone
from rest_framework import viewsets
from rest_framework.permissions import SAFE_METHODS, IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response

from comptes.permissions import IsLectureAutorisee, IsMedecinOuInfirmier, get_employe
from .models import PassageUrgence, StatutUrgence, DecisionSortie
from .serializers import PassageUrgenceSerializer


class PassageUrgenceViewSet(viewsets.ModelViewSet):
    serializer_class   = PassageUrgenceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        base_qs = PassageUrgence.objects.select_related(
            'patient', 'service', 'infirmier_accueil', 'medecin_examinateur'
        )

        if user.is_superuser:
            qs = base_qs.all()
        else:
            emp = get_employe(user)
            if emp is None or emp.role in ('laborantin', 'secretaire'):
                return PassageUrgence.objects.none()

            if emp.service and emp.service.nom == 'Urgences':
                # Le service Urgences voit toute la file
                qs = base_qs.all()
            elif emp.service:
                # Les autres services voient uniquement les urgences
                # de leurs propres patients
                qs = base_qs.filter(patient__service=emp.service)
            else:
                return PassageUrgence.objects.none()

        patient_id = self.request.query_params.get('patient')
        if patient_id:
            qs = qs.filter(patient_id=patient_id)

        if self.request.query_params.get('actif') == '1':
            qs = qs.exclude(statut=StatutUrgence.SORTI)

        statut = self.request.query_params.get('statut')
        if statut:
            qs = qs.filter(statut=statut)

        return qs

    def get_permissions(self):
        if self.request.method in SAFE_METHODS:
            return [IsLectureAutorisee()]
        if self.action in ['create', 'update', 'partial_update', 'destroy',
                           'prise_en_charge', 'sortie', 'admettre']:
            return [IsMedecinOuInfirmier()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        emp = get_employe(self.request.user)
        extra = {}
        if emp and emp.service and not serializer.validated_data.get('service'):
            extra['service'] = emp.service
        if emp and emp.role == 'infirmier' and not serializer.validated_data.get('infirmier_accueil'):
            extra['infirmier_accueil'] = emp
        serializer.save(**extra)

    @action(detail=True, methods=['post'], url_path='prise_en_charge')
    def prise_en_charge(self, request, pk=None):
        """Passe le patient en consultation, assigne le médecin examinateur."""
        passage = self.get_object()
        emp = get_employe(request.user)
        medecin_id = request.data.get('medecin_examinateur')
        if medecin_id:
            passage.medecin_examinateur_id = medecin_id
        elif emp and emp.role == 'medecin':
            passage.medecin_examinateur = emp
        passage.statut = StatutUrgence.EN_CONSULTATION
        passage.save()
        return Response(PassageUrgenceSerializer(passage).data)

    @action(detail=True, methods=['post'], url_path='sortie')
    def sortie(self, request, pk=None):
        """Enregistre la sortie d'un patient des urgences (sans hospitalisation)."""
        passage = self.get_object()
        passage.decision = request.data.get('decision', DecisionSortie.DOMICILE)
        passage.diagnostic = request.data.get('diagnostic', passage.diagnostic)
        passage.notes = request.data.get('notes', passage.notes)
        passage.date_sortie = request.data.get('date_sortie') or timezone.now()
        passage.statut = StatutUrgence.SORTI
        passage.save()
        return Response(PassageUrgenceSerializer(passage).data)

    @action(detail=True, methods=['post'], url_path='admettre')
    def admettre(self, request, pk=None):
        """Transforme le passage en hospitalisation et clôture le passage aux urgences."""
        from hospitalisations.models import Hospitalisation, StatutHospitalisation
        from services.models import Service

        passage = self.get_object()
        service_id = request.data.get('service')
        service = Service.objects.filter(id=service_id).first() if service_id else passage.service

        hospitalisation = Hospitalisation.objects.create(
            patient=passage.patient,
            service=service,
            medecin_responsable=passage.medecin_examinateur,
            chambre=request.data.get('chambre', ''),
            lit=request.data.get('lit', ''),
            motif_admission=request.data.get('motif_admission', passage.motif),
            diagnostic_entree=request.data.get('diagnostic_entree', passage.diagnostic),
            notes=request.data.get('notes', ''),
            date_admission=timezone.now(),
            statut=StatutHospitalisation.EN_COURS,
        )
        passage.hospitalisation = hospitalisation
        passage.decision = DecisionSortie.HOSPITALISATION
        passage.statut = StatutUrgence.SORTI
        passage.date_sortie = timezone.now()
        passage.save()
        return Response(PassageUrgenceSerializer(passage).data, status=201)
