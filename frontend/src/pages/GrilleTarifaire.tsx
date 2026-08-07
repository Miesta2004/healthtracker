import { useEffect, useState } from 'react'
import { getTarifsActes, createTarifActe, updateTarifActe } from '../api/facturation'
import { getServices } from '../api/services.ts'
import { TYPE_ACTE_LABELS, formatMontant, type TarifActe, type TypeActe } from '../types'
import type { Service } from '../types'
import Sidebar from '../components/Sidebar.tsx'
import PageHeader from '../components/PageHeader.tsx'
import { SkeletonTable } from '../components/Skeleton'
import { Tag, Plus, X, Power } from 'lucide-react'

export default function GrilleTarifaire() {
    const [tarifs, setTarifs] = useState<TarifActe[]>([])
    const [services, setServices] = useState<Service[]>([])
    const [loading, setLoading] = useState(true)
    const [afficherInactifs, setAfficherInactifs] = useState(false)
    const [formulaireOuvert, setFormulaireOuvert] = useState(false)

    const [typeActe, setTypeActe] = useState<TypeActe>('consultation')
    const [codeActe, setCodeActe] = useState('')
    const [libelle, setLibelle] = useState('')
    const [prix, setPrix] = useState('')
    const [serviceId, setServiceId] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [erreur, setErreur] = useState('')

    const charger = () => {
        setLoading(true)
        getTarifsActes(afficherInactifs ? undefined : { actif: true })
            .then(setTarifs)
            .catch(() => setTarifs([]))
            .finally(() => setLoading(false))
    }

    useEffect(() => { charger() }, [afficherInactifs])
    useEffect(() => { getServices().then(setServices).catch(() => setServices([])) }, [])

    const valide = codeActe.trim() !== '' && libelle.trim() !== '' && Number(prix) > 0

    const handleSubmit = async () => {
        if (!valide) return
        setSubmitting(true)
        setErreur('')
        try {
            await createTarifActe({
                type_acte: typeActe,
                code_acte: codeActe.trim(),
                libelle: libelle.trim(),
                prix_unitaire: Number(prix),
                service: serviceId ? Number(serviceId) : undefined,
            })
            setFormulaireOuvert(false)
            setCodeActe(''); setLibelle(''); setPrix(''); setServiceId('')
            charger()
        } catch (e: unknown) {
            const detail = (e as { response?: { data?: { code_acte?: string[]; detail?: string } } })?.response?.data
            setErreur(detail?.code_acte?.[0] || detail?.detail || 'Erreur lors de la création.')
            setSubmitting(false)
        }
    }

    const toggleActif = (tarif: TarifActe) => {
        updateTarifActe(tarif.id, { actif: !tarif.actif } as never).then(charger)
    }

    return (
        <div className="ht-page">
            <Sidebar />

            <main className="ht-page-content space-y-6">
                <PageHeader
                    title="Grille tarifaire"
                    subtitle="Nomenclature des actes facturables — évite la ressaisie manuelle du prix à chaque ligne"
                    icon={Tag}
                    ctaLabel="Nouveau tarif"
                    onCtaClick={() => setFormulaireOuvert(true)}
                />

                <label className="flex items-center gap-2 text-sm cursor-pointer w-fit" style={{ color: 'var(--ht-text-secondary)' }}>
                    <input type="checkbox" checked={afficherInactifs} onChange={e => setAfficherInactifs(e.target.checked)} />
                    Afficher aussi les tarifs désactivés
                </label>

                <div className="ht-card">
                    {!loading && tarifs.length > 0 && (
                        <div className="ht-table-header grid-cols-12">
                            <div className="col-span-2">Code</div>
                            <div className="col-span-4">Libellé</div>
                            <div className="col-span-2">Type</div>
                            <div className="col-span-2 text-right">Prix</div>
                            <div className="col-span-1">Service</div>
                            <div className="col-span-1 text-right">Actif</div>
                        </div>
                    )}

                    {loading ? (
                        <SkeletonTable rows={5} />
                    ) : tarifs.length === 0 ? (
                        <div className="px-6 py-16 text-center text-sm" style={{ color: 'var(--ht-text-muted)' }}>
                            Aucun tarif enregistré pour le moment
                        </div>
                    ) : (
                        <div>
                            {tarifs.map(t => (
                                <div key={t.id} className="ht-table-row grid-cols-12 items-center" style={{ opacity: t.actif ? 1 : 0.5 }}>
                                    <div className="col-span-2 text-sm font-mono" style={{ color: 'var(--ht-text)' }}>{t.code_acte}</div>
                                    <div className="col-span-4 text-sm" style={{ color: 'var(--ht-text)' }}>{t.libelle}</div>
                                    <div className="col-span-2 text-xs" style={{ color: 'var(--ht-text-muted)' }}>{TYPE_ACTE_LABELS[t.type_acte]}</div>
                                    <div className="col-span-2 text-right text-sm font-medium" style={{ color: 'var(--ht-text)' }}>{formatMontant(t.prix_unitaire)}</div>
                                    <div className="col-span-1 text-xs" style={{ color: 'var(--ht-text-muted)' }}>{t.service_nom || 'Tous'}</div>
                                    <div className="col-span-1 text-right">
                                        <button onClick={() => toggleActif(t)} className="btn btn-ghost btn-sm !p-1.5" title={t.actif ? 'Désactiver' : 'Réactiver'}>
                                            <Power size={14} style={{ color: t.actif ? 'var(--ht-success)' : 'var(--ht-text-muted)' }} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {formulaireOuvert && (
                <div className="ht-modal-overlay" onClick={() => setFormulaireOuvert(false)}>
                    <div className="ht-modal ht-modal-md space-y-4" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between">
                            <h3 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--ht-text)' }}>
                                <Plus size={17} /> Nouveau tarif
                            </h3>
                            <button onClick={() => setFormulaireOuvert(false)} className="btn btn-ghost btn-sm !p-1.5"><X size={18} /></button>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--ht-text-muted)' }}>Type d'acte</label>
                            <select value={typeActe} onChange={e => setTypeActe(e.target.value as TypeActe)} className="ht-input">
                                {Object.entries(TYPE_ACTE_LABELS).map(([value, label]) => (
                                    <option key={value} value={value}>{label}</option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--ht-text-muted)' }}>Code (unique)</label>
                                <input type="text" value={codeActe} onChange={e => setCodeActe(e.target.value.toUpperCase())} placeholder="CONS-CARDIO" className="ht-input" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--ht-text-muted)' }}>Prix unitaire (FCFA)</label>
                                <input type="number" min={0} value={prix} onChange={e => setPrix(e.target.value)} className="ht-input" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--ht-text-muted)' }}>Libellé</label>
                            <input type="text" value={libelle} onChange={e => setLibelle(e.target.value)} placeholder="Consultation cardiologie" className="ht-input" />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--ht-text-muted)' }}>
                                Service (optionnel)
                            </label>
                            <select value={serviceId} onChange={e => setServiceId(e.target.value)} className="ht-input">
                                <option value="">Tarif générique — tous services</option>
                                {services.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
                            </select>
                        </div>

                        {erreur && <div className="ht-alert ht-alert-danger text-xs">{erreur}</div>}

                        <div className="flex gap-2 justify-end pt-2">
                            <button onClick={() => setFormulaireOuvert(false)} className="btn btn-secondary">Annuler</button>
                            <button onClick={handleSubmit} disabled={!valide || submitting} className="btn btn-primary">
                                {submitting ? 'Création…' : 'Créer le tarif'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}