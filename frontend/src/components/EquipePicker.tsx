import { useEffect, useState } from 'react'
import { X, UserPlus } from 'lucide-react'
import { getEmployes } from '../api/comptes'
import type { Employe } from '../types'

interface Props {
    /** Si fourni, priorise les employés de ce service dans la recherche (mais n'exclut pas les autres). */
    serviceId?: number | null
    selectionnes: number[]
    onChange: (ids: number[]) => void
}

export default function EquipePicker({ serviceId, selectionnes, onChange }: Props) {
    const [employes, setEmployes] = useState<Employe[]>([])
    const [terme, setTerme] = useState('')
    const [ouvert, setOuvert] = useState(false)

    useEffect(() => {
        getEmployes().then(setEmployes).catch(() => setEmployes([]))
    }, [])

    const membres = employes.filter(e => selectionnes.includes(e.id))

    const candidats = employes
        .filter(e => !selectionnes.includes(e.id))
        .filter(e => `${e.prenom} ${e.nom}`.toLowerCase().includes(terme.toLowerCase()))
        .sort((a, b) => {
            // Les employés du même service remontent en premier, sans exclure les autres —
            // une intervention peut avoir besoin d'un anesthésiste d'un autre service.
            const aMeme = serviceId ? Number(a.service !== serviceId) : 0
            const bMeme = serviceId ? Number(b.service !== serviceId) : 0
            return aMeme - bMeme
        })
        .slice(0, 20)

    const ajouter = (id: number) => {
        onChange([...selectionnes, id])
        setTerme('')
    }
    const retirer = (id: number) => {
        onChange(selectionnes.filter(x => x !== id))
    }

    return (
        <div>
            <label className="ht-label">Équipe (anesthésiste, infirmier de bloc…)</label>

            {membres.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                    {membres.map(m => (
                        <span
                            key={m.id}
                            className="flex items-center gap-1 text-xs font-medium pl-2 pr-1 py-1 rounded-full"
                            style={{ backgroundColor: 'var(--ht-muted-bg)', color: 'var(--ht-text)' }}
                        >
                            {m.prenom} {m.nom}
                            {m.specialite_principale_nom && (
                                <span style={{ color: 'var(--ht-text-muted)' }}>· {m.specialite_principale_nom}</span>
                            )}
                            <button
                                type="button" onClick={() => retirer(m.id)}
                                className="ml-0.5" style={{ color: 'var(--ht-text-muted)' }}
                                aria-label={`Retirer ${m.prenom} ${m.nom}`}
                            >
                                <X size={11} />
                            </button>
                        </span>
                    ))}
                </div>
            )}

            <div className="relative">
                <button
                    type="button" onClick={() => setOuvert(o => !o)}
                    className="ht-input flex items-center justify-between text-left"
                >
                    <span style={{ color: 'var(--ht-text-muted)' }}>Ajouter un membre…</span>
                    <UserPlus size={14} style={{ color: 'var(--ht-text-muted)' }} />
                </button>
                {ouvert && (
                    <div
                        className="absolute z-20 mt-1 w-full rounded-xl border overflow-hidden"
                        style={{ backgroundColor: 'var(--ht-card-bg)', borderColor: 'var(--ht-border-input)', boxShadow: 'var(--ht-shadow-modal)' }}
                    >
                        <input
                            autoFocus value={terme} onChange={e => setTerme(e.target.value)}
                            placeholder="Rechercher…" className="ht-input rounded-none border-0 border-b"
                            style={{ borderColor: 'var(--ht-border-input)' }}
                        />
                        <div className="max-h-48 overflow-y-auto">
                            {candidats.length === 0 && (
                                <p className="px-3 py-2 text-xs" style={{ color: 'var(--ht-text-muted)' }}>Aucun résultat</p>
                            )}
                            {candidats.map(c => (
                                <button
                                    key={c.id} type="button" onClick={() => ajouter(c.id)}
                                    className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--ht-bg)] flex items-center justify-between"
                                    style={{ color: 'var(--ht-text)' }}
                                >
                                    <span>{c.prenom} {c.nom}</span>
                                    {c.specialite_principale_nom && (
                                        <span className="text-xs" style={{ color: 'var(--ht-text-muted)' }}>{c.specialite_principale_nom}</span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
