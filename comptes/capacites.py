"""
Capacités des rôles — source unique de vérité.

C'est le SEUL fichier à modifier quand un rôle change ou qu'on en ajoute un.
Aucun autre fichier du projet (permissions, vues, limit_choices_to) ne doit
tester `employe.role == '...'` directement pour une question de type
« a-t-il le droit de faire X ? » — il doit interroger une capacité via
`Employe.a_la_capacite()`.

Deux notions bien distinctes, à ne pas confondre :
- une CAPACITÉ répond à « peut-il faire l'action ? » (ce module).
- le SCOPE répond à « sur quels objets précisément ? » (reste dans les
  permissions DRF elles-mêmes, ex. same_service() dans permissions.py,
  ou la branche BLOC_GERER dans PeutGererOperation.has_object_permission).
"""


class Capacite:
    PATIENTS_CREER          = 'patients.creer'
    ACTES_MEDICAUX_GERER    = 'actes_medicaux.gerer'      # consultations + demandes d'analyses
    SIGNES_VITAUX_SAISIR    = 'signes_vitaux.saisir'
    DOSSIER_MEDICAL_LIRE    = 'dossier_medical.lire'
    RDV_LIRE                = 'rdv.lire'
    MORGUE_LIRE             = 'morgue.lire'

    # Exclusives au Chef de Chirurgie
    BLOC_GERER              = 'bloc.gerer'                # transversal, indépendant du service
    HABILITATIONS_GERER     = 'habilitations.gerer'
    AUTOPSIE_VALIDER_PERIOP = 'autopsie.valider_perioperatoire'

    # Exclusives à l'admin (chef de service) — non converties en permissions
    # génériques pour l'instant : IsAdminRole reste un contrôle par rôle unique
    # + same_service, ça n'a pas besoin de la couche de capacités. Gardées ici
    # à titre de documentation / cohérence pour un futur rôle qui en hériterait.
    RH_GERER      = 'rh.gerer'
    SERVICE_GERER = 'service.gerer'


# Capacités propres à chaque rôle, AVANT application de l'héritage.
# Reproduit exactement les ROLES{} actuels de comptes/permissions.py et
# consorts — donc aucun changement de comportement pour les rôles existants.
CAPACITES_PAR_ROLE = {
    'admin': {
        Capacite.RH_GERER, Capacite.SERVICE_GERER,
        Capacite.ACTES_MEDICAUX_GERER, Capacite.SIGNES_VITAUX_SAISIR,
        Capacite.PATIENTS_CREER, Capacite.DOSSIER_MEDICAL_LIRE,
        Capacite.RDV_LIRE, Capacite.MORGUE_LIRE,
    },
    'medecin': {
        Capacite.ACTES_MEDICAUX_GERER, Capacite.SIGNES_VITAUX_SAISIR,
        Capacite.PATIENTS_CREER, Capacite.DOSSIER_MEDICAL_LIRE,
        Capacite.RDV_LIRE, Capacite.MORGUE_LIRE,
    },
    'infirmier': {
        Capacite.SIGNES_VITAUX_SAISIR, Capacite.DOSSIER_MEDICAL_LIRE,
        Capacite.RDV_LIRE, Capacite.MORGUE_LIRE,
    },
    'secretaire': {
        Capacite.PATIENTS_CREER, Capacite.RDV_LIRE, Capacite.MORGUE_LIRE,
    },
    'laborantin': {
        Capacite.DOSSIER_MEDICAL_LIRE,
    },

    # Uniquement ses capacités EXCLUSIVES — tout le reste (ACTES_MEDICAUX_GERER,
    # SIGNES_VITAUX_SAISIR, PATIENTS_CREER, DOSSIER_MEDICAL_LIRE, RDV_LIRE,
    # MORGUE_LIRE) vient automatiquement de l'héritage ci-dessous.
    'chef_chirurgie': {
        Capacite.BLOC_GERER,
        Capacite.HABILITATIONS_GERER,
        Capacite.AUTOPSIE_VALIDER_PERIOP,
    },
}

# Héritage entre rôles — c'est ce qui permet à 'chef_chirurgie' de récupérer
# transparentement tous les droits de 'medecin' sans les lister à la main.
# Extensible : ex. {'chef_de_pole': 'admin'} plus tard, sans toucher au reste.
HERITE_DE = {
    'chef_chirurgie': 'medecin',
}


def capacites_du_role(role: str) -> set:
    """Capacités effectives d'un rôle, héritage compris (récursif)."""
    capacites = set(CAPACITES_PAR_ROLE.get(role, set()))
    parent = HERITE_DE.get(role)
    if parent:
        capacites |= capacites_du_role(parent)
    return capacites


def roles_avec_capacite(capacite: str) -> list:
    """
    Liste des valeurs de rôle possédant une capacité donnée — utile pour un
    `limit_choices_to` callable ou un filtre de queryset (ex. stats par rôle),
    plutôt que de lister des rôles en dur à ces endroits.
    """
    from .models import Role
    return [r for r in Role.values if capacite in capacites_du_role(r)]