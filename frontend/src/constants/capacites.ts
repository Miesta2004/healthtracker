/**
 * Miroir des identifiants de capacité définis dans comptes/capacites.py.
 *
 * Seuls les NOMS sont dupliqués ici (comme RoleEmploye duplique déjà les
 * valeurs de Role côté backend) — jamais la logique de mapping
 * (CAPACITES_PAR_ROLE / HERITE_DE), qui reste calculée uniquement côté
 * serveur et exposée via Employe.capacites / CurrentUser.capacites.
 * Voir AuthContext.hasCapacite().
 */
export const Capacite = {
    PATIENTS_CREER: 'patients.creer',
    ACTES_MEDICAUX_GERER: 'actes_medicaux.gerer',
    SIGNES_VITAUX_SAISIR: 'signes_vitaux.saisir',
    DOSSIER_MEDICAL_LIRE: 'dossier_medical.lire',
    RDV_LIRE: 'rdv.lire',
    MORGUE_LIRE: 'morgue.lire',
    BLOC_GERER: 'bloc.gerer',
    HABILITATIONS_GERER: 'habilitations.gerer',
    AUTOPSIE_VALIDER_PERIOP: 'autopsie.valider_perioperatoire',
    RH_GERER: 'rh.gerer',
    SERVICE_GERER: 'service.gerer',
} as const

export type CapaciteValue = typeof Capacite[keyof typeof Capacite]