import { useState } from 'react'
import { Plus, X, Check } from 'lucide-react'
import { useRappels, useCreerRappel, useModifierRappel, useSupprimerRappel } from '../hooks/useRappels'

export default function RappelsPanel() {
    const { data: rappels, isLoading } = useRappels()
    const creer = useCreerRappel()
    const modifier = useModifierRappel()
    const supprimer = useSupprimerRappel()
    const [texte, setTexte] = useState('')

    const ajouter = () => {
        const valeur = texte.trim()
        if (!valeur) return
        creer.mutate({ texte: valeur }, { onSuccess: () => setTexte('') })
    }

    // Non faits d'abord, faits relégués en bas (plutôt que triés par date de
    // création uniquement) — l'ordre du backend gère déjà la date d'échéance
    // au sein de chaque groupe.
    const trie = [...(rappels ?? [])].sort((a, b) => Number(a.fait) - Number(b.fait))

    return (
        <div className="ht-card ht-card-padded-sm flex flex-col h-full">
            <h3 className="text-sm font-semibold pb-4 mb-4 border-b" style={{ color: 'var(--ht-text)', borderColor: 'var(--ht-border)' }}>
                Rappels
            </h3>

            <div className="flex-1 flex flex-col justify-between">
                {isLoading ? (
                    <p className="text-sm" style={{ color: 'var(--ht-text-muted)' }}>Chargement…</p>
                ) : (
                    <div className="space-y-1.5 mb-3">
                        {trie.length === 0 && (
                            <p className="text-sm" style={{ color: 'var(--ht-text-muted)' }}>Aucun rappel pour l'instant.</p>
                        )}
                        {trie.map(r => (
                            <div key={r.id} className="flex items-center gap-2 group">
                                <button
                                    onClick={() => modifier.mutate({ id: r.id, data: { fait: !r.fait } })}
                                    className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border transition-colors"
                                    style={{
                                        borderColor: r.fait ? 'var(--ht-primary)' : 'var(--ht-border-input)',
                                        backgroundColor: r.fait ? 'var(--ht-primary)' : 'transparent',
                                    }}
                                    aria-label={r.fait ? 'Marquer comme non fait' : 'Marquer comme fait'}
                                >
                                    {r.fait && <Check size={11} style={{ color: 'var(--ht-primary-contrast)' }} />}
                                </button>
                                <span
                                    className="text-sm flex-1 truncate"
                                    style={{
                                        color: r.fait ? 'var(--ht-text-muted)' : 'var(--ht-text)',
                                        textDecoration: r.fait ? 'line-through' : 'none',
                                    }}
                                >
                                    {r.texte}
                                </span>
                                <button
                                    onClick={() => supprimer.mutate(r.id)}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                                    style={{ color: 'var(--ht-text-muted)' }}
                                    aria-label="Supprimer le rappel"
                                >
                                    <X size={13} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <div className="flex items-center gap-2">
                    <input
                        value={texte}
                        onChange={e => setTexte(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') ajouter() }}
                        placeholder="Ajouter un rappel…"
                        className="ht-input flex-1 text-sm"
                    />
                    <button onClick={ajouter} disabled={creer.isPending || !texte.trim()} className="btn btn-secondary px-2.5">
                        <Plus size={15} />
                    </button>
                </div>
            </div>
        </div>
    )
}
