from datetime import timedelta, date as date_cls
from django.db.models import Q
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from comptes.permissions import get_employe, IsAdminRole
from .models import SalleBloc, InterventionChirurgicale, StatutIntervention, StatutSalle
from .serializers import SalleBlocSerializer, InterventionChirurgicaleSerializer
from .permissions import PeutGererOperation


class SalleBlocViewSet(viewsets.ModelViewSet):
    serializer_class = SalleBlocSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Toutes les salles sont listées quel que soit leur statut (y compris
        # en désinfection/maintenance) : c'est une info à afficher, pas un
        # filtre — masquer une salle indisponible empêcherait de voir
        # qu'elle existe et pourquoi elle est fermée.
        qs = SalleBloc.objects.select_related('service')
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
        Salles réellement disponibles pour un service/date_heure/durée
        donnés (étape 4 du flux de planification) : ni en conflit d'horaire,
        ni indisponibles pour une raison physique (désinfection/maintenance).
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

        salles = SalleBloc.objects.filter(service_id=service_id, statut=StatutSalle.DISPONIBLE)
        occupees_ids = []
        for salle in salles:
            conflits = InterventionChirurgicale.objects.filter(
                salle=salle, statut__in=StatutIntervention.actifs()
            )
            for intervention in conflits:
                if debut < intervention.heure_fin and fin > intervention.heure_debut:
                    occupees_ids.append(salle.id)
                    break

        salles_libres = salles.exclude(id__in=occupees_ids)
        return Response(SalleBlocSerializer(salles_libres, many=True).data)


class InterventionChirurgicaleViewSet(viewsets.ModelViewSet):
    serializer_class = InterventionChirurgicaleSerializer

    def get_queryset(self):
        qs = InterventionChirurgicale.objects.select_related(
            'patient', 'service_chirurgie', 'salle', 'chirurgien_principal'
        )
        user = self.request.user
        if user.is_superuser:
            return qs

        emp = get_employe(user)
        if emp is None or emp.service_id is None:
            return InterventionChirurgicale.objects.none()

        patient_id = self.request.query_params.get('patient')
        if patient_id:
            qs = qs.filter(patient_id=patient_id)

        # Visible si l'intervention a lieu dans mon service, OU si je suis
        # rattaché au service d'origine du patient (le médecin prescripteur
        # doit pouvoir suivre l'intervention qu'il a indiquée).
        return qs.filter(
            Q(service_chirurgie_id=emp.service_id) |
            Q(patient__service_id=emp.service_id)
        ).distinct()

    def get_permissions(self):
        if self.request.method in ('GET', 'HEAD', 'OPTIONS'):
            return [IsAuthenticated()]
        return [PeutGererOperation()]

    def _resoudre_bornes(self, request):
        """Même convention que RdvViewSet._resoudre_bornes (module Calendrier) :
        'debut'/'fin' explicites sinon semaine courante."""
        debut_str = request.query_params.get('debut')
        fin_str = request.query_params.get('fin')
        if debut_str and fin_str:
            try:
                return date_cls.fromisoformat(debut_str), date_cls.fromisoformat(fin_str)
            except ValueError:
                raise ValidationError({'detail': "Dates 'debut'/'fin' invalides (format AAAA-MM-JJ)."})
        aujourdhui = timezone.localdate()
        lundi = aujourdhui - timedelta(days=aujourdhui.weekday())
        dimanche = lundi + timedelta(days=6)
        return lundi, dimanche

    @action(detail=False, methods=['get'], url_path='planning')
    def planning(self, request):
        """
        Planning du Bloc opératoire pour une plage de dates — alimente la
        grille salle × heure du module Calendrier. Réutilise le même
        queryset scopé par service que le reste du ViewSet, et accepte en
        plus un filtre 'salle' optionnel.
        """
        debut, fin = self._resoudre_bornes(request)
        interventions = self.filter_queryset(self.get_queryset()).filter(
            heure_debut__date__range=(debut, fin)
        )
        salle_id = request.query_params.get('salle')
        if salle_id:
            interventions = interventions.filter(salle_id=salle_id)

        return Response({
            'debut': debut.isoformat(),
            'fin': fin.isoformat(),
            'operations': InterventionChirurgicaleSerializer(interventions, many=True).data,
        })

    def perform_create(self, serializer):
        serializer.save()

    @action(detail=False, methods=['get'], url_path='stats')
    def stats(self, request):
        """
        Agrégats réels sur les interventions visibles par l'utilisateur
        connecté (réutilise get_queryset, donc déjà scopé par service).
        Alimente les onglets « Vue d'ensemble » et « Performance par
        chirurgien » côté Analytics.
        """
        from django.db.models import Count, Avg, F, DurationField, ExpressionWrapper
        from django.db.models.functions import TruncWeek

        qs = self.get_queryset()
        issues = qs.filter(statut__in=[StatutIntervention.TERMINEE, StatutIntervention.DECES_AU_BLOC])

        # Durée réelle moyenne — seulement sur les interventions dont les
        # deux horodatages réels sont renseignés.
        avec_duree = issues.filter(
            date_debut_reelle__isnull=False, date_fin_reelle__isnull=False
        ).annotate(
            duree=ExpressionWrapper(F('date_fin_reelle') - F('date_debut_reelle'), output_field=DurationField())
        )
        duree_moyenne = avec_duree.aggregate(m=Avg('duree'))['m']
        duree_moyenne_min = round(duree_moyenne.total_seconds() / 60) if duree_moyenne else None

        nb_terminees = issues.filter(statut=StatutIntervention.TERMINEE).count()
        nb_deces = issues.filter(statut=StatutIntervention.DECES_AU_BLOC).count()
        total_issues = nb_terminees + nb_deces
        taux_succes = round(nb_terminees / total_issues * 100, 1) if total_issues else None

        repartition_par_type = list(
            issues.values('type_acte')
            .annotate(nb=Count('id')).order_by('-nb')[:6]
        )

        depuis = timezone.now() - timedelta(weeks=8)
        evolution_hebdo = list(
            qs.filter(heure_debut__gte=depuis)
            .annotate(semaine=TruncWeek('heure_debut'))
            .values('semaine').annotate(nb=Count('id')).order_by('semaine')
        )

        dernieres = qs.filter(
            statut__in=[StatutIntervention.TERMINEE, StatutIntervention.DECES_AU_BLOC]
        ).order_by('-date_fin_reelle')[:5]
        dernieres_interventions = [
            {
                'date': intervention.date_fin_reelle.strftime('%d/%m/%Y') if intervention.date_fin_reelle else None,
                'patient': f"{intervention.patient.prenom} {intervention.patient.nom}",
                'type': intervention.type_acte,
                'chirurgien': f"{intervention.chirurgien_principal.prenom} {intervention.chirurgien_principal.nom}",
                'duree': (
                    f"{round((intervention.date_fin_reelle - intervention.date_debut_reelle).total_seconds() / 60)} min"
                    if intervention.date_debut_reelle and intervention.date_fin_reelle else None
                ),
                'issue': 'succes' if intervention.statut == StatutIntervention.TERMINEE else 'deces_au_bloc',
            }
            for intervention in dernieres
        ]

        par_chirurgien = []
        chirurgien_ids = issues.values_list('chirurgien_principal_id', flat=True).distinct()
        for chirurgien_id in chirurgien_ids:
            interventions_chirurgien = issues.filter(chirurgien_principal_id=chirurgien_id)
            premiere = interventions_chirurgien.first()
            if not premiere:
                continue
            chirurgien = premiere.chirurgien_principal
            avec_duree_c = interventions_chirurgien.filter(
                date_debut_reelle__isnull=False, date_fin_reelle__isnull=False
            ).annotate(duree=ExpressionWrapper(F('date_fin_reelle') - F('date_debut_reelle'), output_field=DurationField()))
            duree_c = avec_duree_c.aggregate(m=Avg('duree'))['m']
            nb_term_c = interventions_chirurgien.filter(statut=StatutIntervention.TERMINEE).count()
            nb_deces_c = interventions_chirurgien.filter(statut=StatutIntervention.DECES_AU_BLOC).count()
            total_c = nb_term_c + nb_deces_c
            par_chirurgien.append({
                'id': chirurgien.id,
                'nom': f"{chirurgien.prenom} {chirurgien.nom}",
                'specialite': chirurgien.specialite or '',
                'nb_interventions': total_c,
                'duree_moyenne_min': round(duree_c.total_seconds() / 60) if duree_c else None,
                'taux_succes': round(nb_term_c / total_c * 100, 1) if total_c else None,
                'patients_operes': interventions_chirurgien.values('patient_id').distinct().count(),
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
    def annuler(self, request, pk=None):
        """
        programmee → annulee. Volontairement restreint à 'programmee' : une
        fois l'intervention en_cours, on ne l'« annule » plus, on la clôture
        (terminee ou deces_au_bloc) — cf. cloturer().
        """
        intervention = self.get_object()
        self.check_object_permissions(request, intervention)
        if intervention.statut != StatutIntervention.PROGRAMMEE:
            return Response({'detail': "Seule une intervention programmée peut être annulée."}, status=400)

        intervention.statut = StatutIntervention.ANNULEE
        motif = request.data.get('motif')
        if motif:
            intervention.complications = motif
        intervention.save(update_fields=['statut', 'complications', 'date_modification'])

        return Response(InterventionChirurgicaleSerializer(intervention).data)

    @action(detail=True, methods=['post'])
    def demarrer(self, request, pk=None):
        """programmee → en_cours, horodate le début réel, occupe la salle."""
        intervention = self.get_object()
        self.check_object_permissions(request, intervention)
        if intervention.statut != StatutIntervention.PROGRAMMEE:
            return Response({'detail': "Seule une intervention programmée peut démarrer."}, status=400)
        intervention.statut = StatutIntervention.EN_COURS
        intervention.date_debut_reelle = timezone.now()
        intervention.save(update_fields=['statut', 'date_debut_reelle', 'date_modification'])

        if intervention.salle_id:
            SalleBloc.objects.filter(pk=intervention.salle_id).update(statut=StatutSalle.OCCUPE)

        return Response(InterventionChirurgicaleSerializer(intervention).data)

    @action(detail=True, methods=['post'])
    def cloturer(self, request, pk=None):
        """
        en_cours → terminee | deces_au_bloc, horodate la fin réelle.

        Body attendu : { "resultat": "terminee" | "deces_au_bloc",
                          "compte_rendu_operatoire": str,
                          "complications": str (optionnel) }

        En cas de décès au bloc, cascade complète (voir _traiter_deces_au_bloc) :
        le patient passe décédé, la salle part en désinfection approfondie,
        et le lit d'hospitalisation éventuel est libéré.
        """
        intervention = self.get_object()
        self.check_object_permissions(request, intervention)
        if intervention.statut != StatutIntervention.EN_COURS:
            return Response({'detail': "L'intervention doit être en cours pour être clôturée."}, status=400)

        resultat = request.data.get('resultat', 'terminee')
        if resultat not in (StatutIntervention.TERMINEE, StatutIntervention.DECES_AU_BLOC):
            return Response({'detail': "'resultat' doit être 'terminee' ou 'deces_au_bloc'."}, status=400)

        intervention.statut = resultat
        intervention.date_fin_reelle = timezone.now()
        intervention.compte_rendu_operatoire = request.data.get(
            'compte_rendu_operatoire', intervention.compte_rendu_operatoire
        )
        if request.data.get('complications'):
            intervention.complications = request.data['complications']
        intervention.save(update_fields=[
            'statut', 'date_fin_reelle', 'compte_rendu_operatoire', 'complications', 'date_modification'
        ])

        if resultat == StatutIntervention.DECES_AU_BLOC:
            self._traiter_deces_au_bloc(intervention, request)
        elif intervention.salle_id:
            # Clôture normale : la salle redevient disponible pour le
            # prochain passage (le turnover/ménage de routine n'est pas
            # modélisé ici, contrairement à la désinfection approfondie
            # post-décès qui est un vrai protocole distinct).
            SalleBloc.objects.filter(pk=intervention.salle_id).update(statut=StatutSalle.DISPONIBLE)

        return Response(InterventionChirurgicaleSerializer(intervention).data)

    def _traiter_deces_au_bloc(self, intervention, request):
        """
        Cascade d'un décès survenu pendant l'intervention :
        - enregistrement du décès (source de vérité unique côté morgue —
          voir morgue.services.enregistrer_deces, qui positionne aussi
          Patient.statut_vital) ;
        - la salle bascule en désinfection approfondie (protocole renforcé,
          distinct du ménage de routine entre deux interventions) ;
        - le lit d'hospitalisation éventuel du patient est libéré.
        """
        from morgue.services import enregistrer_deces

        emp = get_employe(request.user)
        enregistrer_deces(
            patient=intervention.patient,
            date_deces=intervention.date_fin_reelle or timezone.now(),
            operation_liee=intervention,
            necessite_autopsie=True,
            cause_presumee=f"Décès per-opératoire — {intervention.type_acte}.",
            medecin_constatant=emp,
        )

        if intervention.salle_id:
            SalleBloc.objects.filter(pk=intervention.salle_id).update(
                statut=StatutSalle.DESINFECTION_APPROFONDIE
            )

        hospitalisation_active = intervention.patient.hospitalisations.filter(statut='en_cours').first()
        if hospitalisation_active:
            hospitalisation_active.statut = 'terminee'
            hospitalisation_active.date_sortie = timezone.now()
            if not hospitalisation_active.diagnostic_sortie:
                hospitalisation_active.diagnostic_sortie = "Décès per-opératoire."
            hospitalisation_active.lit = ''
            hospitalisation_active.save(update_fields=[
                'statut', 'date_sortie', 'diagnostic_sortie', 'lit'
            ])
