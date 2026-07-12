from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Count, Q
from django.utils import timezone

from .models import Service
from .serializers import ServiceSerializer
from comptes.permissions import IsAdminRole, IsSuperUser


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
        from consultations.models import Consultation
        from comptes.models import Employe, Role

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

        medecins_qs = employes_qs.filter(role=Role.MEDECIN)
        medecins_perf = []
        for medecin in medecins_qs:
            patients_medecin = patients_qs.filter(medecin_referent=medecin)
            consult_qs = Consultation.objects.filter(patient__in=patients_medecin)
            medecins_perf.append({
                'id': medecin.id,
                'nom': f"{medecin.prenom} {medecin.nom}",
                'specialite': medecin.specialite,
                'nb_patients': patients_medecin.count(),
                'nb_consultations': consult_qs.filter(type_evenement='consultation').count(),
                'nb_operations': consult_qs.filter(type_evenement='operation').count(),
            })
        medecins_perf.sort(key=lambda m: m['nb_patients'], reverse=True)

        return Response({
            'service': ServiceSerializer(service).data,
            'patients': patients_stats,
            'employes': employes_stats,
            'medecins': medecins_perf,
        })