from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Patient
from .serializers import PatientSerializer
from comptes.permissions import IsInSameService, get_employe


class PatientViewSet(viewsets.ModelViewSet):
    serializer_class   = PatientSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user

        if user.is_superuser:
            return Patient.objects.all()

        emp = get_employe(user)
        if emp is None:
            return Patient.objects.none()

        role = emp.role

        # Infirmier : pas de liste globale — accès uniquement via recherche ciblée
        if role == 'infirmier':
            q = self.request.query_params.get('q', '').strip()
            if not q:
                return Patient.objects.none()
            return Patient.objects.filter(
                service=emp.service
            ).filter(
                numero_dossier__icontains=q
            ) | Patient.objects.filter(
                service=emp.service,
                nom__icontains=q
            ) | Patient.objects.filter(
                service=emp.service,
                prenom__icontains=q
            )

        # Laborantin : uniquement les patients avec des demandes d'analyse en cours
        if role == 'laborantin':
            from analyses.models import DemandeAnalyse
            patient_ids = DemandeAnalyse.objects.filter(
                patient__service=emp.service,
                statut__in=['en_attente', 'en_cours'],
            ).values_list('patient_id', flat=True).distinct()
            return Patient.objects.filter(id__in=patient_ids)

        # Secrétaire, médecin, admin : tous les patients du service
        if emp.service:
            return Patient.objects.filter(service=emp.service)

        return Patient.objects.none()

    def get_permissions(self):
        # L'infirmier et le laborantin ne peuvent pas créer/supprimer
        if self.action in ['destroy']:
            from comptes.permissions import IsAdminRole
            return [IsAdminRole()]
        return [IsAuthenticated()]

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