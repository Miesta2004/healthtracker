import type { TypeEvenementRdv, StatutRendezVous, EvenementPlanning } from '../../types'
import {
    Stethoscope, Scissors, Users, ShieldAlert, HeartPulse, CalendarClock,
    type LucideIcon,
} from 'lucide-react'

// Fenêtre de récupération pour la vue Agenda (liste "à venir") — au-delà,
// l'utilisateur peut naviguer par Semaine/Mois pour aller plus loin.
export const AGENDA_JOURS_A_VENIR = 60

// ─── Grille horaire ──────────────────────────────────────────────────────────
// Grille complète 00:00 – 24:00, avec un pas de 30 minutes pour la création
// de créneaux (les vues par défaut scrollent automatiquement vers les heures
// ouvrées pour éviter de partir de minuit à chaque ouverture).
export const HEURE_DEBUT_GRILLE = 0
export const HEURE_FIN_GRILLE = 24 // borne exclusive (minuit le lendemain)
export const PX_PAR_HEURE = 72
export const PX_PAR_DEMI_HEURE = PX_PAR_HEURE / 2
export const PX_PAR_MINUTE = PX_PAR_HEURE / 60
// Heure vers laquelle la grille scrolle par défaut à l'ouverture.
export const HEURE_SCROLL_INITIAL = 7

export function minutesDepuisDebutGrille(date: Date): number {
    return (date.getHours() - HEURE_DEBUT_GRILLE) * 60 + date.getMinutes()
}

export function heuresGrille(): number[] {
    const heures: number[] = []
    for (let h = HEURE_DEBUT_GRILLE; h < HEURE_FIN_GRILLE; h++) heures.push(h)
    return heures
}

// ─── Types d'événement : couleur + icône ────────────────────────────────────
// Palette calée sur les maquettes fournies : blocs en aplat pastel (pas de
// simple liseré), avec une bordure légèrement plus soutenue de la même
// teinte. `equipe` déclenche la puce "équipe" affichée sur les blocs
// interventions/gardes dans la grille.
interface TypeConfig {
    label: string
    Icon: LucideIcon
    text: string     // couleur du texte / icônes sur le bloc
    bg: string       // fond en aplat du bloc événement
    border: string   // liseré fin, même teinte un cran plus soutenu
    equipe?: boolean
}

export const TYPE_EVENEMENT_CONFIG: Record<TypeEvenementRdv, TypeConfig> = {
    consultation: {
        label: 'Consultation',
        Icon: Stethoscope,
        text: '#15803D',
        bg: '#DCFCE7',
        border: '#86EFAC',
    },
    intervention: {
        label: 'Intervention',
        Icon: Scissors,
        text: '#1D4ED8',
        bg: '#DBEAFE',
        border: '#93C5FD',
        equipe: true,
    },
    reunion: {
        label: "Réunion d'équipe",
        Icon: Users,
        text: '#6D28D9',
        bg: '#EDE9FE',
        border: '#C4B5FD',
    },
    garde: {
        label: 'Garde chirurgicale',
        Icon: ShieldAlert,
        text: '#1D4ED8',
        bg: '#DBEAFE',
        border: '#93C5FD',
        equipe: true,
    },
    visite_postoperatoire: {
        label: 'Suivi postopératoire',
        Icon: HeartPulse,
        text: '#B91C1C',
        bg: '#FEE2E2',
        border: '#FCA5A5',
    },
    autre: {
        label: 'Autre',
        Icon: CalendarClock,
        text: '#4B5563',
        bg: '#F3F4F6',
        border: '#D1D5DB',
    },
}

export const STATUT_LABELS: Record<StatutRendezVous, string> = {
    planifie: 'Planifié',
    confirme: 'Confirmé',
    termine: 'Terminé',
    annule: 'Annulé',
}

// ─── Dates ───────────────────────────────────────────────────────────────────
export function toISODate(d: Date): string {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
}

export function debutSemaine(d: Date): Date {
    const copie = new Date(d)
    const jour = (copie.getDay() + 6) % 7 // lundi = 0
    copie.setDate(copie.getDate() - jour)
    copie.setHours(0, 0, 0, 0)
    return copie
}

export function joursDeSemaine(ancre: Date): Date[] {
    const lundi = debutSemaine(ancre)
    return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(lundi)
        d.setDate(lundi.getDate() + i)
        return d
    })
}

// Grille du mois : du lundi de la semaine contenant le 1er, jusqu'au dimanche
// de la semaine contenant le dernier jour du mois — inclut donc quelques
// jours du mois précédent/suivant, affichés en grisé.
export function joursGrilleMois(ancre: Date): Date[] {
    const premierDuMois = new Date(ancre.getFullYear(), ancre.getMonth(), 1)
    const dernierDuMois = new Date(ancre.getFullYear(), ancre.getMonth() + 1, 0)
    const debut = debutSemaine(premierDuMois)
    const fin = debutSemaine(dernierDuMois)
    fin.setDate(fin.getDate() + 6)

    const jours: Date[] = []
    const curseur = new Date(debut)
    while (curseur.getTime() <= fin.getTime()) {
        jours.push(new Date(curseur))
        curseur.setDate(curseur.getDate() + 1)
    }
    return jours
}

export function estAujourdhui(d: Date): boolean {
    const aujourdhui = new Date()
    return d.toDateString() === aujourdhui.toDateString()
}

// Position (en px) de l'heure actuelle dans la grille, ou null si hors bornes
// (avant HEURE_DEBUT_GRILLE ou après HEURE_FIN_GRILLE) — utilisé pour le trait
// "maintenant" affiché sur la colonne du jour courant, comme dans les
// maquettes.
export function positionHeureActuelle(): number | null {
    const maintenant = new Date()
    const minutes = minutesDepuisDebutGrille(maintenant)
    const minutesMax = (HEURE_FIN_GRILLE - HEURE_DEBUT_GRILLE) * 60
    if (minutes < 0 || minutes > minutesMax) return null
    return minutes * PX_PAR_MINUTE
}

export function memeJour(a: Date, b: Date): boolean {
    return a.toDateString() === b.toDateString()
}

export function dateACreneauHoraire(jour: Date, heure: number, minute: number): Date {
    return new Date(jour.getFullYear(), jour.getMonth(), jour.getDate(), heure, minute)
}

// ─── Vue Agenda : regroupement chronologique ────────────────────────────────
export interface GroupeJourAgenda {
    date: Date
    items: EvenementPlanning[]
}
export interface SectionAgenda {
    label: string
    groupes: GroupeJourAgenda[]
}

export function grouperAgenda(evenements: EvenementPlanning[]): SectionAgenda[] {
    const aujourdhui = new Date()
    aujourdhui.setHours(0, 0, 0, 0)
    const demain = new Date(aujourdhui)
    demain.setDate(demain.getDate() + 1)
    const finSemaine = joursDeSemaine(aujourdhui)[6]
    finSemaine.setHours(23, 59, 59, 999)

    const tries = [...evenements]
        .filter(e => new Date(e.start_time) >= aujourdhui)
        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())

    const seaux: Record<string, EvenementPlanning[]> = {
        "Aujourd'hui": [],
        'Demain': [],
        'Cette semaine': [],
        'À venir': [],
    }
    for (const e of tries) {
        const d = new Date(e.start_time)
        if (memeJour(d, aujourdhui)) seaux["Aujourd'hui"].push(e)
        else if (memeJour(d, demain)) seaux['Demain'].push(e)
        else if (d <= finSemaine) seaux['Cette semaine'].push(e)
        else seaux['À venir'].push(e)
    }

    const grouperParJour = (items: EvenementPlanning[]): GroupeJourAgenda[] => {
        const map = new Map<string, GroupeJourAgenda>()
        for (const e of items) {
            const d = new Date(e.start_time)
            const cle = toISODate(d)
            if (!map.has(cle)) map.set(cle, { date: d, items: [] })
            map.get(cle)!.items.push(e)
        }
        return [...map.values()]
    }

    return Object.entries(seaux)
        .filter(([, items]) => items.length > 0)
        .map(([label, items]) => ({ label, groupes: grouperParJour(items) }))
}

// ─── Disposition des événements superposés ──────────────────────────────────
// Algorithme glouton simple : place chaque événement dans la première
// colonne libre parmi celles déjà ouvertes pour le groupe de chevauchement
// courant, puis calcule après-coup le nombre total de colonnes du groupe
// (pour que tous les événements du groupe partagent la même largeur).
export interface EvenementDispose<T> {
    evenement: T
    colonnes: number
    indexColonne: number
}

export function disposerEvenements<T extends { start_time: string; end_time: string }>(
    evenements: T[]
): EvenementDispose<T>[] {
    const tries = [...evenements].sort(
        (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    )

    const resultats: EvenementDispose<T>[] = []
    let groupeCourant: EvenementDispose<T>[] = []
    let finGroupe = -Infinity

    const cloturerGroupe = () => {
        if (groupeCourant.length === 0) return
        const maxColonne = Math.max(...groupeCourant.map(e => e.indexColonne)) + 1
        groupeCourant.forEach(e => { e.colonnes = maxColonne })
        resultats.push(...groupeCourant)
        groupeCourant = []
    }

    for (const evt of tries) {
        const debut = new Date(evt.start_time).getTime()
        const fin = new Date(evt.end_time).getTime()

        if (debut >= finGroupe) {
            cloturerGroupe()
            finGroupe = fin
        } else {
            finGroupe = Math.max(finGroupe, fin)
        }

        const colonnesOccupees = new Set(
            groupeCourant
                .filter(e => {
                    const eDebut = new Date(e.evenement.start_time).getTime()
                    const eFin = new Date(e.evenement.end_time).getTime()
                    return debut < eFin && fin > eDebut
                })
                .map(e => e.indexColonne)
        )
        let indexColonne = 0
        while (colonnesOccupees.has(indexColonne)) indexColonne++

        groupeCourant.push({ evenement: evt, colonnes: 1, indexColonne })
    }
    cloturerGroupe()

    return resultats
}
