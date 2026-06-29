from rest_framework.permissions import IsAuthenticated

class IsAdminRole(IsAuthenticated):
    """Réservé aux administrateurs."""

    def has_permission(self , request , view):
        if not super().has_permission(request , view):
            return False
        try:
            return request.user.employe.role == 'admin'
        except Exception:
            return request.user.is_superuser


class IsMedecinOuInfirmier(IsAuthenticated):
    """Médecins et infirmiers — saisie et lecture des constantes."""

    ROLES_AUTORISES = {'medecin' , 'infirmier'}

    def has_permission(self, request, view):
        if not super().has_permission(request,view):
            return False
        try:
            return request.user.employe.role in self.ROLES_AUTORISES
        except:
            return request.user.is_superuser

class IsLectureAutorisee(IsAuthenticated):
    """
    Lecture des signes vitaux : tous les rôles sauf secrétaire.
    Un secrétaire planifie les RDV — il n'a pas besoin de voir les constantes.
    """
    ROLES_LECTURE = {'admin', 'medecin', 'infirmier', 'laborantin'}

    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        try:
            return request.user.employe.role in self.ROLES_LECTURE
        except Exception:
            return request.user.is_superuser
