from comptes.permissions import get_employe, RequiertCapacite
from comptes.capacites import Capacite


class PeutGererOperation(RequiertCapacite):
    """
    Création/modification d'une Operation : médecin, chef de service, ou tout
    rôle héritant de médecin (ex. chef de chirurgie) ; superuser sans
    restriction.

    Au niveau objet :
    - le Chef de Chirurgie (capacité BLOC_GERER) agit de façon transversale,
      indépendamment de son propre service — c'est la seule dérogation au
      principe same_service utilisé partout ailleurs dans le projet ;
    - un chef de service (admin) reste limité à SON service ;
    - un médecin ne peut agir que sur les opérations où il est chirurgien
      principal ou membre de l'équipe.
    """

    capacite = Capacite.ACTES_MEDICAUX_GERER

    def has_object_permission(self, request, view, obj):
        if request.user.is_superuser:
            return True
        emp = get_employe(request.user)
        if emp is None:
            return False

        if emp.a_la_capacite(Capacite.BLOC_GERER):
            return True

        if emp.role == 'admin':
            return emp.service_id == obj.service_chirurgie_id

        if emp.role == 'medecin':
            est_chirurgien_principal = obj.chirurgien_principal_id == emp.id
            est_dans_equipe = obj.equipe.filter(pk=emp.pk).exists()
            return est_chirurgien_principal or est_dans_equipe

        return False