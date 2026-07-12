from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from comptes.permissions import IsAdminRole, get_employe
from .models import CreneauDisponibilite, ExceptionDisponibilite, StatutException
from .serializers import CreneauSerializer, ExceptionSerializer


class CreneauViewSet(viewsets.ModelViewSet):
    serializer_class   = CreneauSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        emp = get_employe(self.request.user)
        if emp is None:
            return CreneauDisponibilite.objects.none()

        # Admin peut voir tous les créneaux, ou filtrer par employe_id
        if emp.role == 'admin' or self.request.user.is_superuser:
            employe_id = self.request.query_params.get('employe')
            if employe_id:
                return CreneauDisponibilite.objects.filter(employe_id=employe_id)
            return CreneauDisponibilite.objects.select_related('employe').all()

        # Sinon : ses propres créneaux uniquement
        return CreneauDisponibilite.objects.filter(employe=emp)

    def perform_create(self, serializer):
        emp = get_employe(self.request.user)
        serializer.save(employe=emp)

    def get_permissions(self):
        # Seul l'admin peut modifier les créneaux des autres
        if self.action in ['destroy']:
            return [IsAuthenticated()]  # chacun peut supprimer les siens
        return [IsAuthenticated()]

    @action(detail=False, methods=['get'], url_path='semaine')
    def semaine(self, request):
        """Retourne les créneaux de la semaine courante pour l'employé connecté."""
        emp = get_employe(request.user)
        if emp is None:
            return Response([])
        creneaux = CreneauDisponibilite.objects.filter(employe=emp, actif=True)
        return Response(CreneauSerializer(creneaux, many=True).data)


class ExceptionViewSet(viewsets.ModelViewSet):
    serializer_class   = ExceptionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        emp = get_employe(self.request.user)
        if emp is None:
            return ExceptionDisponibilite.objects.none()

        if emp.role == 'admin' or self.request.user.is_superuser:
            qs = ExceptionDisponibilite.objects.select_related('employe').all()
            employe_id = self.request.query_params.get('employe')
            if employe_id:
                qs = qs.filter(employe_id=employe_id)
            statut = self.request.query_params.get('statut')
            if statut:
                qs = qs.filter(statut=statut)
            return qs

        return ExceptionDisponibilite.objects.filter(employe=emp)

    def perform_create(self, serializer):
        emp = get_employe(self.request.user)
        serializer.save(employe=emp)

    @action(detail=True, methods=['post'], permission_classes=[IsAdminRole])
    def valider(self, request, pk=None):
        """Admin valide une demande de congé/absence."""
        exception = self.get_object()
        exception.valide = True
        exception.statut = StatutException.VALIDE
        exception.save()
        return Response(ExceptionSerializer(exception).data)

    @action(detail=True, methods=['post'], permission_classes=[IsAdminRole])
    def rejeter(self, request, pk=None):
        """Admin rejette une demande."""
        exception = self.get_object()
        exception.valide = False
        exception.statut = StatutException.REJETE
        exception.save()
        return Response(ExceptionSerializer(exception).data)