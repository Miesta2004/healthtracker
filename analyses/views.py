from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import DemandeAnalyse
from .serializers import DemandeAnalyseSerializer, DemandeAnalyseLaboSerializer
from comptes.permissions import get_employe, IsMedecinOuAdmin
from alertes.models import Alerte


class DemandeAnalyseViewSet(viewsets.ModelViewSet):
    """
    - Médecin / admin : CRUD complet, voit les demandes de son service.
    - Laborantin : lecture + saisie des résultats, serializer restreint.
    - Secrétaire / infirmier : accès refusé.
    """
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        role = get_employe(self.request.user)
        if role and role.role == 'laborantin':
            return DemandeAnalyseLaboSerializer
        return DemandeAnalyseSerializer

    def get_queryset(self):
        user = self.request.user

        if user.is_superuser:
            qs = DemandeAnalyse.objects.select_related(
                'patient', 'demandeur', 'laborantin', 'consultation'
            ).all()
        else:
            emp = get_employe(user)
            if emp is None or emp.role in ('secretaire', 'infirmier'):
                return DemandeAnalyse.objects.none()

            qs = DemandeAnalyse.objects.select_related(
                'patient', 'demandeur', 'laborantin'
            ).filter(patient__service=emp.service)

            if emp.role == 'laborantin':
                qs = qs.filter(statut__in=['en_attente', 'en_cours', 'terminee'])

        # Filtre optionnel par patient (utilisé par le dossier patient)
        patient_id = self.request.query_params.get('patient')
        if patient_id:
            qs = qs.filter(patient_id=patient_id)

        return qs

    def perform_create(self, serializer):
        emp = get_employe(self.request.user)
        serializer.save(demandeur=emp)

    def get_permissions(self):
        if self.action in ['create', 'destroy']:
            return [IsMedecinOuAdmin()]
        return [IsAuthenticated()]

    @action(detail=False, methods=['get'], url_path='en-attente')
    def en_attente(self, request):
        """Raccourci pour le dashboard laborantin."""
        qs = self.get_queryset().filter(statut='en_attente')
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='prendre-en-charge')
    def prendre_en_charge(self, request, pk=None):
        """Le laborantin s'assigne la demande (premier arrivé)."""
        demande = self.get_object()
        emp = get_employe(request.user)
        if emp is None or emp.role != 'laborantin':
            return Response({'detail': 'Seul un laborantin peut prendre en charge une demande.'},
                            status=status.HTTP_403_FORBIDDEN)
        if demande.statut != 'en_attente':
            return Response({'detail': "Cette demande n'est plus en attente."},
                            status=status.HTTP_400_BAD_REQUEST)
        demande.laborantin = emp
        demande.statut = 'en_cours'
        demande.save()
        serializer = self.get_serializer(demande)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='annuler')
    def annuler(self, request, pk=None):
        """Le médecin demandeur, un admin, ou un laborantin peut annuler."""
        demande = self.get_object()
        emp = get_employe(request.user)
        if emp is None or emp.role not in ('medecin', 'admin', 'laborantin'):
            return Response({'detail': 'Accès refusé.'}, status=status.HTTP_403_FORBIDDEN)
        if demande.statut == 'terminee':
            return Response({'detail': 'Une demande déjà terminée ne peut plus être annulée.'},
                            status=status.HTTP_400_BAD_REQUEST)
        demande.statut = 'annulee'
        demande.save()
        serializer = self.get_serializer(demande)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='soumettre-resultats')
    def soumettre_resultats(self, request, pk=None):
        """Le laborantin soumet ses résultats."""
        demande  = self.get_object()
        emp      = get_employe(request.user)
        if emp is None or emp.role not in ('laborantin', 'medecin', 'admin'):
            return Response({'detail': 'Accès refusé.'}, status=status.HTTP_403_FORBIDDEN)
        serializer = self.get_serializer(demande, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        if serializer.instance.statut == 'terminee':
            Alerte.objects.create(
                patient=demande.patient,
                type='resultat_analyse',
                message=f"Résultat d'analyse disponible : {demande.get_type_analyse_display()}",
            )

        return Response(serializer.data)