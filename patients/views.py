from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Q
from django.utils import timezone
from datetime import datetime

from .models import Patient, Accompagnant
from .serializers import (
    PatientSerializer, PatientListSerializer,
    AdmissionSerializer, RegularisationSerializer, TransfertSerializer,
    PatientSearchSerializer, BadgeSerializer, AccompagnantBadgeSerializer,
    AccompagnantSerializer,
)
from comptes.permissions import (
    get_employe, PeutAdmettrePatient,
    PeutTransfererPatient, PeutConfirmerArrivee, PeutGererAccompagnants,
)
from comptes.capacites import Capacite


class PatientViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'list':
            return PatientListSerializer
        return PatientSerializer

    def get_queryset(self):
        user = self.request.user
        base_qs = Patient.objects.select_related('service', 'medecin_referent')

        if user.is_superuser:
            return base_qs.all()

        emp = get_employe(user)
        if emp is None:
            return Patient.objects.none()

        role = emp.role
        q = self.request.query_params.get('q', '').strip()

        # ── Infirmier : accès uniquement via recherche ciblée dans son service ──
        if role == 'infirmier':
            if self.action in ('retrieve', 'update', 'partial_update', 'ajouter_antecedent'):
                return base_qs.filter(service=emp.service) if emp.service else base_qs.none()
            if not q:
                return Patient.objects.none()
            qs = base_qs.filter(service=emp.service) if emp.service else base_qs
            return qs.filter(
                Q(nom__icontains=q) | Q(prenom__icontains=q) | Q(numero_dossier__icontains=q)
            )

        # ── Agent d'admission : vue globale, sans restriction de service ──
        # (dossiers en attente de validation à router/ré-orienter, régularisation
        # d'identités provisoires, recherche de patients déjà admis).
        if role == 'agent_admission':
            qs = base_qs.all()
            if q:
                qs = qs.filter(
                    Q(nom__icontains=q) | Q(prenom__icontains=q) |
                    Q(numero_dossier__icontains=q) | Q(telephone__icontains=q)
                )
            statut = self.request.query_params.get('statut_orientation')
            if statut:
                qs = qs.filter(statut_orientation=statut)
            return qs

        # ── Laborantin : patients avec demandes en cours ──
        if role == 'laborantin':
            from analyses.models import DemandeAnalyse
            patient_ids = DemandeAnalyse.objects.filter(
                statut__in=['en_attente', 'en_cours'],
            ).values_list('patient_id', flat=True).distinct()
            return base_qs.filter(id__in=patient_ids)

        # ── Secrétaire, médecin, admin ──
        # Visible si le patient est administrativement dans mon service (que ce
        # soit déjà confirmé ou encore en attente de validation — le service est
        # affecté DÈS la création dans le nouveau workflow, plus après coup),
        # OU s'il a une opération/hospitalisation active rattachée à mon service.
        if emp.service:
            qs = base_qs.filter(
                Q(service=emp.service) |
                Q(operations__service_chirurgie=emp.service, operations__statut__in=['programmee', 'en_cours']) |
                Q(hospitalisations__service=emp.service, hospitalisations__statut='en_cours')
            ).distinct()
        else:
            qs = base_qs.all()

        # Chef de Chirurgie (capacité BLOC_GERER, transversale) : en plus de ce
        # qui précède, il doit voir tout patient ayant une intervention
        # chirurgicale n'importe où dans l'hôpital — y compris hors de son
        # service, et sans filtrer par statut : une intervention TERMINEE ou
        # DECES_AU_BLOC reste pertinente (ex. dossier lié à une autopsie
        # péri-opératoire), pas seulement les interventions encore actives
        # couvertes par la règle générale ci-dessus.
        if emp.a_la_capacite(Capacite.BLOC_GERER):
            from chirurgie.models import InterventionChirurgicale
            patients_operes_ids = InterventionChirurgicale.objects.values_list('patient_id', flat=True).distinct()
            qs = (qs | base_qs.filter(id__in=patients_operes_ids)).distinct()

        # Filtrage par recherche si paramètre q présent
        if q:
            qs = qs.filter(
                Q(nom__icontains=q) |
                Q(prenom__icontains=q) |
                Q(numero_dossier__icontains=q) |
                Q(telephone__icontains=q)
            )

        # ?mine=true : uniquement les patients dont JE suis le médecin
        # référent — utilisé par le KPI "Patients suivis" du planning médecin,
        # plus précis que "tous les patients de mon service".
        if self.request.query_params.get('mine') == 'true':
            qs = qs.filter(medecin_referent=emp, actif=True)

        # ?statut_orientation=... : utilisé par la file d'attente du secrétariat
        # de service ("Patients orientés en attente d'accueil"), pour isoler
        # les patients tout juste orientés/transférés et pas encore confirmés,
        # plutôt que tout le portefeuille du service.
        statut = self.request.query_params.get('statut_orientation')
        if statut:
            qs = qs.filter(statut_orientation=statut)

        return qs

    def get_permissions(self):
        if self.action == 'admission':
            return [PeutAdmettrePatient()]
        if self.action == 'regulariser':
            return [PeutAdmettrePatient()]
        if self.action == 'transferer':
            return [PeutTransfererPatient()]
        if self.action == 'confirmer_arrivee':
            return [PeutConfirmerArrivee()]
        if self.action == 'search':
            return [PeutAdmettrePatient()]
        if self.action in ['destroy']:
            from comptes.permissions import IsAdminRole
            return [IsAdminRole()]
        return [IsAuthenticated()]

    def create(self, request, *args, **kwargs):
        """
        Création directe désactivée : il n'existe plus qu'UN SEUL formulaire de
        création de patient, le formulaire unique du Service des Admissions
        (POST /patients/admission/), qui inclut désormais le choix du service
        de destination et le bloc Accompagnants. Un service ne crée plus de
        patient "pour lui-même" en direct — ça contournait l'identitovigilance
        (pas de vérif anti-doublon, pas de contact d'urgence/mutuelle/
        accompagnant collectés).
        """
        return Response(
            {'detail': "Création désactivée ici — utilisez POST /api/patients/admission/."},
            status=405,
        )

    @action(detail=False, methods=['post'], url_path='admission')
    def admission(self, request):
        """
        POST /api/patients/admission/
        Formulaire unique de création par le Service des Admissions : état
        civil, coordonnées, contact d'urgence, couverture/mutuelle, service de
        destination ET accompagnant(s), en un seul appel. Voir
        AdmissionSerializer pour le détail des deux modes (normal / urgence).
        """
        serializer = AdmissionSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        patient = serializer.save()
        return Response(PatientSerializer(patient).data, status=201)

    @action(detail=True, methods=['patch'], url_path='regulariser')
    def regulariser(self, request, pk=None):
        """
        PATCH /api/patients/{id}/regulariser/
        « Régulariser / Compléter le dossier » d'une identité provisoire créée
        en mode urgence : saisie de la vraie identité (CNI, état civil final)
        sans toucher à l'historique médical déjà créé pendant la prise en
        charge d'urgence.
        """
        patient = self.get_object()
        serializer = RegularisationSerializer(patient, data=request.data, partial=True, context={'request': request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(PatientSerializer(patient).data)

    @action(detail=True, methods=['patch'], url_path='transferer')
    def transferer(self, request, pk=None):
        """
        PATCH /api/patients/{id}/transferer/
        Affecte/réaffecte le patient à un service de destination — premier
        routage par l'agent d'admission ou transfert mi-parcours par un
        médecin/secrétaire. Voir TransfertSerializer pour `confirmation_immediate`.
        """
        patient = self.get_object()
        serializer = TransfertSerializer(patient, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(PatientSerializer(patient).data)

    @action(detail=True, methods=['patch'], url_path='confirmer-arrivee')
    def confirmer_arrivee(self, request, pk=None):
        """
        PATCH /api/patients/{id}/confirmer-arrivee/
        Le secrétariat du service de destination confirme la prise en charge
        physique du patient orienté vers son service. Passe le statut de
        EN_ATTENTE_VALIDATION_SERVICE à ADMIS_DANS_LE_SERVICE. Les transitions
        suivantes (EN_CONSULTATION, HOSPITALISE) sont automatiques, pilotées
        par la création d'une Consultation ou d'une Hospitalisation — pas par
        cette action.
        """
        patient = self.get_object()
        if patient.statut_orientation != Patient.StatutOrientation.EN_ATTENTE_VALIDATION_SERVICE:
            return Response(
                {'detail': "Ce patient n'est pas en attente de validation par un service."},
                status=400,
            )
        patient.statut_orientation = Patient.StatutOrientation.ADMIS_DANS_LE_SERVICE
        patient.save(update_fields=['statut_orientation', 'date_modification'])
        return Response(PatientSerializer(patient).data)

    @action(detail=False, methods=['get'], url_path='search')
    def search(self, request):
        """
        GET /api/patients/search/?query=...
        Recherche multi-critères pour l'identitovigilance, avant création d'un
        nouveau dossier (éviter les doublons) : numéro de dossier, nom/prénom,
        date de naissance (format AAAA-MM-JJ), téléphone — ET recherche
        inversée par accompagnant (nom, prénom, téléphone, CNI). Volontairement
        globale (pas de restriction de service).
        """
        query = (request.query_params.get('query') or '').strip()
        if len(query) < 2:
            return Response(
                {'detail': "Le paramètre 'query' doit contenir au moins 2 caractères."},
                status=400,
            )

        filtre = (
                Q(numero_dossier__icontains=query) |
                Q(nom__icontains=query) | Q(prenom__icontains=query) |
                Q(telephone__icontains=query) |
                Q(accompagnants__nom__icontains=query) |
                Q(accompagnants__prenom__icontains=query) |
                Q(accompagnants__telephone__icontains=query) |
                Q(accompagnants__cni__icontains=query)
        )

        try:
            date_naissance = datetime.strptime(query, '%Y-%m-%d').date()
            filtre = filtre | Q(date_naissance=date_naissance)
        except ValueError:
            pass

        patients = (
            Patient.objects
            .select_related('service')
            .filter(filtre)
            .distinct()
            .order_by('nom', 'prenom')[:25]
        )
        serializer = PatientSearchSerializer(patients, many=True, context={'query': query})
        return Response(serializer.data)

    @action(detail=True, methods=['get'], url_path='badge')
    def badge(self, request, pk=None):
        """
        GET /api/patients/{id}/badge/
        Données prêtes à imprimer pour le badge / bracelet patient
        (identitovigilance). `qr_payload` est volontairement un identifiant
        stable et non-sensible (numéro de dossier + id interne) — jamais de
        donnée médicale encodée, pour rester lisible par un scanner générique
        sans exposer d'information clinique si le badge est perdu ou photographié.
        """
        patient = self.get_object()
        data = {
            'patient_id': patient.id,
            'numero_dossier': patient.numero_dossier,
            'nom': patient.nom,
            'prenom': patient.prenom,
            'date_naissance': patient.date_naissance,
            'sexe': patient.sexe,
            'service_nom': patient.service.nom if patient.service else 'Ambulatoire / Passage',
            'statut_orientation': patient.statut_orientation,
            'identite_provisoire': patient.identite_provisoire,
            'groupe_sanguin': patient.groupe_sanguin,
            'allergies': patient.allergies,
            'qr_payload': f"HT-PATIENT:{patient.numero_dossier}:{patient.id}",
            'genere_le': timezone.now(),
        }
        return Response(BadgeSerializer(data).data)

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


class AccompagnantViewSet(viewsets.ModelViewSet):
    """
    CRUD + pointage entrée/sortie des accompagnants — alimente la vue
    « Contrôle Accompagnants » (traçabilité des accès) de l'agent d'admission.
    """
    serializer_class = AccompagnantSerializer
    permission_classes = [PeutGererAccompagnants]

    def get_queryset(self):
        qs = Accompagnant.objects.select_related('patient', 'enregistre_par')

        patient_id = self.request.query_params.get('patient')
        if patient_id:
            qs = qs.filter(patient_id=patient_id)

        statut = self.request.query_params.get('statut')
        if statut:
            qs = qs.filter(statut=statut)

        q = self.request.query_params.get('q', '').strip()
        if q:
            qs = qs.filter(
                Q(nom__icontains=q) | Q(prenom__icontains=q) |
                Q(telephone__icontains=q) | Q(cni__icontains=q) |
                Q(patient__nom__icontains=q) | Q(patient__prenom__icontains=q)
            )

        return qs

    def perform_create(self, serializer):
        emp = get_employe(self.request.user)
        serializer.save(enregistre_par=emp)

    @action(detail=True, methods=['patch'], url_path='marquer-sortie')
    def marquer_sortie(self, request, pk=None):
        """Pointe la sortie de l'accompagnant (fin de son passage dans l'établissement)."""
        accompagnant = self.get_object()
        accompagnant.statut = Accompagnant.Statut.SORTI
        accompagnant.date_sortie = timezone.now()
        accompagnant.save(update_fields=['statut', 'date_sortie'])
        return Response(AccompagnantSerializer(accompagnant).data)

    @action(detail=True, methods=['patch'], url_path='marquer-present')
    def marquer_present(self, request, pk=None):
        """Annule un pointage de sortie fait par erreur (l'accompagnant est en fait toujours présent)."""
        accompagnant = self.get_object()
        accompagnant.statut = Accompagnant.Statut.PRESENT
        accompagnant.date_sortie = None
        accompagnant.save(update_fields=['statut', 'date_sortie'])
        return Response(AccompagnantSerializer(accompagnant).data)

    @action(detail=True, methods=['get'], url_path='badge')
    def badge(self, request, pk=None):
        """
        GET /api/accompagnants/{id}/badge/
        Pass d'accès imprimable pour l'accompagnant (identitovigilance) —
        même principe que le badge patient : QR non-sensible, pas de donnée
        médicale.
        """
        accompagnant = self.get_object()
        patient = accompagnant.patient
        data = {
            'accompagnant_id': accompagnant.id,
            'nom': accompagnant.nom,
            'prenom': accompagnant.prenom,
            'lien_parente': accompagnant.lien_parente,
            'patient_nom': patient.nom,
            'patient_prenom': patient.prenom,
            'patient_dossier': patient.numero_dossier,
            'statut': accompagnant.statut,
            'qr_payload': f"HT-ACCOMPAGNANT:{accompagnant.id}:{patient.numero_dossier}",
            'genere_le': timezone.now(),
        }
        return Response(AccompagnantBadgeSerializer(data).data)
