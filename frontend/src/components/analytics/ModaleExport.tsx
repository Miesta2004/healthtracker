import { useState } from 'react'
import { X, FileText, FileSpreadsheet, FileJson } from 'lucide-react'

export type FormatExport = 'pdf' | 'excel' | 'csv'
export type TypeRapport = 'apercu' | 'services' | 'qualite' | 'chirurgiens'

const TYPES_RAPPORT: { value: TypeRapport; label: string }[] = [
    { value: 'apercu', label: "Vue d'ensemble" },
    { value: 'services', label: 'Activité par service' },
    { value: 'qualite', label: 'Qualité & sécurité' },
    { value: 'chirurgiens', label: 'Performance par chirurgien' },
]

export default function ModaleExport({ onClose, onExporter }: {
    onClose: () => void
    onExporter: (opts: { type: TypeRapport; format: FormatExport; graphiques: boolean; details: boolean }) => void
}) {
    const [type, setType] = useState<TypeRapport>('apercu')
    const [format, setFormat] = useState<FormatExport>('pdf')
    const [graphiques, setGraphiques] = useState(true)
    const [details, setDetails] = useState(true)

    return (
        <div className="ht-modal-overlay">
            <div className="ht-modal ht-modal-md space-y-5">
                <div className="flex items-center justify-between">
                    <h3 className="ht-modal-title">Exporter le rapport</h3>
                    <button onClick={onClose} className="btn btn-ghost btn-sm !p-1.5"><X size={16} /></button>
                </div>

                <div className="ht-field">
                    <label className="ht-label">Type de rapport</label>
                    <select value={type} onChange={e => setType(e.target.value as TypeRapport)} className="ht-input">
                        {TYPES_RAPPORT.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                </div>

                <div className="ht-field">
                    <label className="ht-label">Format</label>
                    <div className="grid grid-cols-3 gap-2">
                        {[
                            { value: 'pdf' as const, label: 'PDF', icon: FileText },
                            { value: 'excel' as const, label: 'Excel', icon: FileSpreadsheet },
                            { value: 'csv' as const, label: 'CSV', icon: FileJson },
                        ].map(f => (
                            <button
                                key={f.value}
                                onClick={() => setFormat(f.value)}
                                className="flex flex-col items-center gap-1.5 py-3 rounded-xl text-xs font-semibold transition-all"
                                style={format === f.value
                                    ? { border: '2px solid var(--ht-primary)', color: 'var(--ht-primary)', backgroundColor: 'var(--ht-primary-tint-bg)' }
                                    : { border: '1px solid var(--ht-border-input)', color: 'var(--ht-text-secondary)' }}
                            >
                                <f.icon size={16} /> {f.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-2.5">
                    <label className="flex items-center gap-2.5 text-sm" style={{ color: 'var(--ht-text-secondary)' }}>
                        <input type="checkbox" checked={graphiques} onChange={e => setGraphiques(e.target.checked)} />
                        Inclure les graphiques
                    </label>
                    <label className="flex items-center gap-2.5 text-sm" style={{ color: 'var(--ht-text-secondary)' }}>
                        <input type="checkbox" checked={details} onChange={e => setDetails(e.target.checked)} />
                        Inclure le détail des données
                    </label>
                </div>

                {format !== 'csv' && (
                    <p className="text-[11px]" style={{ color: 'var(--ht-text-muted)' }}>
                        Seul l'export CSV est réellement câblé pour l'instant (données de services). PDF/Excel sont
                        prévus dans l'interface mais demandent une génération côté backend à construire.
                    </p>
                )}

                <button
                    onClick={() => onExporter({ type, format, graphiques, details })}
                    className="btn btn-primary w-full justify-center"
                >
                    Exporter le rapport
                </button>
            </div>
        </div>
    )
}