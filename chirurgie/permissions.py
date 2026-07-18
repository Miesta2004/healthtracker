from rest_framework.permissions import IsAuthenticated
from comptes.permissions import get_employe


class PeutGererOperation(IsAuthenticated):
    """
    Création/modification d'une Operation : médecin ou chef de service
    (rôle 'admin'), superuser sans restriction.

    Au niveau objet, un médecin qui n'est ni le chirurgien principal ni
    membre de l'équipe ne peut modifier l'opération que s'il est chef de
    service (admin) du service où elle a lieu — un médecin d'un autre
    service ne doit pas pouvoir modifier une opération qui ne le concerne pas.
    """

    ROLES = {'medecin', 'admin'}

    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        if request.user.is_superuser:
            return True
        emp = get_employe(request.user)
        return emp is not None and emp.role in self.ROLES

    def has_object_permission(self, request, view, obj):
        if request.user.is_superuser:
            return True
        emp = get_employe(request.user)
        if emp is None:
            return False

        if emp.role == 'admin':
            return emp.service_id == obj.service_chirurgie_id

        if emp.role == 'medecin':
            est_chirurgien_principal = obj.chirurgien_principal_id == emp.id
            est_dans_equipe = obj.equipe.filter(pk=emp.pk).exists()
            return est_chirurgien_principal or est_dans_equipe

        return False
