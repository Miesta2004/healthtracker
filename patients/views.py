from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Q
from .models import Patient
from .serializers import PatientSerializer, PatientListSerializer
from comptes.permissions import get_employe, PeutCreerPatient
from comptes.capacites import Capacite


class PatientViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'list':
            return PatientListSerializer
        return PatientSerializer

    def get_queryset(self):
        user = self.request.user
        base_qs = Patient.objects.select_related('service', 'medecin_referent')

        if user.is_superuser:
            return base_qs.all()

        emp = get_employe(user)
        if emp is None:
            return Patient.objects.none()

        role = emp.role
        q = self.request.query_params.get('q', '').strip()

        # ── Infirmier : accès uniquement via recherche ciblée dans son service ──
        if role == 'infirmier':
            if self.action in ('retrieve', 'update', 'partial_update', 'ajouter_antecedent'):
                return base_qs.filter(service=emp.service) if emp.service else base_qs.none()
            if not q:
                return Patient.objects.none()
            qs = base_qs.filter(service=emp.service) if emp.service else base_qs
            return qs.filter(
                Q(nom__icontains=q) | Q(prenom__icontains=q) | Q(numero_dossier__icontains=q)
            )

        # ── Laborantin : patients avec demandes en cours ──
        if role == 'laborantin':
            from analyses.models import DemandeAnalyse
            patient_ids = DemandeAnalyse.objects.filter(
                statut__in=['en_attente', 'en_cours'],
            ).values_list('patient_id', flat=True).distinct()
            return base_qs.filter(id__in=patient_ids)

        # ── Secrétaire, médecin, admin ──
        qs = base_qs.filter(service=emp.service) if emp.service else base_qs.all()

        # Chef de Chirurgie (capacité BLOC_GERER, transversale) : en plus des
        # patients de son propre service, il doit voir tout patient ayant une
        # Operation quelque part dans l'hôpital — y compris hors de son
        # service, et sans filtrer par statut : une opération TERMINEE ou
        # COMPLICATION reste pertinente (ex. dossier lié à une autopsie
        # péri-opératoire), pas seulement les opérations encore PLANIFIEE.
        if emp.a_la_capacite(Capacite.BLOC_GERER):
            from chirurgie.models import Operation
            patients_operes_ids = Operation.objects.values_list('patient_id', flat=True).distinct()
            qs = (qs | base_qs.filter(id__in=patients_operes_ids)).distinct()

        # Filtrage par recherche si paramètre q présent
        if q:
            qs = qs.filter(
                Q(nom__icontains=q) |
                Q(prenom__icontains=q) |
                Q(numero_dossier__icontains=q) |
                Q(telephone__icontains=q)
            )

        return qs

    def get_permissions(self):
        # L'infirmier et le laborantin ne peuvent pas créer/supprimer
        if self.action == 'create':
            return [PeutCreerPatient()]
        if self.action in ['destroy']:
            from comptes.permissions import IsAdminRole
            return [IsAdminRole()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        """
        Rattache automatiquement le patient au service (et, si créateur médecin,
        au médecin référent) de l'employé connecté quand ces champs ne sont pas
        fournis explicitement. Sans ça, un patient créé sans service n'apparaît
        dans la liste d'aucun employé (la liste est filtrée par service).
        """
        emp = get_employe(self.request.user)
        extra = {}
        if emp is not None:
            if not serializer.validated_data.get('service'):
                extra['service'] = emp.service
            if emp.a_la_capacite(Capacite.ACTES_MEDICAUX_GERER) and not serializer.validated_data.get('medecin_referent'):
                extra['medecin_referent'] = emp
        serializer.save(**extra)

    @action(detail=True, methods=['post'], url_path='ajouter_antecedent')
    def ajouter_antecedent(self, request, pk=None):
        """Ajoute un antécédent au dossier du patient sans doublon."""
        patient = self.get_object()
        nouvel_antecedent = (request.data.get('antecedent') or '').strip()

        if not nouvel_antecedent:
            return Response({'detail': "Le champ 'antecedent' est requis."}, status=400)

        existants = [
            a.strip() for a in (patient.antecedents or '').split(',') if a.strip()
        ]
        if nouvel_antecedent not in existants:
            existants.append(nouvel_antecedent)
            patient.antecedents = ', '.join(existants)
            patient.save()

        return Response(PatientSerializer(patient).data)