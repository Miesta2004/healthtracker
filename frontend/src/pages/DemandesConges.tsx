import { useEffect, useMemo, useState } from 'react'
import { getExceptions, validerException, rejeterException } from '../api/disponibilites'
import type { ExceptionDisponibilite, StatutException } from '../types'
import Sidebar from '../components/Sidebar.tsx'
import PageHeader from '../components/PageHeader.tsx'
import { SkeletonSimpleList } from '../components/Skeleton'
import {
    ClipboardCheck,
    Clock,
    CheckCircle2,
    XCircle,
    Check,
    Ban,
    User,
} from 'lucide-react'

const STATUT_CONFIG: Record<StatutException, { label: string; bg: string; color: string; Icon: typeof Clock }> = {
    en_attente: { label: 'En attente', bg: 'var(--ht-warning-bg)', color: 'var(--ht-warning)', Icon: Clock },
    valide:     { label: 'Validé',     bg: 'var(--ht-success-bg)', color: 'var(--ht-success)', Icon: CheckCircle2 },
    rejete:     { label: 'Rejeté',     bg: 'var(--ht-danger-bg)',  color: 'var(--ht-danger)',  Icon: XCircle },
}

function formatDate(d: string) {
    return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

function DemandeCard({ ex, onValider, onRejeter }: {
    ex: ExceptionDisponibilite
    onValider: (id: number) => void
    onRejeter: (id: number) => void
}) {
    const cfg = STATUT_CONFIG[ex.statut] ?? STATUT_CONFIG.en_attente
    const [busy, setBusy] = useState(false)

    return (
        <div className="ht-card ht-card-padded-sm flex items-start gap-4">
            <div className="flex flex-col items-center justify-center w-11 h-11 rounded-xl flex-shrink-0"
                 style={{ backgroundColor: 'var(--ht-primary-tint-bg)' }}>
                <User size={18} style={{ color: 'var(--ht-primary-tint-text)' }} />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold" style={{ color: 'var(--ht-text)' }}>
                        {ex.employe_prenom} {ex.employe_nom}
                    </span>
                    {ex.employe_role_label && (
                        <span className="text-xs" style={{ color: 'var(--ht-text-muted)' }}>· {ex.employe_role_label}</span>
                    )}
                    <span className="badge flex items-center gap-1" style={{ backgroundColor: cfg.bg, color: cfg.color }}>
                        <cfg.Icon size={11} /> {cfg.label}
                    </span>
                </div>
                <p className="text-xs mt-1" style={{ color: 'var(--ht-text-secondary)' }}>
                    {ex.type_label} · du {formatDate(ex.date_debut)} au {formatDate(ex.date_fin)}
                </p>
                {ex.motif && (
                    <p className="text-xs mt-1 italic" style={{ color: 'var(--ht-text-muted)' }}>« {ex.motif} »</p>
                )}
            </div>
            {ex.statut === 'en_attente' && (
                <div className="flex gap-1.5 flex-shrink-0 self-center">
                    <button
                        disabled={busy}
                        onClick={async () => { setBusy(true); await onValider(ex.id); setBusy(false) }}
                        className="btn btn-success btn-sm text-xs gap-1"
                    >
                        <Check size={12} /> Valider
                    </button>
                    <button
                        disabled={busy}
                        onClick={async () => { setBusy(true); await onRejeter(ex.id); setBusy(false) }}
                        className="btn btn-secondary btn-sm text-xs gap-1"
                        style={{ color: 'var(--ht-danger)' }}
                    >
                        <Ban size={12} /> Rejeter
                    </button>
                </div>
            )}
        </div>
    )
}

type Filtre = 'en_attente' | 'valide' | 'rejete' | 'tous'

export default function DemandesConges() {
    const [exceptions, setExceptions] = useState<ExceptionDisponibilite[]>([])
    const [loading, setLoading] = useState(true)
    const [filtre, setFiltre] = useState<Filtre>('en_attente')

    const charger = () => {
        setLoading(true)
        getExceptions(filtre === 'tous' ? undefined : filtre)
            .then(setExceptions)
            .finally(() => setLoading(false))
    }

    useEffect(() => { charger() }, [filtre])

    const handleValider = async (id: number) => {
        await validerException(id)
        setExceptions(prev =>
            filtre === 'tous'
                ? prev.map(e => e.id === id ? { ...e, statut: 'valide', valide: true } : e)
                : prev.filter(e => e.id !== id)
        )
    }

    const handleRejeter = async (id: number) => {
        await rejeterException(id)
        setExceptions(prev =>
            filtre === 'tous'
                ? prev.map(e => e.id === id ? { ...e, statut: 'rejete', valide: false } : e)
                : prev.filter(e => e.id !== id)
        )
    }

    const nbEnAttente = useMemo(
        () => exceptions.filter(e => e.statut === 'en_attente').length,
        [exceptions]
    )

    const tabs: { key: Filtre; label: string }[] = [
        { key: 'en_attente', label: 'En attente' },
        { key: 'valide', label: 'Validées' },
        { key: 'rejete', label: 'Rejetées' },
        { key: 'tous', label: 'Toutes' },
    ]

    return (
        <div className="ht-page">
            <Sidebar />

            <main className="ht-page-content max-w-4xl mx-auto space-y-6">
                <PageHeader
                    title="Demandes de congé"
                    subtitle="Validation des congés, absences et autres exceptions de disponibilité"
                    icon={ClipboardCheck}
                />

                <div className="flex items-center gap-1 border p-1 rounded-xl w-fit" style={{ backgroundColor: 'var(--ht-muted-bg)', borderColor: 'var(--ht-border)' }}>
                    {tabs.map(t => (
                        <button
                            key={t.key}
                            onClick={() => setFiltre(t.key)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                            style={filtre === t.key
                                ? { backgroundColor: 'var(--ht-primary)', color: 'white' }
                                : { color: 'var(--ht-text-secondary)' }}
                        >
                            {t.label}
                            {t.key === 'en_attente' && filtre === 'en_attente' && nbEnAttente > 0 && ` (${nbEnAttente})`}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <SkeletonSimpleList rows={4} />
                ) : exceptions.length === 0 ? (
                    <div className="ht-card text-center py-16 flex flex-col items-center justify-center">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-2.5" style={{ backgroundColor: 'var(--ht-muted-bg)', color: 'var(--ht-text-muted)' }}>
                            <ClipboardCheck size={20} />
                        </div>
                        <p className="text-sm" style={{ color: 'var(--ht-text-muted)' }}>
                            Aucune demande {filtre === 'en_attente' ? 'en attente' : filtre === 'valide' ? 'validée' : filtre === 'rejete' ? 'rejetée' : ''}.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {exceptions.map(ex => (
                            <DemandeCard key={ex.id} ex={ex} onValider={handleValider} onRejeter={handleRejeter} />
                        ))}
                    </div>
                )}
            </main>
        </div>
    )
}
