import { useState } from 'react'
import { Plus, X } from 'lucide-react'

interface Rappel {
    id: number
    texte: string
    fait: boolean
}

// Pas de modèle backend dédié aux rappels dans HealthTracker — cette liste
// vit uniquement en mémoire du composant (state React), donc PAS de
// persistance : elle se réinitialise à chaque rechargement de page. Un
// vrai stockage nécessiterait un modèle Django dédié (voir suggestion en fin
// d'échange). Le texte "Non enregistré" en bas le rappelle explicitement à
// l'utilisateur pour éviter toute confusion.
export default function PlanningReminders() {
    const [rappels, setRappels] = useState<Rappel[]>([])
    const [nouveauTexte, setNouveauTexte] = useState('')

    const ajouter = () => {
        const texte = nouveauTexte.trim()
        if (!texte) return
        setRappels(prev => [...prev, { id: Date.now(), texte, fait: false }])
        setNouveauTexte('')
    }

    const basculer = (id: number) => {
        setRappels(prev => prev.map(r => r.id === id ? { ...r, fait: !r.fait } : r))
    }

    const supprimer = (id: number) => {
        setRappels(prev => prev.filter(r => r.id !== id))
    }

    return (
        <div className="ht-card ht-card-padded-sm">
            <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--ht-text)' }}>Rappels</h3>

            {rappels.length === 0 ? (
                <p className="text-xs mb-3" style={{ color: 'var(--ht-text-muted)' }}>Aucun rappel pour l'instant.</p>
            ) : (
                <div className="space-y-2 mb-3">
                    {rappels.map(r => (
                        <div key={r.id} className="flex items-center gap-2 group">
                            <input type="checkbox" checked={r.fait} onChange={() => basculer(r.id)} className="flex-shrink-0" />
                            <span
                                className="text-xs flex-1"
                                style={{
                                    color: r.fait ? 'var(--ht-text-muted)' : 'var(--ht-text)',
                                    textDecoration: r.fait ? 'line-through' : 'none',
                                }}
                            >
                                {r.texte}
                            </span>
                            <button onClick={() => supprimer(r.id)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <X size={12} style={{ color: 'var(--ht-text-muted)' }} />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <div className="flex gap-1.5">
                <input
                    type="text" value={nouveauTexte} onChange={e => setNouveauTexte(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && ajouter()}
                    placeholder="Ajouter un rappel…"
                    className="ht-input text-xs py-1.5"
                />
                <button onClick={ajouter} className="btn btn-secondary btn-sm !px-2 flex-shrink-0">
                    <Plus size={13} />
                </button>
            </div>
            <p className="text-[10px] mt-2" style={{ color: 'var(--ht-text-muted)' }}>
                Non enregistré — réinitialisé à chaque rechargement de la page.
            </p>
        </div>
    )
}
