import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, Check, MoreVertical, Pencil, X } from 'lucide-react'
import type { PlanningBlock } from './usePlanning'
import { STATUT_BLOCK_BG, STATUT_BLOCK_TEXT, formatHeure } from '../../utils/planningUtils.ts'

// ─── Menu contextuel rapide (§3.1c) ──────────────────────────────────────────
function MenuRapide({ bloc, onClose, onChangerStatut, onModifierHoraire }: {
    bloc: PlanningBlock
    onClose: () => void
    onChangerStatut: (statut: 'confirme' | 'termine' | 'annule') => void
    onModifierHoraire: () => void
}) {
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) onClose()
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [onClose])

    return (
        <div
            ref={ref}
            onClick={e => e.stopPropagation()}
            className="absolute z-20 top-full right-0 mt-1 w-48 rounded-lg border shadow-lg overflow-hidden py-1"
            style={{ backgroundColor: 'var(--ht-card-bg)', borderColor: 'var(--ht-border)', boxShadow: 'var(--ht-shadow-modal)' }}
        >
            {bloc.statut === 'planifie' && (
                <button
                    onClick={() => { onChangerStatut('confirme'); onClose() }}
                    className="w-full text-left px-3 py-2 text-xs font-medium flex items-center gap-2 hover:bg-[var(--ht-bg)] transition-colors"
                    style={{ color: 'var(--ht-text)' }}
                >
                    <Check size={13} style={{ color: 'var(--ht-success)' }} /> Marquer présent
                </button>
            )}
            {(bloc.statut === 'planifie' || bloc.statut === 'confirme') && (
                <button
                    onClick={() => { onChangerStatut('termine'); onClose() }}
                    className="w-full text-left px-3 py-2 text-xs font-medium flex items-center gap-2 hover:bg-[var(--ht-bg)] transition-colors"
                    style={{ color: 'var(--ht-text)' }}
                >
                    <Check size={13} style={{ color: 'var(--ht-success)' }} /> Marquer terminé
                </button>
            )}
            <button
                onClick={onModifierHoraire}
                className="w-full text-left px-3 py-2 text-xs font-medium flex items-center gap-2 hover:bg-[var(--ht-bg)] transition-colors"
                style={{ color: 'var(--ht-text)' }}
            >
                <Pencil size={13} style={{ color: 'var(--ht-text-muted)' }} /> Modifier l'horaire
            </button>
            {(bloc.statut === 'planifie' || bloc.statut === 'confirme') && (
                <button
                    onClick={() => { onChangerStatut('annule'); onClose() }}
                    className="w-full text-left px-3 py-2 text-xs font-medium flex items-center gap-2 hover:bg-[var(--ht-bg)] transition-colors"
                    style={{ color: 'var(--ht-danger)' }}
                >
                    <X size={13} /> Annuler
                </button>
            )}
        </div>
    )
}

export default function PlanningEventBlock({
                                               bloc, style, compact = false,
                                               onOpenPreview, onChangerStatut, onModifierHoraire,
                                           }: {
    bloc: PlanningBlock
    style?: React.CSSProperties
    compact?: boolean
    onOpenPreview: (bloc: PlanningBlock) => void
    onChangerStatut: (id: number, statut: 'confirme' | 'termine' | 'annule') => void
    onModifierHoraire: (bloc: PlanningBlock) => void
}) {
    const [menuOuvert, setMenuOuvert] = useState(false)

    const estUrgence = bloc.kind === 'urgence'
    const bg = estUrgence ? 'var(--ht-danger-bg-light)' : (STATUT_BLOCK_BG[bloc.statut] ?? 'var(--ht-muted-bg)')
    const texte = estUrgence ? 'var(--ht-danger)' : (STATUT_BLOCK_TEXT[bloc.statut] ?? 'var(--ht-muted)')

    return (
        <div
            className="relative rounded-lg px-2 py-1.5 text-xs cursor-pointer group h-full overflow-hidden transition-shadow hover:shadow-md"
            style={{
                backgroundColor: bg,
                border: estUrgence ? '1px dashed var(--ht-danger)' : '1px solid transparent',
                borderLeft: !estUrgence && bloc.aAlerteCritique ? '4px solid var(--ht-danger)' : undefined,
                textDecoration: bloc.statut === 'annule' ? 'line-through' : undefined,
                opacity: bloc.statut === 'annule' ? 0.7 : 1,
                ...style,
            }}
            onClick={() => onOpenPreview(bloc)}
            onContextMenu={e => { e.preventDefault(); setMenuOuvert(true) }}
            title={`${bloc.patientNom} · ${bloc.motif}`}
        >
            <div className="flex items-center justify-between gap-1">
                <span className="font-semibold truncate" style={{ color: texte }}>
                    {formatHeure(bloc.start)}
                </span>
                <div className="flex items-center gap-0.5 flex-shrink-0">
                    {bloc.aAlerteCritique && <AlertTriangle size={12} style={{ color: 'var(--ht-danger)' }} />}
                    {bloc.kind === 'rdv' && !compact && (
                        <button
                            onClick={e => { e.stopPropagation(); setMenuOuvert(v => !v) }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity rounded p-0.5 hover:bg-black/10"
                            title="Actions rapides"
                        >
                            <MoreVertical size={12} style={{ color: texte }} />
                        </button>
                    )}
                </div>
            </div>
            {!compact && (
                <>
                    <p className="truncate font-medium mt-0.5" style={{ color: 'var(--ht-text)' }}>
                        {bloc.patientNom}
                    </p>
                    <p className="truncate" style={{ color: 'var(--ht-text-muted)' }}>
                        {estUrgence ? 'Passage aux urgences' : bloc.motif}
                    </p>
                </>
            )}

            {menuOuvert && bloc.kind === 'rdv' && (
                <MenuRapide
                    bloc={bloc}
                    onClose={() => setMenuOuvert(false)}
                    onChangerStatut={statut => onChangerStatut(bloc.id, statut)}
                    onModifierHoraire={() => { setMenuOuvert(false); onModifierHoraire(bloc) }}
                />
            )}
        </div>
    )
}