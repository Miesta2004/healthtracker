import type {PlanningBlock} from "../components/planning/usePlanning.ts";

export interface BlocPositionne {
    bloc: PlanningBlock
    colIndex: number
    colCount: number
}

export interface DebordementCluster {
    start: Date
    end: Date
    colIndex: number
    colCount: number
    blocs: PlanningBlock[]
}

const MAX_COLONNES_VISIBLES = 4

/**
 * Répartit les blocs qui se chevauchent en colonnes côte à côte (comme
 * Google Calendar / Doctolib), plutôt qu'un empilement vertical qui
 * masquerait les événements — cf. §3.2 de la spec.
 *
 * Algorithme glouton par clusters d'événements qui se chevauchent :
 * - on trie par heure de début
 * - on regroupe en clusters tant que le prochain événement démarre avant la
 *   fin du cluster en cours
 * - à l'intérieur d'un cluster, on assigne la première colonne libre
 *   (coloration d'intervalles), plafonnée à MAX_COLONNES_VISIBLES : au-delà,
 *   les événements en trop sont regroupés dans un badge "+N" cliquable
 *   plutôt que des colonnes trop étroites pour être lisibles.
 */
export function disposerBlocsJournee(blocs: PlanningBlock[]): {
    positionnes: BlocPositionne[]
    debordements: DebordementCluster[]
} {
    const tries = [...blocs].sort((a, b) => a.start.getTime() - b.start.getTime())
    const positionnes: BlocPositionne[] = []
    const debordements: DebordementCluster[] = []

    let cluster: PlanningBlock[] = []
    let finCluster = -Infinity

    function vider() {
        if (cluster.length === 0) return

        const visibles = cluster.slice(0, MAX_COLONNES_VISIBLES)
        const enTrop = cluster.slice(MAX_COLONNES_VISIBLES)
        const colCountTotal = visibles.length + (enTrop.length > 0 ? 1 : 0)

        const finsColonnes: number[] = []
        for (const bloc of visibles) {
            const start = bloc.start.getTime()
            let col = finsColonnes.findIndex(fin => fin <= start)
            if (col === -1) {
                col = finsColonnes.length
                finsColonnes.push(0)
            }
            finsColonnes[col] = bloc.end.getTime()
            positionnes.push({ bloc, colIndex: col, colCount: colCountTotal })
        }

        if (enTrop.length > 0) {
            debordements.push({
                start: new Date(Math.min(...enTrop.map(b => b.start.getTime()))),
                end: new Date(Math.max(...enTrop.map(b => b.end.getTime()))),
                colIndex: visibles.length,
                colCount: colCountTotal,
                blocs: enTrop,
            })
        }

        cluster = []
    }

    for (const bloc of tries) {
        const start = bloc.start.getTime()
        if (cluster.length > 0 && start >= finCluster) {
            vider()
            finCluster = -Infinity
        }
        cluster.push(bloc)
        finCluster = Math.max(finCluster, bloc.end.getTime())
    }
    vider()

    return { positionnes, debordements }
}