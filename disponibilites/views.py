from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from comptes.permissions import IsAdminOuMajor, is_major, get_employe
from .models import CreneauDisponibilite, ExceptionDisponibilite, StatutException, AssignationPatient
from .serializers import CreneauSerializer, ExceptionSerializer, AssignationPatientSerializer
from .shifts import shift_et_date_actuels


class CreneauViewSet(viewsets.ModelViewSet):
    serializer_class   = CreneauSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        emp = get_employe(self.request.user)
        if emp is None:
            return CreneauDisponibilite.objects.none()

        # Superuser (admin général) : voit tout, filtrable par employe_id
        if self.request.user.is_superuser:
            employe_id = self.request.query_params.get('employe')
            qs = CreneauDisponibilite.objects.select_related('employe').all()
            return qs.filter(employe_id=employe_id) if employe_id else qs

        # Chef de service (admin) : uniquement les créneaux de SON service
        if emp.role == 'admin':
            qs = CreneauDisponibilite.objects.select_related('employe').filter(
                employe__service_id=emp.service_id
            )
            employe_id = self.request.query_params.get('employe')
            return qs.filter(employe_id=employe_id) if employe_id else qs

        # Infirmière major : les créneaux des infirmiers de SON service uniquement
        if is_major(emp):
            qs = CreneauDisponibilite.objects.select_related('employe').filter(
                employe__service_id=emp.service_id, employe__role='infirmier',
            )
            employe_id = self.request.query_params.get('employe')
            return qs.filter(employe_id=employe_id) if employe_id else qs

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

        if self.request.user.is_superuser:
            qs = ExceptionDisponibilite.objects.select_related('employe').all()
        elif emp.role == 'admin':
            # Chef de service : uniquement les demandes de SON service
            qs = ExceptionDisponibilite.objects.select_related('employe').filter(
                employe__service_id=emp.service_id
            )
        elif is_major(emp):
            # Infirmière major : les demandes des infirmiers de SON service
            qs = ExceptionDisponibilite.objects.select_related('employe').filter(
                employe__service_id=emp.service_id, employe__role='infirmier',
            )
        else:
            return ExceptionDisponibilite.objects.filter(employe=emp)

        employe_id = self.request.query_params.get('employe')
        if employe_id:
            qs = qs.filter(employe_id=employe_id)
        statut = self.request.query_params.get('statut')
        if statut:
            qs = qs.filter(statut=statut)
        return qs

    def perform_create(self, serializer):
        emp = get_employe(self.request.user)
        serializer.save(employe=emp)

    @action(detail=True, methods=['post'], permission_classes=[IsAdminOuMajor])
    def valider(self, request, pk=None):
        """Admin valide une demande de congé/absence."""
        exception = self.get_object()
        exception.valide = True
        exception.statut = StatutException.VALIDE
        exception.save()
        return Response(ExceptionSerializer(exception).data)

    @action(detail=True, methods=['post'], permission_classes=[IsAdminOuMajor])
    def rejeter(self, request, pk=None):
        """Admin rejette une demande."""
        exception = self.get_object()
        exception.valide = False
        exception.statut = StatutException.REJETE
        exception.save()
        return Response(ExceptionSerializer(exception).data)


class AssignationPatientViewSet(viewsets.ModelViewSet):
    serializer_class = AssignationPatientSerializer

    def get_permissions(self):
        # Créer/modifier/supprimer une assignation = décision du chef de
        # service OU de l'infirmière major.
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminOuMajor()]
        return [IsAuthenticated()]

    def get_queryset(self):
        emp = get_employe(self.request.user)
        if emp is None:
            return AssignationPatient.objects.none()

        base = AssignationPatient.objects.select_related('infirmier', 'patient', 'service')

        if self.request.user.is_superuser:
            qs = base.all()
        elif emp.role == 'admin' or is_major(emp):
            # Chef de service ou infirmière major : tout SON service
            qs = base.filter(service_id=emp.service_id)
        elif emp.role == 'infirmier':
            # Une infirmière ne voit que ses propres assignations
            qs = base.filter(infirmier=emp)
        else:
            return AssignationPatient.objects.none()

        infirmier_id = self.request.query_params.get('infirmier')
        if infirmier_id:
            qs = qs.filter(infirmier_id=infirmier_id)
        patient_id = self.request.query_params.get('patient')
        if patient_id:
            qs = qs.filter(patient_id=patient_id)
        date_param = self.request.query_params.get('date')
        if date_param:
            qs = qs.filter(date=date_param)
        return qs

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        infirmier = serializer.validated_data['infirmier']
        patient = serializer.validated_data['patient']

        if not request.user.is_superuser:
            responsable = get_employe(request.user)
            is_responsable = responsable is not None and (responsable.role == 'admin' or is_major(responsable))
            if not is_responsable or infirmier.service_id != responsable.service_id:
                return Response(
                    {"detail": "Tu ne peux assigner qu'un(e) infirmier(ère) de ton propre service."},
                    status=status.HTTP_403_FORBIDDEN,
                )
            if patient.service_id != responsable.service_id:
                return Response(
                    {"detail": "Ce patient n'appartient pas à ton service."},
                    status=status.HTTP_403_FORBIDDEN,
                )

        serializer.save(service_id=infirmier.service_id)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'], url_path='mes-patients')
    def mes_patients(self, request):
        """
        Pour l'infirmière connectée : ses patients assignés pour le poste
        (shift) en cours, calculé depuis l'heure serveur.
        """
        emp = get_employe(request.user)
        if emp is None or emp.role != 'infirmier':
            return Response(
                {"detail": "Réservé aux infirmiers(ères)."},
                status=status.HTTP_403_FORBIDDEN,
            )

        date_courante, shift_courant = shift_et_date_actuels()
        assignations = AssignationPatient.objects.select_related('patient', 'service').filter(
            infirmier=emp, date=date_courante, shift=shift_courant,
        )
        return Response({
            'date': date_courante,
            'shift': shift_courant,
            'shift_label': dict(AssignationPatient._meta.get_field('shift').choices)[shift_courant],
            'assignations': AssignationPatientSerializer(assignations, many=True).data,
        })