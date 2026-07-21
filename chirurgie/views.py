from django.db.models import Q
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from comptes.permissions import get_employe, IsAdminRole
from .models import SalleBloc, Operation, StatutOperation
from .serializers import SalleBlocSerializer, OperationSerializer
from .permissions import PeutGererOperation


class SalleBlocViewSet(viewsets.ModelViewSet):
    serializer_class = SalleBlocSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = SalleBloc.objects.select_related('service').filter(actif=True)
        service_id = self.request.query_params.get('service')
        if service_id:
            qs = qs.filter(service_id=service_id)
        return qs

    def get_permissions(self):
        if self.request.method != 'GET':
            return [IsAdminRole()]
        return [IsAuthenticated()]

    @action(detail=False, methods=['get'])
    def disponibles(self, request):
        """
        Salles libres pour un service/date_heure/durée donnés — utilisées par
        l'écran de planification (étape 4 du flux : choix de la salle).
        """
        service_id = request.query_params.get('service')
        date_heure = request.query_params.get('date_heure')
        duree = int(request.query_params.get('duree_min', 60))

        if not service_id or not date_heure:
            return Response({'detail': "Paramètres 'service' et 'date_heure' requis."}, status=400)

        debut = timezone.datetime.fromisoformat(date_heure)
        if timezone.is_naive(debut):
            debut = timezone.make_aware(debut)
        fin = debut + timezone.timedelta(minutes=duree)

        salles = SalleBloc.objects.filter(service_id=service_id, actif=True)
        occupees_ids = []
        for salle in salles:
            conflits = Operation.objects.filter(
                salle=salle, statut__in=StatutOperation.actifs()
            )
            for op in conflits:
                op_fin = op.date_heure_prevue + timezone.timedelta(minutes=op.duree_estimee_min)
                if debut < op_fin and fin > op.date_heure_prevue:
                    occupees_ids.append(salle.id)
                    break

        salles_libres = salles.exclude(id__in=occupees_ids)
        return Response(SalleBlocSerializer(salles_libres, many=True).data)


class OperationViewSet(viewsets.ModelViewSet):
    serializer_class = OperationSerializer

    def get_queryset(self):
        qs = Operation.objects.select_related(
            'patient', 'service_chirurgie', 'salle', 'chirurgien_principal'
        )
        user = self.request.user
        if user.is_superuser:
            return qs

        emp = get_employe(user)
        if emp is None or emp.service_id is None:
            return Operation.objects.none()

        patient_id = self.request.query_params.get('patient')
        if patient_id:
            qs = qs.filter(patient_id=patient_id)

        # Visible si l'opération a lieu dans mon service, OU si je suis
        # rattaché au service d'origine du patient (le médecin prescripteur
        # doit pouvoir suivre l'opération qu'il a indiquée).
        return qs.filter(
            Q(service_chirurgie_id=emp.service_id) |
            Q(patient__service_id=emp.service_id)
        ).distinct()

    def get_permissions(self):
        if self.request.method in ('GET', 'HEAD', 'OPTIONS'):
            return [IsAuthenticated()]
        return [PeutGererOperation()]

    def perform_create(self, serializer):
        # Le médecin qui pose l'indication devient chirurgien_principal par
        # défaut s'il n'est pas explicitement fourni ET qu'il est lui-même
        # habilité (cas fréquent : le chirurgien crée directement sa propre
        # opération). Sinon, la valeur envoyée par le frontend fait foi.
        serializer.save()

    @action(detail=False, methods=['get'], url_path='stats')
    def stats(self, request):
        """
        Agrégats réels sur les opérations visibles par l'utilisateur connecté
        (réutilise get_queryset, donc déjà scopé par service). Alimente les
        onglets « Vue d'ensemble » et « Performance par chirurgien » côté
        Analytics — plus aucune donnée mockée pour ces deux onglets.
        """
        from datetime import timedelta
        from django.db.models import Count, Avg, F, DurationField, ExpressionWrapper
        from django.db.models.functions import TruncWeek
        from django.utils import timezone

        qs = self.get_queryset()
        terminees_ou_complication = qs.filter(statut__in=[StatutOperation.TERMINEE, StatutOperation.COMPLICATION])

        # Durée réelle moyenne — seulement sur les opérations dont les deux
        # horodatages réels sont renseignés.
        avec_duree = terminees_ou_complication.filter(
            date_debut_reelle__isnull=False, date_fin_reelle__isnull=False
        ).annotate(
            duree=ExpressionWrapper(F('date_fin_reelle') - F('date_debut_reelle'), output_field=DurationField())
        )
        duree_moyenne = avec_duree.aggregate(m=Avg('duree'))['m']
        duree_moyenne_min = round(duree_moyenne.total_seconds() / 60) if duree_moyenne else None

        nb_terminees = terminees_ou_complication.filter(statut=StatutOperation.TERMINEE).count()
        nb_complications = terminees_ou_complication.filter(statut=StatutOperation.COMPLICATION).count()
        total_issues = nb_terminees + nb_complications
        taux_succes = round(nb_terminees / total_issues * 100, 1) if total_issues else None

        repartition_par_type = list(
            terminees_ou_complication.values('type_intervention')
            .annotate(nb=Count('id')).order_by('-nb')[:6]
        )

        depuis = timezone.now() - timedelta(weeks=8)
        evolution_hebdo = list(
            qs.filter(date_heure_prevue__gte=depuis)
            .annotate(semaine=TruncWeek('date_heure_prevue'))
            .values('semaine').annotate(nb=Count('id')).order_by('semaine')
        )

        dernieres = qs.filter(statut__in=[StatutOperation.TERMINEE, StatutOperation.COMPLICATION]).order_by('-date_fin_reelle')[:5]
        dernieres_interventions = [
            {
                'date': op.date_fin_reelle.strftime('%d/%m/%Y') if op.date_fin_reelle else None,
                'patient': f"{op.patient.prenom} {op.patient.nom}",
                'type': op.type_intervention,
                'chirurgien': f"{op.chirurgien_principal.prenom} {op.chirurgien_principal.nom}",
                'duree': (
                    f"{round((op.date_fin_reelle - op.date_debut_reelle).total_seconds() / 60)} min"
                    if op.date_debut_reelle and op.date_fin_reelle else None
                ),
                'issue': 'succes' if op.statut == StatutOperation.TERMINEE else 'complication',
            }
            for op in dernieres
        ]

        par_chirurgien = []
        chirurgien_ids = terminees_ou_complication.values_list('chirurgien_principal_id', flat=True).distinct()
        for chirurgien_id in chirurgien_ids:
            ops_chirurgien = terminees_ou_complication.filter(chirurgien_principal_id=chirurgien_id)
            premiere = ops_chirurgien.first()
            if not premiere:
                continue
            chirurgien = premiere.chirurgien_principal
            avec_duree_c = ops_chirurgien.filter(
                date_debut_reelle__isnull=False, date_fin_reelle__isnull=False
            ).annotate(duree=ExpressionWrapper(F('date_fin_reelle') - F('date_debut_reelle'), output_field=DurationField()))
            duree_c = avec_duree_c.aggregate(m=Avg('duree'))['m']
            nb_term_c = ops_chirurgien.filter(statut=StatutOperation.TERMINEE).count()
            nb_comp_c = ops_chirurgien.filter(statut=StatutOperation.COMPLICATION).count()
            total_c = nb_term_c + nb_comp_c
            par_chirurgien.append({
                'id': chirurgien.id,
                'nom': f"{chirurgien.prenom} {chirurgien.nom}",
                'specialite': chirurgien.specialite or '',
                'nb_interventions': total_c,
                'duree_moyenne_min': round(duree_c.total_seconds() / 60) if duree_c else None,
                'taux_succes': round(nb_term_c / total_c * 100, 1) if total_c else None,
                'patients_operes': ops_chirurgien.values('patient_id').distinct().count(),
            })
        par_chirurgien.sort(key=lambda c: c['nb_interventions'], reverse=True)

        return Response({
            'nb_interventions': total_issues,
            'duree_moyenne_min': duree_moyenne_min,
            'taux_succes': taux_succes,
            'repartition_par_type': repartition_par_type,
            'evolution_hebdo': evolution_hebdo,
            'dernieres_interventions': dernieres_interventions,
            'par_chirurgien': par_chirurgien,
        })

    @action(detail=True, methods=['post'])
    def confirmer(self, request, pk=None):
        """Valide salle + équipe : planifiee → confirmee."""
        operation = self.get_object()
        self.check_object_permissions(request, operation)
        if operation.statut != StatutOperation.PLANIFIEE:
            return Response({'detail': "Seule une opération planifiée peut être confirmée."}, status=400)
        operation.statut = StatutOperation.CONFIRMEE
        operation.save(update_fields=['statut', 'date_modification'])
        return Response(OperationSerializer(operation).data)

    @action(detail=True, methods=['post'])
    def demarrer(self, request, pk=None):
        """confirmee → en_cours, horodate le début réel."""
        operation = self.get_object()
        self.check_object_permissions(request, operation)
        if operation.statut != StatutOperation.CONFIRMEE:
            return Response({'detail': "L'opération doit être confirmée avant de démarrer."}, status=400)
        operation.statut = StatutOperation.EN_COURS
        operation.date_debut_reelle = timezone.now()
        operation.save(update_fields=['statut', 'date_debut_reelle', 'date_modification'])
        return Response(OperationSerializer(operation).data)

    @action(detail=True, methods=['post'])
    def cloturer(self, request, pk=None):
        """
        en_cours → terminee | complication, horodate la fin réelle.
        Body attendu : { "avec_complication": bool, "compte_rendu_operatoire": str,
                          "complications": str (si avec_complication=True) }
        """
        operation = self.get_object()
        self.check_object_permissions(request, operation)
        if operation.statut != StatutOperation.EN_COURS:
            return Response({'detail': "L'opération doit être en cours pour être clôturée."}, status=400)

        avec_complication = bool(request.data.get('avec_complication'))
        operation.statut = StatutOperation.COMPLICATION if avec_complication else StatutOperation.TERMINEE
        operation.date_fin_reelle = timezone.now()
        operation.compte_rendu_operatoire = request.data.get('compte_rendu_operatoire', operation.compte_rendu_operatoire)
        if avec_complication:
            operation.complications = request.data.get('complications', '')
        operation.save(update_fields=[
            'statut', 'date_fin_reelle', 'compte_rendu_operatoire', 'complications', 'date_modification'
        ])
        return Response(OperationSerializer(operation).data)