from rest_framework.permissions import IsAuthenticated


def get_employe(user):
    """Helper — retourne l'Employe lié au user, ou None."""
    try:
        return user.employe
    except Exception:
        return None


class IsAdminRole(IsAuthenticated):
    """Chef de service (admin) ou superuser."""

    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        if request.user.is_superuser:
            return True
        emp = get_employe(request.user)
        return emp is not None and emp.role == 'admin'


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