from rest_framework.permissions import IsAuthenticated
from comptes.permissions import get_employe


class PeutVoirMorgue(IsAuthenticated):
    """
    Lecture des dossiers de décès/autopsie : équipe médicale + secrétariat
    (coordination avec la famille pour la remise du corps). Le laborantin
    n'a pas de raison d'y accéder.
    """
    ROLES = {'admin', 'medecin', 'infirmier', 'secretaire'}

    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        if request.user.is_superuser:
            return True
        emp = get_employe(request.user)
        return emp is not None and emp.role in self.ROLES
