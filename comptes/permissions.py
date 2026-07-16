from rest_framework.permissions import IsAuthenticated


def get_employe(user):
    """Helper — retourne l'Employe lié au user, ou None."""
    try:
        return user.employe
    except Exception:
        return None


def same_service(emp, obj):
    """
    Vérifie qu'un objet appartient au même service qu'un employé (chef de
    service). `obj` peut être : un Service (son id fait foi), un Employe ou
    tout modèle avec un champ `service`, ou tout modèle avec un champ
    `employe` (ex. CreneauDisponibilite, ExceptionDisponibilite).
    """
    from services.models import Service

    if isinstance(obj, Service):
        target_service_id = obj.id
    elif hasattr(obj, 'service_id'):
        target_service_id = obj.service_id
    elif hasattr(obj, 'employe'):
        target_service_id = obj.employe.service_id
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


class IsMedecinOuAdmin(IsAuthenticated):
    """Médecin ou chef de service."""

    ROLES = {'medecin', 'admin'}

    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        if request.user.is_superuser:
            return True
        emp = get_employe(request.user)
        return emp is not None and emp.role in self.ROLES


class IsMedecinOuInfirmier(IsAuthenticated):
    """Médecins et infirmiers — saisie et lecture des signes vitaux."""

    ROLES = {'medecin', 'infirmier', 'admin'}

    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        if request.user.is_superuser:
            return True
        emp = get_employe(request.user)
        return emp is not None and emp.role in self.ROLES


class IsLaborantin(IsAuthenticated):
    """Laborantin uniquement."""

    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        if request.user.is_superuser:
            return True
        emp = get_employe(request.user)
        return emp is not None and emp.role == 'laborantin'


class IsLectureAutorisee(IsAuthenticated):
    """Tous les rôles médicaux sauf secrétaire."""

    ROLES = {'admin', 'medecin', 'infirmier', 'laborantin'}

    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        if request.user.is_superuser:
            return True
        emp = get_employe(request.user)
        return emp is not None and emp.role in self.ROLES


class PeutVoirRendezVous(IsAuthenticated):
    """
    Lecture des rendez-vous : équipe médicale + secrétaire (qui les gère au
    quotidien). Le laborantin n'a pas besoin d'y accéder.
    """

    ROLES = {'admin', 'medecin', 'infirmier', 'secretaire'}

    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        if request.user.is_superuser:
            return True
        emp = get_employe(request.user)
        return emp is not None and emp.role in self.ROLES


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