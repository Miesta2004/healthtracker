import type { IndicateurQualite, EvenementIndesirable, EvolutionQualitePoint } from '../types'

// ─────────────────────────────────────────────────────────────────────────
// Seul reste ici ce qui n'a AUCUNE donnée réelle en base : la Qualité &
// Sécurité. Interventions, occupation des lits et performance par chirurgien
// sont désormais branchées sur de vraies données (voir OngletVueEnsemble,
// OngletActiviteService, OngletChirurgien + les endpoints
// /api/operations/stats/ et /api/services/vue-ensemble/).
// ─────────────────────────────────────────────────────────────────────────

export const MOCK_INDICATEURS_QUALITE: IndicateurQualite[] = [
    { label: "Taux d'annulation",           valeur: '4,2%',  delta: '-0,6%', hausse: false, bon: true },
    { label: 'Taux de réadmission (30j)',   valeur: '6,1%',  delta: '+0,3%', hausse: true,  bon: false },
    { label: "Taux d'infection postopératoire", valeur: '1,2%', delta: '+0,1%', hausse: true, bon: false },
    { label: "Taux de succès des interventions", valeur: '98,4%', delta: '+0,6%', hausse: true, bon: true },
]

export const MOCK_EVENEMENTS_INDESIRABLES: EvenementIndesirable[] = [
    { date: '31/05/2025', type: 'Chute patient',       service: 'Chirurgie Générale', gravite: 'moderee', statut: 'ouvert' },
    { date: '30/05/2025', type: 'Erreur médication',   service: 'Urologie',           gravite: 'mineure', statut: 'en_cours' },
    { date: '30/05/2025', type: 'Retard prise en charge', service: 'Urgences',        gravite: 'moderee', statut: 'cloture' },
]

export const MOCK_EVOLUTION_QUALITE: EvolutionQualitePoint[] = [
    { semaine: 'S18', infection: 1.4, reamission: 5.8, annulation: 4.8 },
    { semaine: 'S19', infection: 1.3, reamission: 6.0, annulation: 4.5 },
    { semaine: 'S20', infection: 1.1, reamission: 5.6, annulation: 4.0 },
    { semaine: 'S21', infection: 1.2, reamission: 6.3, annulation: 4.3 },
    { semaine: 'S22', infection: 1.2, reamission: 6.1, annulation: 4.2 },
]