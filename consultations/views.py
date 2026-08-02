from datetime import date as date_cls
from datetime import datetime, timedelta

from django.db.models import Exists, OuterRef, Q
from rest_framework import viewsets
from rest_framework.permissions import SAFE_METHODS, IsAuthenticated
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from django.utils import timezone as dj_timezone

from comptes.models import Employe
from comptes.capacites import roles_effectifs
from comptes.permissions import IsAdminRole, IsLectureAutorisee, IsMedecinOuAdmin, PeutVoirRendezVous, get_employe
from activites.models import journaliser
from disponibilites.models import CreneauDisponibilite, ExceptionDisponibilite, StatutException
from alertes.models import Alerte
from temps_reel.broadcast import diffuser_service
from .models import Consultation, RendezVous, EvenementAdministratif
from .serializers import (
    ConsultSerializer, RdvSerializer, RdvPlanningSerializer, IndisponibiliteSerializer,
    EvenementAdministratifSerializer, EvenementAdminPlanningSerializer,
)
from antecedents.models import Antecedent, TypeAntecedent, StatutAntecedent
from antecedents.serializers import AntecedentSerializer


class ConsultViewSet(viewsets.ModelViewSet):
    serializer_class   = ConsultSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            qs = Consultation.objects.select_related('patient').all()
        else:
            emp = get_employe(user)
            if emp is None or emp.role == 'laborantin':
                return Consultation.objects.none()

            if emp.service:
                qs = Consultation.objects.select_related('patient').filter(
                    patient__service=emp.service
                )
            else:
                return Consultation.objects.none()

        patient_id = self.request.query_params.get('patient')
        if patient_id:
            qs = qs.filter(patient_id=patient_id)
        return qs

    def get_permissions(self):
        if self.request.method in SAFE_METHODS:
            return [IsLectureAutorisee()]
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsMedecinOuAdmin()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        """
        Si la consultation est créée depuis le flux "Démarrer la consultation"
        du planning médecin (cf. mon_planning, spec calendrier §3.1.b), le
        frontend envoie 'rdv_origine' = id du RendezVous à l'origine. On
        rattache alors ce RDV à la consultation nouvellement créée
        (RendezVous.consultation_liee), pour que mon_planning sache ensuite
        proposer "Reprendre" plutôt que "Démarrer".
        """
        consultation = serializer.save()
        rdv_id = self.request.data.get('rdv_origine')
        if rdv_id:
            RendezVous.objects.filter(pk=rdv_id).update(consultation_liee=consultation)
        self._repercuter_statut_sur_rdv(consultation)
        journaliser(
            employe=get_employe(self.request.user),
            type_objet='consultation',
            action='creation',
            description=f"Consultation créée — {consultation.patient.prenom} {consultation.patient.nom}",
            objet_id=consultation.id,
        )

    def perform_update(self, serializer):
        """
        Répercute la fin d'une consultation sur le rendez-vous qui l'a
        déclenchée : si le médecin passe la consultation à 'terminee', le
        RendezVous lié (RendezVous.consultation_liee) doit lui aussi passer
        à 'termine' — sans ce cascade, l'onglet "Passés" de la page
        Rendez-vous ne voit jamais ces RDV consultés en avance sur leur
        horaire planifié (cf. correctif filtrage "Passés").
        """
        statut_avant = serializer.instance.statut
        consultation = serializer.save()
        self._repercuter_statut_sur_rdv(consultation)
        if consultation.statut == 'terminee' and statut_avant != 'terminee':
            journaliser(
                employe=get_employe(self.request.user),
                type_objet='consultation',
                action='modification',
                description=f"Consultation terminée — {consultation.patient.prenom} {consultation.patient.nom}",
                objet_id=consultation.id,
            )

    def _repercuter_statut_sur_rdv(self, consultation):
        if consultation.statut != 'terminee':
            return
        (
            RendezVous.objects
            .filter(consultation_liee=consultation)
            .exclude(statut__in=['termine', 'annule'])
            .update(statut='termine')
        )

    @action(detail=True, methods=['post'], url_path='promouvoir_antecedent')
    def promouvoir_antecedent(self, request, pk=None):
        """
        Transforme le diagnostic de cette consultation en antécédent durable.
        """
        consultation = self.get_object()
        libelle = (
                request.data.get('libelle')
                or consultation.diagnostic
                or consultation.motif
                or ''
        ).strip()

        if not libelle:
            return Response(
                {'detail': "Impossible de créer un antécédent sans libellé ni diagnostic."},
                status=400
            )

        antecedent = Antecedent.objects.create(
            patient=consultation.patient,
            consultation_source=consultation,
            libelle=libelle,
            type_antecedent=request.data.get('type_antecedent', TypeAntecedent.AUTRE),
            observations=request.data.get('observations', consultation.notes or ''),
            statut=request.data.get('statut', StatutAntecedent.ACTIF),
            date_diagnostic=request.data.get('date_diagnostic') or consultation.date.date(),
        )
        return Response(AntecedentSerializer(antecedent).data, status=201)


def _exception_bloquante(medecin, jour):
    """Renvoie l'exception validée qui bloque toute la journée (congé/absence/
    formation/mission), ou None. Une garde exceptionnelle n'est pas bloquante."""
    return ExceptionDisponibilite.objects.filter(
        employe=medecin,
        statut=StatutException.VALIDE,
        date_debut__lte=jour,
        date_fin__gte=jour,
    ).exclude(type='garde').first()


def _slots_du_jour(medecin, jour, duree, exclude_id=None):
    """Génère les créneaux de `duree` minutes pour un médecin à une date donnée,
    à partir de ses disponibilités récurrentes, en excluant les horaires déjà
    pris par un rendez-vous existant (hors annulés)."""
    jour_semaine  = jour.weekday()  # lundi=0 … dimanche=6, aligné sur JourSemaine
    creneaux_jour = CreneauDisponibilite.objects.filter(
        employe=medecin, jour=jour_semaine, actif=True
    ).order_by('heure_debut')

    rdv_qs = RendezVous.objects.filter(
        medecin=medecin, date_heure__date=jour
    ).exclude(statut='annule')
    if exclude_id:
        rdv_qs = rdv_qs.exclude(pk=exclude_id)

    occupes = []
    for r in rdv_qs:
        debut_local = dj_timezone.localtime(r.date_heure)
        fin_locale  = (
                datetime.combine(jour, debut_local.time()) + timedelta(minutes=duree)
        ).time()
        occupes.append((debut_local.time(), fin_locale))

    resultats = []
    for creneau in creneaux_jour:
        curseur     = datetime.combine(jour, creneau.heure_debut)
        fin_creneau = datetime.combine(jour, creneau.heure_fin)
        while curseur + timedelta(minutes=duree) <= fin_creneau:
            slot_debut = curseur.time()
            slot_fin   = (curseur + timedelta(minutes=duree)).time()
            chevauche  = any(
                slot_debut < occ_fin and slot_fin > occ_debut
                for occ_debut, occ_fin in occupes
            )
            resultats.append({
                'heure_debut': slot_debut.strftime('%H:%M'),
                'heure_fin':   slot_fin.strftime('%H:%M'),
                'type':        creneau.type,
                'disponible':  not chevauche,
            })
            curseur += timedelta(minutes=duree)
    return resultats


def _parse_duree(request):
    try:
        duree = int(request.query_params.get('duree', 30))
    except ValueError:
        duree = 30
    return max(5, duree)


class RdvViewSet(viewsets.ModelViewSet):
    serializer_class   = RdvSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            qs = RendezVous.objects.select_related('patient').all()
        else:
            emp = get_employe(user)
            if emp is None or emp.role == 'laborantin':
                return RendezVous.objects.none()

            if emp.service:
                qs = RendezVous.objects.select_related('patient').filter(
                    patient__service=emp.service
                )
                # Un médecin (ou tout rôle héritant, ex. chef_chirurgie) ne
                # voit que SES PROPRES rendez-vous — le planning partagé de
                # tout le service (patient + motif de chaque consultation)
                # reste réservé au secrétariat/infirmier/chef de service,
                # qui en ont besoin pour organiser les RDV de toute l'équipe.
                # Le chef de service (role='admin') garde la vue complète,
                # comme un médecin lambda n'y a pas droit sans lien avec le
                # patient (secret médical).
                if emp.role != 'admin' and 'medecin' in roles_effectifs(emp.role):
                    qs = qs.filter(medecin=emp)
            else:
                return RendezVous.objects.none()

        patient_id = self.request.query_params.get('patient')
        if patient_id:
            qs = qs.filter(patient_id=patient_id)
        medecin_id = self.request.query_params.get('medecin')
        if medecin_id:
            qs = qs.filter(medecin_id=medecin_id)
        return qs.order_by('date_heure')

    def get_permissions(self):
        if self.request.method in SAFE_METHODS:
            return [PeutVoirRendezVous()]
        if self.action == 'destroy':
            return [IsAdminRole()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        """
        Empêche la création d'un rendez-vous reliant un patient et/ou un
        médecin d'un service différent de celui de l'employé connecté.
        Le superuser (admin général) n'est pas concerné par cette
        restriction, à l'image de IsAdminRole/same_service ailleurs dans
        l'app — seul le chef de service (rôle 'admin') reste limité à SON
        service, comme les autres rôles.

        Un médecin, lui, ne peut jamais programmer un rendez-vous pour un
        autre médecin que lui-même — l'UI le verrouille déjà côté frontend,
        mais la règle doit aussi tenir face à un appel API direct.
        """
        user = self.request.user
        if not user.is_superuser:
            emp = get_employe(user)
            if emp is not None and 'medecin' in roles_effectifs(emp.role):
                medecin = serializer.validated_data.get('medecin')
                if medecin is not None and medecin.pk != emp.pk:
                    raise ValidationError({
                        'medecin': "Vous ne pouvez programmer un rendez-vous que pour vous-même."
                    })
            if emp is not None and emp.service_id is not None:
                patient = serializer.validated_data.get('patient')
                medecin = serializer.validated_data.get('medecin')

                if patient is not None and patient.service_id != emp.service_id:
                    raise ValidationError({
                        'patient': "Ce patient n'appartient pas à votre service."
                    })
                if medecin is not None and medecin.service_id != emp.service_id:
                    raise ValidationError({
                        'medecin': "Ce médecin n'appartient pas à votre service."
                    })

        serializer.save()
        diffuser_service(
            serializer.instance.patient.service_id, 'rendez_vous', 'cree',
            id=serializer.instance.id
        )
        journaliser(
            employe=get_employe(user),
            type_objet='rendez_vous',
            action='creation',
            description=(
                f"RDV créé — {serializer.instance.patient.prenom} {serializer.instance.patient.nom} "
                f"avec Dr. {serializer.instance.medecin.prenom} {serializer.instance.medecin.nom}"
            ),
            objet_id=serializer.instance.id,
        )

    def perform_update(self, serializer):
        """Même verrouillage qu'à la création, appliqué aussi à la modification."""
        user = self.request.user
        if not user.is_superuser:
            emp = get_employe(user)
            if emp is not None and 'medecin' in roles_effectifs(emp.role):
                medecin = serializer.validated_data.get('medecin', serializer.instance.medecin)
                if medecin is not None and medecin.pk != emp.pk:
                    raise ValidationError({
                        'medecin': "Vous ne pouvez programmer un rendez-vous que pour vous-même."
                    })

        statut_avant = serializer.instance.statut
        nouveau_statut = serializer.validated_data.get('statut', statut_avant)

        serializer.save()
        diffuser_service(
            serializer.instance.patient.service_id, 'rendez_vous', 'modifie',
            id=serializer.instance.id
        )

        # On ne journalise que l'annulation, pas chaque déplacement/édition —
        # un RDV reprogrammé par drag & drop n'a pas de valeur de
        # traçabilité en soi (cf. docstring du modèle JournalActivite).
        if nouveau_statut == 'annule' and statut_avant != 'annule':
            journaliser(
                employe=get_employe(user),
                type_objet='rendez_vous',
                action='annulation',
                description=(
                    f"RDV annulé — {serializer.instance.patient.prenom} {serializer.instance.patient.nom} "
                    f"avec Dr. {serializer.instance.medecin.prenom} {serializer.instance.medecin.nom}"
                ),
                objet_id=serializer.instance.id,
            )

    def perform_destroy(self, instance):
        service_id = instance.patient.service_id
        rdv_id = instance.id
        instance.delete()
        diffuser_service(service_id, 'rendez_vous', 'supprime', id=rdv_id)

    @action(detail=False, methods=['get'], url_path='creneaux_disponibles',
            permission_classes=[PeutVoirRendezVous])
    def creneaux_disponibles(self, request):
        """
        Renvoie les créneaux disponibles d'un médecin pour une date donnée,
        en croisant ses disponibilités récurrentes (CreneauDisponibilite),
        ses exceptions validées (congé/absence/formation/mission), et les
        rendez-vous déjà pris ce jour-là.

        Query params :
          - medecin  (id, requis)
          - date     (AAAA-MM-JJ, requis)
          - duree    (minutes, optionnel, défaut 30)
          - exclude  (id de rendez-vous à ignorer, utile en modification)
        """
        medecin_id = request.query_params.get('medecin')
        date_str   = request.query_params.get('date')

        if not medecin_id or not date_str:
            return Response(
                {'detail': "Les paramètres 'medecin' et 'date' sont requis."},
                status=400
            )

        try:
            medecin = Employe.objects.get(pk=medecin_id, role='medecin')
        except Employe.DoesNotExist:
            return Response({'detail': "Médecin introuvable."}, status=404)

        try:
            jour = date_cls.fromisoformat(date_str)
        except ValueError:
            return Response(
                {'detail': "Date invalide (format attendu : AAAA-MM-JJ)."},
                status=400
            )

        duree = _parse_duree(request)

        exception_bloquante = _exception_bloquante(medecin, jour)
        if exception_bloquante:
            return Response({
                'creneaux': [],
                'indisponible': True,
                'motif': (
                    f"{medecin.prenom} {medecin.nom} est en "
                    f"{exception_bloquante.get_type_display().lower()} ce jour-là."
                ),
            })

        jour_semaine = jour.weekday()
        if not CreneauDisponibilite.objects.filter(
                employe=medecin, jour=jour_semaine, actif=True
        ).exists():
            return Response({
                'creneaux': [],
                'indisponible': True,
                'motif': "Aucun créneau de disponibilité défini pour ce jour.",
            })

        exclude_id = request.query_params.get('exclude')
        resultats  = _slots_du_jour(medecin, jour, duree, exclude_id)

        return Response({'creneaux': resultats, 'indisponible': False, 'motif': ''})

    @action(detail=False, methods=['get'], url_path='medecins_disponibles',
            permission_classes=[PeutVoirRendezVous])
    def medecins_disponibles(self, request):
        """
        Pour une date donnée, renvoie tous les médecins ayant au moins un
        créneau de disponibilité ce jour de la semaine, avec le nombre de
        créneaux encore libres (et le motif d'indisponibilité le cas échéant).

        Query params :
          - date   (AAAA-MM-JJ, requis)
          - duree  (minutes, optionnel, défaut 30)
        """
        date_str = request.query_params.get('date')
        if not date_str:
            return Response({'detail': "Le paramètre 'date' est requis."}, status=400)

        try:
            jour = date_cls.fromisoformat(date_str)
        except ValueError:
            return Response(
                {'detail': "Date invalide (format attendu : AAAA-MM-JJ)."},
                status=400
            )

        duree        = _parse_duree(request)
        jour_semaine = jour.weekday()

        medecin_ids = CreneauDisponibilite.objects.filter(
            jour=jour_semaine, actif=True, employe__role='medecin'
        ).values_list('employe_id', flat=True).distinct()

        medecins   = Employe.objects.filter(id__in=medecin_ids).order_by('nom', 'prenom')
        resultats  = []

        for medecin in medecins:
            exception_bloquante = _exception_bloquante(medecin, jour)
            if exception_bloquante:
                resultats.append({
                    'id': medecin.id,
                    'nom': medecin.nom,
                    'prenom': medecin.prenom,
                    'specialite': medecin.specialite,
                    'disponible': False,
                    'nb_creneaux_libres': 0,
                    'motif': f"En {exception_bloquante.get_type_display().lower()}",
                })
                continue

            slots     = _slots_du_jour(medecin, jour, duree)
            nb_libres = sum(1 for s in slots if s['disponible'])
            resultats.append({
                'id': medecin.id,
                'nom': medecin.nom,
                'prenom': medecin.prenom,
                'specialite': medecin.specialite,
                'disponible': nb_libres > 0,
                'nb_creneaux_libres': nb_libres,
                'motif': '' if nb_libres > 0 else "Toutes les places sont prises ce jour-là.",
            })

        resultats.sort(key=lambda m: (-m['disponible'], -m['nb_creneaux_libres']))
        return Response({'date': date_str, 'medecins': resultats})

    @action(detail=False, methods=['get'], url_path='dates_disponibles',
            permission_classes=[PeutVoirRendezVous])
    def dates_disponibles(self, request):
        """
        Pour un médecin donné, renvoie sur une période (par défaut les 30
        prochains jours à partir d'aujourd'hui) la liste des dates où il a
        au moins un créneau encore libre.

        Query params :
          - medecin (id, requis)
          - debut   (AAAA-MM-JJ, optionnel, défaut aujourd'hui)
          - jours   (optionnel, défaut 30, max 90)
          - duree   (minutes, optionnel, défaut 30)
        """
        medecin_id = request.query_params.get('medecin')
        if not medecin_id:
            return Response({'detail': "Le paramètre 'medecin' est requis."}, status=400)

        try:
            medecin = Employe.objects.get(pk=medecin_id, role='medecin')
        except Employe.DoesNotExist:
            return Response({'detail': "Médecin introuvable."}, status=404)

        debut_str = request.query_params.get('debut')
        try:
            debut = date_cls.fromisoformat(debut_str) if debut_str else dj_timezone.localdate()
        except ValueError:
            return Response({'detail': "Date de début invalide."}, status=400)

        try:
            nb_jours = int(request.query_params.get('jours', 30))
        except ValueError:
            nb_jours = 30
        nb_jours = max(1, min(nb_jours, 90))

        duree = _parse_duree(request)
        fin   = debut + timedelta(days=nb_jours - 1)

        jours_actifs = set(
            CreneauDisponibilite.objects.filter(employe=medecin, actif=True)
            .values_list('jour', flat=True).distinct()
        )

        if not jours_actifs:
            return Response({'medecin': int(medecin_id), 'dates': []})

        exceptions_periode = list(
            ExceptionDisponibilite.objects.filter(
                employe=medecin, statut=StatutException.VALIDE,
                date_debut__lte=fin, date_fin__gte=debut,
            ).exclude(type='garde')
        )

        dates_dispo = []
        cur = debut
        while cur <= fin:
            if cur.weekday() in jours_actifs and not any(
                    exc.date_debut <= cur <= exc.date_fin for exc in exceptions_periode
            ):
                slots     = _slots_du_jour(medecin, cur, duree)
                nb_libres = sum(1 for s in slots if s['disponible'])
                if nb_libres > 0:
                    dates_dispo.append({'date': cur.isoformat(), 'nb_creneaux_libres': nb_libres})
            cur += timedelta(days=1)

        return Response({'medecin': int(medecin_id), 'dates': dates_dispo})

    def _resoudre_bornes(self, request):
        """
        Détermine (debut, fin) à partir des query params 'debut'/'fin', ou à
        défaut la semaine courante (lundi → dimanche). Le paramètre 'vue' est
        volontairement ignoré ici : il ne sert qu'à documenter l'intention côté
        frontend, le calcul des bornes par défaut reste toujours "semaine
        courante" quel que soit son contenu, tant que debut/fin ne sont pas
        fournis explicitement.
        """
        debut_str = request.query_params.get('debut')
        fin_str = request.query_params.get('fin')

        if debut_str and fin_str:
            try:
                return date_cls.fromisoformat(debut_str), date_cls.fromisoformat(fin_str)
            except ValueError:
                raise ValidationError({'detail': "Dates 'debut'/'fin' invalides (format AAAA-MM-JJ)."})

        aujourdhui = dj_timezone.localdate()
        lundi = aujourdhui - timedelta(days=aujourdhui.weekday())
        dimanche = lundi + timedelta(days=6)
        return lundi, dimanche

    @action(detail=False, methods=['get'], url_path='planning')
    def planning(self, request):
        """
        Planning générique pour le module Calendrier (vues Jour/Semaine) —
        contrairement à `mon_planning`, n'est pas réservé aux médecins :
        accessible à tout rôle passant PeutVoirRendezVous (secrétaire, chef
        de service, infirmier, admin…), et pas limité à l'employé connecté.

        Réutilise le même queryset scopé par service que le reste du
        ViewSet (cf. get_queryset) : un chef de service ne voit que les RDV
        de son service, un admin/superuser voit tout.

        Query params :
          - debut / fin (AAAA-MM-JJ, optionnels — défaut : semaine courante)
          - medecin     (id, optionnel — filtre déjà géré par get_queryset)
        """
        debut, fin = self._resoudre_bornes(request)

        rendez_vous = (
            self.filter_queryset(self.get_queryset())
            .filter(date_heure__date__range=(debut, fin))
            .select_related('patient', 'medecin', 'consultation_liee')
            .annotate(
                _a_alerte_critique=Exists(
                    Alerte.objects.filter(
                        patient_id=OuterRef('patient_id'),
                        statut='non_lue',
                    )
                )
            )
        )

        return Response({
            'debut': debut.isoformat(),
            'fin': fin.isoformat(),
            'evenements': RdvPlanningSerializer(rendez_vous, many=True).data,
        })

    @action(detail=False, methods=['get'], url_path='mon_planning')
    def mon_planning(self, request):
        """
        Planning de l'employé connecté (médecin uniquement). Résout toujours
        l'utilisateur courant — ignore tout ?medecin= éventuel, contrairement
        aux autres actions de ce ViewSet qui restent utilisables par le
        secrétariat pour n'importe quel médecin.

        NB permission : cette action passe par get_permissions() du ViewSet
        (branche SAFE_METHODS → PeutVoirRendezVous), pas par un
        permission_classes déclaré ici — le contrôle de rôle 'medecin' ci-
        dessous referme l'accès aux autres rôles malgré tout.
        """
        employe = get_employe(request.user)
        if employe is None or employe.role != 'medecin':
            return Response(
                {'detail': "Cette vue est réservée aux médecins."},
                status=403
            )

        debut, fin = self._resoudre_bornes(request)

        rendez_vous = (
            RendezVous.objects
            .filter(medecin=employe, date_heure__date__range=(debut, fin))
            .select_related('patient', 'consultation_liee')
            .annotate(
                _a_alerte_critique=Exists(
                    Alerte.objects.filter(
                        patient_id=OuterRef('patient_id'),
                        statut='non_lue',
                    )
                )
            )
            .order_by('date_heure')
        )

        exceptions = ExceptionDisponibilite.objects.filter(
            employe=employe,
            statut=StatutException.VALIDE,
            date_debut__lte=fin,
            date_fin__gte=debut,
        )

        evenements_admin = EvenementAdministratif.objects.filter(
            Q(service=employe.service) | Q(service__isnull=True) | Q(participants=employe),
            date_heure_debut__date__lte=fin,
            date_heure_fin__date__gte=debut,
            ).distinct()

        tous_evenements = (
                list(RdvPlanningSerializer(rendez_vous, many=True).data) +
                list(EvenementAdminPlanningSerializer(evenements_admin, many=True).data)
        )
        tous_evenements.sort(key=lambda e: e['start_time'])

        return Response({
            'debut': debut.isoformat(),
            'fin': fin.isoformat(),
            'evenements': tous_evenements,
            'indisponibilites': IndisponibiliteSerializer(exceptions, many=True).data,
        })

class EvenementAdministratifViewSet(viewsets.ModelViewSet):
    """
    Réunions, formations, gardes administratives. Lecture ouverte à tout
    employé authentifié (voir get_queryset — scopée à son propre service +
    événements transversaux) ; création/modification/annulation réservées à
    IsAdminRole (chef de service sur SON service, ou superuser sans
    restriction) — c'est exactement le « Admin ou Chef de Service » demandé.
    """
    serializer_class = EvenementAdministratifSerializer

    def get_permissions(self):
        if self.request.method in SAFE_METHODS:
            return [IsAuthenticated()]
        return [IsAdminRole()]

    def get_queryset(self):
        qs = EvenementAdministratif.objects.select_related('service', 'organisateur').prefetch_related('participants')

        if self.request.method not in SAFE_METHODS:
            return qs

        user = self.request.user
        if user.is_superuser:
            return qs

        employe = get_employe(user)
        if employe is None:
            return EvenementAdministratif.objects.none()

        return qs.filter(
            Q(service=employe.service) | Q(service__isnull=True) | Q(participants=employe)
        ).distinct()

    def perform_create(self, serializer):
        organisateur = get_employe(self.request.user)
        if not self.request.user.is_superuser:
            service_soumis = serializer.validated_data.get('service')
            if service_soumis is None or service_soumis.id != organisateur.service_id:
                raise ValidationError({
                    'service': "Tu ne peux créer un événement que pour ton propre service."
                })
        serializer.save(organisateur=organisateur)
        diffuser_service(
            serializer.instance.service_id, 'evenement_administratif', 'cree',
            id=serializer.instance.id
        )

    def perform_update(self, serializer):
        serializer.save()
        diffuser_service(
            serializer.instance.service_id, 'evenement_administratif', 'modifie',
            id=serializer.instance.id
        )

    def perform_destroy(self, instance):
        service_id = instance.service_id
        evenement_id = instance.id
        instance.delete()
        diffuser_service(service_id, 'evenement_administratif', 'supprime', id=evenement_id)