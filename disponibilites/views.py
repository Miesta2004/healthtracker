from datetime import datetime, timedelta, date as date_cls, time
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from comptes.permissions import IsAdminOuMajor, is_major, get_employe
from .models import CreneauDisponibilite, ExceptionDisponibilite, StatutException, AssignationPatient, TypeCreneau, TypeException
from .serializers import CreneauSerializer, ExceptionSerializer, AssignationPatientSerializer
from .shifts import shift_et_date_actuels, repartir_patients_hospitalises
from temps_reel.broadcast import diffuser_service


# Convention pour une garde exceptionnelle (ExceptionDisponibilite) : le
# modèle ne stocke que des dates, pas d'heures — contrairement à
# CreneauDisponibilite qui a de vraies heure_debut/heure_fin. On adopte la
# convention hospitalière la plus courante en France (garde de 24h, relève à
# 8h) plutôt que d'inventer une heure arbitraire.
HEURE_RELEVE_GARDE = time(8, 0)


def _employes_visibles_gardes(request):
    """
    Même logique de portée que CreneauViewSet/ExceptionViewSet : qui peut
    voir les gardes de qui. Retourne un queryset d'Employe, ou None si
    aucune restriction par employé ne s'applique (superuser = déjà large).
    """
    from comptes.models import Employe

    emp = get_employe(request.user)
    if emp is None:
        return Employe.objects.none()

    if request.user.is_superuser:
        return None  # pas de restriction

    if emp.role == 'admin':
        return Employe.objects.filter(service_id=emp.service_id)

    if is_major(emp):
        return Employe.objects.filter(service_id=emp.service_id, role='infirmier')

    return Employe.objects.filter(pk=emp.pk)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def gardes_planning(request):
    """
    Fusionne les deux sources de garde en occurrences datées pour une plage
    donnée — alimente le Calendrier (Jour/Semaine/Mois/Agenda), qui n'a
    sinon aucune visibilité sur les gardes déclarées dans Disponibilités.

    Query params : debut/fin (AAAA-MM-JJ, défaut semaine courante),
    employe (filtre optionnel, doit rester dans le périmètre visible).
    """
    debut_str = request.query_params.get('debut')
    fin_str = request.query_params.get('fin')
    if debut_str and fin_str:
        try:
            debut = date_cls.fromisoformat(debut_str)
            fin = date_cls.fromisoformat(fin_str)
        except ValueError:
            raise ValidationError({'detail': "Dates 'debut'/'fin' invalides (format AAAA-MM-JJ)."})
    else:
        aujourdhui = timezone.localdate()
        debut = aujourdhui - timedelta(days=aujourdhui.weekday())
        fin = debut + timedelta(days=6)

    employes_visibles = _employes_visibles_gardes(request)
    employe_filtre = request.query_params.get('employe')

    def dans_perimetre(employe_id):
        if employes_visibles is not None and not employes_visibles.filter(pk=employe_id).exists():
            return False
        if employe_filtre and str(employe_id) != employe_filtre:
            return False
        return True

    occurrences = []

    # ─── Créneaux récurrents (type garde/astreinte) ─────────────────────────
    creneaux = CreneauDisponibilite.objects.select_related('employe').filter(
        type__in=[TypeCreneau.GARDE, TypeCreneau.ASTREINTE], actif=True,
    )
    if employes_visibles is not None:
        creneaux = creneaux.filter(employe__in=employes_visibles)
    if employe_filtre:
        creneaux = creneaux.filter(employe_id=employe_filtre)

    jour = debut
    while jour <= fin:
        jour_semaine = jour.weekday()  # 0=lundi, cohérent avec JourSemaine
        for creneau in creneaux:
            if creneau.jour != jour_semaine:
                continue
            debut_dt = timezone.make_aware(datetime.combine(jour, creneau.heure_debut))
            fin_brute = datetime.combine(jour, creneau.heure_fin)
            if creneau.heure_fin <= creneau.heure_debut:
                fin_brute += timedelta(days=1)  # garde de nuit à cheval sur deux jours
            fin_dt = timezone.make_aware(fin_brute)
            occurrences.append({
                'id': f'creneau-{creneau.id}-{jour.isoformat()}',
                'source': 'recurrent',
                'employe_id': creneau.employe_id,
                'employe_nom': creneau.employe.nom,
                'employe_prenom': creneau.employe.prenom,
                'employe_role_label': creneau.employe.get_role_display(),
                'type': creneau.type,
                'type_label': creneau.get_type_display(),
                'start_time': debut_dt.isoformat(),
                'end_time': fin_dt.isoformat(),
                'motif': '',
            })
        jour += timedelta(days=1)

    # ─── Exceptions validées (garde exceptionnelle) ─────────────────────────
    exceptions = ExceptionDisponibilite.objects.select_related('employe').filter(
        type=TypeException.GARDE, statut=StatutException.VALIDE,
        date_debut__lte=fin, date_fin__gte=debut,
    )
    if employes_visibles is not None:
        exceptions = exceptions.filter(employe__in=employes_visibles)
    if employe_filtre:
        exceptions = exceptions.filter(employe_id=employe_filtre)

    for exception in exceptions:
        jour = max(exception.date_debut, debut)
        borne = min(exception.date_fin, fin)
        while jour <= borne:
            debut_dt = timezone.make_aware(datetime.combine(jour, HEURE_RELEVE_GARDE))
            fin_dt = timezone.make_aware(datetime.combine(jour + timedelta(days=1), HEURE_RELEVE_GARDE))
            occurrences.append({
                'id': f'exception-{exception.id}-{jour.isoformat()}',
                'source': 'exception',
                'employe_id': exception.employe_id,
                'employe_nom': exception.employe.nom,
                'employe_prenom': exception.employe.prenom,
                'employe_role_label': exception.employe.get_role_display(),
                'type': 'garde',
                'type_label': 'Garde exceptionnelle',
                'start_time': debut_dt.isoformat(),
                'end_time': fin_dt.isoformat(),
                'motif': exception.motif,
            })
            jour += timedelta(days=1)

    occurrences.sort(key=lambda o: o['start_time'])

    return Response({
        'debut': debut.isoformat(),
        'fin': fin.isoformat(),
        'gardes': occurrences,
    })


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
        self._diffuser_si_garde(serializer.instance, 'cree')

    def perform_update(self, serializer):
        serializer.save()
        self._diffuser_si_garde(serializer.instance, 'modifie')

    def perform_destroy(self, instance):
        etait_garde = instance.type in (TypeCreneau.GARDE, TypeCreneau.ASTREINTE)
        service_id = instance.employe.service_id
        instance.delete()
        if etait_garde:
            diffuser_service(service_id, 'garde', 'supprime')

    @staticmethod
    def _diffuser_si_garde(creneau, action):
        # On ne notifie le calendrier que pour les créneaux qui y apparaissent
        # réellement (garde/astreinte) — un créneau "présentiel" classique ne
        # concerne pas le module Calendrier.
        if creneau.type in (TypeCreneau.GARDE, TypeCreneau.ASTREINTE):
            diffuser_service(creneau.employe.service_id, 'garde', action)

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
        self._diffuser_si_garde(serializer.instance)

    def perform_update(self, serializer):
        serializer.save()
        self._diffuser_si_garde(serializer.instance)

    def perform_destroy(self, instance):
        etait_garde_validee = instance.type == TypeException.GARDE and instance.statut == StatutException.VALIDE
        service_id = instance.employe.service_id
        instance.delete()
        if etait_garde_validee:
            diffuser_service(service_id, 'garde', 'supprime')

    @staticmethod
    def _diffuser_si_garde(exception):
        # Seule une exception GARDE *validée* apparaît réellement dans le
        # calendrier (cf. gardes_planning) — une demande encore en attente ou
        # rejetée n'a rien à y notifier.
        if exception.type == TypeException.GARDE and exception.statut == StatutException.VALIDE:
            diffuser_service(exception.employe.service_id, 'garde', 'modifie')

    @action(detail=True, methods=['post'], permission_classes=[IsAdminOuMajor])
    def valider(self, request, pk=None):
        """Admin valide une demande de congé/absence."""
        exception = self.get_object()
        exception.valide = True
        exception.statut = StatutException.VALIDE
        exception.save()
        self._diffuser_si_garde(exception)
        return Response(ExceptionSerializer(exception).data)

    @action(detail=True, methods=['post'], permission_classes=[IsAdminOuMajor])
    def rejeter(self, request, pk=None):
        """Admin rejette une demande."""
        exception = self.get_object()
        etait_garde_validee = exception.type == TypeException.GARDE and exception.statut == StatutException.VALIDE
        exception.valide = False
        exception.statut = StatutException.REJETE
        exception.save()
        if etait_garde_validee:
            # Elle disparaît du calendrier — on notifie quand même pour que
            # le client la retire de son affichage.
            diffuser_service(exception.employe.service_id, 'garde', 'supprime')
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

        # Fallback démo/test : si la majeure ou le chef de service n'a pas
        # encore assigné ce poste, on ne bloque pas la vue infirmier — on
        # répartit automatiquement les patients actuellement hospitalisés du
        # service entre ses infirmiers (round-robin, idempotent) et on relit
        # ensuite les assignations de CETTE infirmière.
        auto_assigne = False
        if not assignations.exists() and emp.service_id:
            if repartir_patients_hospitalises(emp.service_id, date_courante, shift_courant):
                auto_assigne = True
                assignations = AssignationPatient.objects.select_related('patient', 'service').filter(
                    infirmier=emp, date=date_courante, shift=shift_courant,
                )

        return Response({
            'date': date_courante,
            'shift': shift_courant,
            'shift_label': dict(AssignationPatient._meta.get_field('shift').choices)[shift_courant],
            'auto_assigne': auto_assigne,
            'assignations': AssignationPatientSerializer(assignations, many=True).data,
        })