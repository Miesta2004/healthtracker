from rest_framework.permissions import IsAuthenticated
from .capacites import Capacite


def get_employe(user):
    """Helper — retourne l'Employe lié au user, ou None."""
    try:
        return user.employe
    except Exception:
        return None


class RequiertCapacite(IsAuthenticated):
    """
    Permission générique paramétrée par une capacité (voir comptes/capacites.py).
    Ne teste jamais un nom de rôle en dur : c'est `Employe.a_la_capacite()` qui
    résout, héritage entre rôles compris. Sert de base à toutes les permissions
    « médecin/admin/etc. » ci-dessous, qui ne sont donc plus que des alias
    nommés d'une capacité — plus jamais besoin d'y toucher pour un changement
    de rôle, seul comptes/capacites.py évolue.
    """
    capacite = None

    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        if request.user.is_superuser:
            return True
        emp = get_employe(request.user)
        return emp is not None and emp.a_la_capacite(self.capacite)


def requiert(capacite: str):
    """Factory — fabrique une classe RequiertCapacite pour une capacité donnée."""
    return type(f'Requiert_{capacite}', (RequiertCapacite,), {'capacite': capacite})


def same_service(emp, obj):
    """
    Vérifie qu'un objet appartient au même service qu'un employé (chef de
    service). `obj` peut être : un Service (son id fait foi), un Employe ou
    tout modèle avec un champ `service`, un modèle avec un champ `employe`
    (ex. CreneauDisponibilite, ExceptionDisponibilite), ou un modèle sans
    service propre mais rattaché à un patient (ex. RendezVous), dont le
    service se déduit alors de `obj.patient.service`.
    """
    from services.models import Service

    if isinstance(obj, Service):
        target_service_id = obj.id
    elif hasattr(obj, 'service_id'):
        target_service_id = obj.service_id
    elif hasattr(obj, 'employe'):
        target_service_id = obj.employe.service_id
    elif hasattr(obj, 'patient') and obj.patient is not None:
        target_service_id = obj.patient.service_id
    else:
        target_service_id = None

    return (
            emp.service_id is not None
            and target_service_id is not None
            and target_service_id == emp.service_id
    )


class IsAdminRole(IsAuthenticated):
    """
    Chef de service (rôle `admin`), dont les droits sont limités à SON
    service, ou superuser (admin général — ex. directeur d'hôpital), qui n'a
    aucune restriction.
    """

    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        if request.user.is_superuser:
            return True
        emp = get_employe(request.user)
        return emp is not None and emp.role == 'admin'

    def has_object_permission(self, request, view, obj):
        if request.user.is_superuser:
            return True
        emp = get_employe(request.user)
        if emp is None or emp.role != 'admin':
            return False
        return same_service(emp, obj)


class IsSuperUser(IsAuthenticated):
    """Réservé à l'admin général (superuser) — ex. création de services."""

    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        return bool(request.user.is_superuser)


def is_major(emp):
    """Un infirmier désigné infirmière/infirmier major de son service."""
    return bool(emp and emp.role == 'infirmier' and getattr(emp, 'est_major', False))


class IsAdminOuMajor(IsAuthenticated):
    """
    Chef de service (admin, tout son service) OU infirmier(ère) major
    (son service, mais uniquement pour des ressources concernant des
    infirmiers — assignations patients, plannings/congés infirmiers).
    La restriction "concerne bien un infirmier" est vérifiée ici quand
    l'objet a un `role` (Employe) ou un `employe`/`infirmier` avec un rôle.
    """

    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        if request.user.is_superuser:
            return True
        emp = get_employe(request.user)
        return emp is not None and (emp.role == 'admin' or is_major(emp))

    def has_object_permission(self, request, view, obj):
        if request.user.is_superuser:
            return True
        emp = get_employe(request.user)
        if emp is None or not same_service(emp, obj):
            return False
        if emp.role == 'admin':
            return True
        if is_major(emp):
            cible = getattr(obj, 'infirmier', None) or getattr(obj, 'employe', None) or obj
            return getattr(cible, 'role', None) == 'infirmier'
        return False


class IsMedecinOuAdmin(RequiertCapacite):
    """Médecin, chef de service, ou tout rôle héritant de médecin (ex. chef de chirurgie)."""
    capacite = Capacite.ACTES_MEDICAUX_GERER


class IsMedecinOuInfirmier(RequiertCapacite):
    """Médecins et infirmiers (+ rôles en héritant) — saisie et lecture des signes vitaux."""
    capacite = Capacite.SIGNES_VITAUX_SAISIR


class IsLaborantin(IsAuthenticated):
    """Laborantin uniquement."""

    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        if request.user.is_superuser:
            return True
        emp = get_employe(request.user)
        return emp is not None and emp.role == 'laborantin'


class PeutCreerPatient(RequiertCapacite):
    """
    Création d'un dossier patient : secrétaire, médecin, chef de service (ou
    tout rôle héritant de médecin/secrétaire) uniquement. Corrige un écart
    entre le commentaire de PatientViewSet ("l'infirmier et le laborantin ne
    peuvent pas créer") et le code réel, qui ne restreignait jusqu'ici que la
    suppression.
    """
    capacite = Capacite.PATIENTS_CREER


class PeutGenererDocument(RequiertCapacite):
    """
    Génération d'un document à partir d'un modèle (compte rendu, ordonnance,
    certificat...) pour un patient — médecin/chef de service (ou tout rôle
    héritant). Distincte de la gestion de la bibliothèque de modèles.
    """
    capacite = Capacite.DOCUMENTS_GENERER


class PeutGererModeles(RequiertCapacite):
    """
    Créer/modifier/supprimer un modèle de document (Paramètres > Modèles de
    documents) — tâche de paramétrage réservée au chef de service/admin
    général, à l'écart du flux médical courant.
    """
    capacite = Capacite.DOCUMENTS_GERER_MODELES


class PeutAdmettrePatient(RequiertCapacite):
    """
    Formulaire unique de création d'un dossier patient par le Service des
    Admissions (POST /patients/admission/, y compris le mode 'Urgence Vitale
    / Identité Provisoire') et régularisation ultérieure d'une identité
    provisoire (PATCH /patients/{id}/regulariser/) — agent d'admission (ou
    tout rôle héritant), au niveau global, sans restriction de service.
    """
    capacite = Capacite.ADMISSIONS_GERER


class PeutTransfererPatient(RequiertCapacite):
    """
    Affecte/réaffecte un patient à un service de destination
    (PATCH /patients/{id}/transferer/) — que ce soit un premier routage par
    l'agent d'admission (avant confirmation par le service) ou un transfert
    mi-parcours par un médecin/secrétaire suite à un examen ou une
    coordination téléphonique entre services.
    """
    capacite = Capacite.PATIENTS_TRANSFERER


class PeutConfirmerArrivee(RequiertCapacite):
    """
    « Confirmer l'arrivée » d'un patient orienté vers son service
    (PATCH /patients/{id}/confirmer-arrivee/) — réservée au secrétariat du
    service receveur (+ médecin, admin).
    """
    capacite = Capacite.PATIENTS_CONFIRMER_ARRIVEE


class PeutGererAccompagnants(RequiertCapacite):
    """
    Traçabilité des accompagnants (création, pointage entrée/sortie, contrôle
    d'accès) — réservée à l'agent d'admission (ou tout rôle héritant), qui
    tient le poste d'accueil/contrôle physique de l'établissement.
    """
    capacite = Capacite.ACCOMPAGNANTS_GERER


class IsLectureAutorisee(RequiertCapacite):
    """Tous les rôles médicaux sauf secrétaire."""
    capacite = Capacite.DOSSIER_MEDICAL_LIRE


class PeutVoirRendezVous(RequiertCapacite):
    """
    Lecture des rendez-vous : équipe médicale + secrétaire (qui les gère au
    quotidien). Le laborantin n'a pas besoin d'y accéder.
    """
    capacite = Capacite.RDV_LIRE


class PeutGererHabilitations(RequiertCapacite):
    """
    Création/modification/suppression d'une HabilitationService. Exclusif au
    Chef de Chirurgie (+ superuser). Volontairement SANS restriction
    same_service : une habilitation concerne par nature un chirurgien
    d'un service tiers qui demande à opérer ailleurs — la contraindre au
    service du demandeur ou du service ciblé n'aurait pas de sens ici,
    contrairement à IsAdminRole.
    """
    capacite = Capacite.HABILITATIONS_GERER


class PeutGererFacturation(RequiertCapacite):
    """
    Gestion des factures (créer/modifier les lignes d'actes, mettre en place
    des échéanciers) — réservée au facturier (et à l'admin/chef de service,
    via l'héritage des capacités). Aucun droit sur Paiement, séparation des
    tâches volontaire avec caissier.
    """
    capacite = Capacite.FACTURATION_GERER


class PeutEncaisserPaiement(RequiertCapacite):
    """
    Encaissement et édition des reçus — réservé au caissier. Accès en lecture
    complet aux factures (le patient doit comprendre ce qu'il paie), mais
    aucun droit de modifier Facture/LigneFacture/EcheancierPaiement.
    """
    capacite = Capacite.PAIEMENTS_ENCAISSER


class PeutLireFacturation(IsAuthenticated):
    """
    Lecture des factures (données complètes) — ouverte à la fois au facturier
    et au caissier (et à l'admin). Contrairement aux permissions d'écriture
    (PeutGererFacturation vs PeutEncaisserPaiement qui sont mutuellement
    exclusives), la lecture ne doit pas être cloisonnée : le caissier doit
    voir les détails complets au guichet, et le facturier doit voir ce qui
    a été payé.
    """
    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        if request.user.is_superuser:
            return True
        emp = get_employe(request.user)
        if emp is None:
            return False
        # Autorise la lecture à FACTURATION_GERER (facturier) OU PAIEMENTS_ENCAISSER (caissier)
        return emp.a_la_capacite(Capacite.FACTURATION_GERER) or emp.a_la_capacite(Capacite.PAIEMENTS_ENCAISSER)


class IsInSameService(IsAuthenticated):
    """
    Vérifie que l'objet demandé appartient au même service que l'utilisateur.
    À utiliser en combinaison avec has_object_permission sur les ViewSets.
    """

    def has_permission(self, request, view):
        return super().has_permission(request, view)

    def has_object_permission(self, request, view, obj):
        if request.user.is_superuser:
            return True
        emp = get_employe(request.user)
        if emp is None:
            return False
        # obj peut être un Patient, une Consultation, etc. avec .service ou .patient.service
        service_id = getattr(obj, 'service_id', None)
        if service_id is None:
            patient = getattr(obj, 'patient', None)
            if patient:
                service_id = getattr(patient, 'service_id', None)
        return service_id is not None and service_id == emp.service_id