from datetime import timedelta

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Count, Q
from django.utils import timezone

from .models import Service
from .serializers import ServiceSerializer
from comptes.permissions import IsAdminRole, IsSuperUser
from comptes.analytics import stats_medecin
from .analytics import occupation_service


class ServiceViewSet(viewsets.ModelViewSet):
    serializer_class   = ServiceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # annotate() calcule nb_patients et nb_employes en 1 seule requête SQL
        qs = Service.objects.select_related('chef_de_service').annotate(
            nb_patients=Count('patients', filter=Q(patients__actif=True), distinct=True),
            nb_employes=Count('employes', filter=Q(employes__actif=True), distinct=True),
        )
        user = self.request.user
        if user.is_superuser:
            return qs
        try:
            return qs.filter(id=user.employe.service_id)
        except Exception:
            return Service.objects.none()

    def get_permissions(self):
        if self.action == 'create':
            # Créer un nouveau service est réservé à l'admin général
            # (superuser) — un chef de service ne gère que le sien.
            return [IsSuperUser()]
        if self.action in ['destroy', 'update', 'partial_update']:
            return [IsAdminRole()]
        return [IsAuthenticated()]

    @action(detail=True, methods=['get'], url_path='patients')
    def patients(self, request, pk=None):
        service = self.get_object()
        from patients.serializers import PatientListSerializer
        qs = service.patients.filter(actif=True).order_by('nom', 'prenom')
        return Response(PatientListSerializer(qs, many=True).data)

    @action(detail=True, methods=['get'], url_path='employes')
    def employes(self, request, pk=None):
        service = self.get_object()
        from comptes.serializers import EmployeSerializer
        qs = service.employes.select_related('user').filter(actif=True).order_by('role', 'nom')
        return Response(EmployeSerializer(qs, many=True).data)

    @action(detail=True, methods=['get'], url_path='stats')
    def stats(self, request, pk=None):
        """
        Tableau de bord du service : volumétrie patients (jour/mois/année),
        répartition des employés par rôle, et performance de chaque médecin
        du service (patients dont il est référent, consultations et opérations
        de ces patients — la Consultation n'étant pas rattachée à un médecin
        précis dans le modèle actuel, ces chiffres reflètent l'activité des
        patients suivis par le médecin, pas uniquement les actes qu'il a
        personnellement réalisés).
        """
        from comptes.models import Employe, Role
        from comptes.capacites import roles_avec_capacite, Capacite

        service = self.get_object()
        now = timezone.now()

        patients_qs = service.patients.all()
        patients_actifs_qs = patients_qs.filter(actif=True)

        patients_stats = {
            'total': patients_qs.count(),
            'actifs': patients_actifs_qs.count(),
            'nouveaux_jour': patients_qs.filter(date_creation__date=now.date()).count(),
            'nouveaux_mois': patients_qs.filter(
                date_creation__year=now.year, date_creation__month=now.month
            ).count(),
            'nouveaux_annee': patients_qs.filter(date_creation__year=now.year).count(),
        }

        employes_qs = service.employes.filter(actif=True)
        employes_stats = {
            'total': employes_qs.count(),
            'par_role': {
                role.value: employes_qs.filter(role=role.value).count()
                for role in Role
            },
        }

        medecins_qs = employes_qs.filter(role__in=roles_avec_capacite(Capacite.ACTES_MEDICAUX_GERER))
        medecins_perf = [stats_medecin(m) for m in medecins_qs]
        medecins_perf.sort(key=lambda m: m['nb_patients'], reverse=True)

        return Response({
            'service': ServiceSerializer(service).data,
            'patients': patients_stats,
            'employes': employes_stats,
            'medecins': medecins_perf,
            'occupation': occupation_service(service),
        })

    @action(detail=False, methods=['get'], url_path='vue-ensemble')
    def vue_ensemble(self, request):
        """
        Agrège patients/employés sur tous les services visibles par
        l'utilisateur connecté (déjà scopé par get_queryset : un seul
        service pour un chef, tous pour le superuser).
        """
        from patients.models import Patient
        from comptes.models import Employe, Role

        services = self.get_queryset()
        now = timezone.now()
        patients_qs = Patient.objects.filter(service__in=services)
        employes_qs = Employe.objects.filter(service__in=services, actif=True)

        return Response({
            'nb_services': services.count(),
            'patients': {
                'total': patients_qs.count(),
                'actifs': patients_qs.filter(actif=True).count(),
                'nouveaux_mois': patients_qs.filter(
                    date_creation__year=now.year, date_creation__month=now.month
                ).count(),
            },
            'employes': {
                'total': employes_qs.count(),
                'par_role': {
                    role.value: employes_qs.filter(role=role.value).count()
                    for role in Role
                },
            },
            'par_service': [
                {
                    'id': s.id, 'nom': s.nom,
                    'nb_patients': s.nb_patients, 'nb_employes': s.nb_employes,
                    **occupation_service(s),
                }
                for s in services
            ],
        })

    @action(detail=True, methods=['get'], url_path='activite')
    def activite(self, request, pk=None):
        """
        Volume quotidien de nouveaux patients sur une fenêtre glissante
        (30 jours par défaut, 90 max) — alimente un graphique de tendance.
        """
        from django.db.models.functions import TruncDate

        service = self.get_object()
        try:
            jours = min(int(request.query_params.get('jours', 30)), 90)
        except ValueError:
            jours = 30
        depuis = timezone.now().date() - timedelta(days=jours)

        par_jour = (
            service.patients.filter(date_creation__date__gte=depuis)
            .annotate(jour=TruncDate('date_creation'))
            .values('jour')
            .annotate(nb=Count('id'))
            .order_by('jour')
        )
        return Response(list(par_jour))