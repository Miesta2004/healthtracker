import {useEffect, useRef, useState} from 'react'
import {useNavigate, useParams} from 'react-router-dom'
import {CheckCircle2, ChevronLeft, Download, Printer, Save, Trash2} from 'lucide-react'
import {getDocument, sauvegarderDocument, supprimerDocument, telechargerDocumentPdf} from '../api/documents'
import type {
    ChampsArretTravail,
    ChampsCertificatMedical,
    ChampsCompteRendu,
    ChampsDemandeExamen,
    ChampsLettreOrientation,
    ChampsOrdonnance,
    DocumentGenere,
    DonneesDocument,
} from '../types'
import {
    FormulaireArretTravail,
    FormulaireCertificatMedical,
    FormulaireCompteRendu,
    FormulaireDemandeExamen,
    FormulaireLettreOrientation,
    FormulaireOrdonnance,
} from '../components/documents/Formulaires.tsx'
import ApercuA4 from '../components/documents/ApercuA4'
import {SkeletonDetailPage} from '../components/Skeleton'

export default function DocumentEditeur() {
    const { id, documentId } = useParams<{ id: string; documentId: string }>()
    const navigate = useNavigate()
    const patientId = Number(id)

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [pdfLoading, setPdfLoading] = useState(false)
    const [showDelete, setShowDelete] = useState(false)
    const [error, setError] = useState('')
    const [enregistreLe, setEnregistreLe] = useState<Date | null>(null)
    const [document, setDocument] = useState<DocumentGenere | null>(null)
    const dejaModifie = useRef(false)   // ← nouveau : ignore le premier rendu après chargement

    useEffect(() => {
        if (!documentId) return
        dejaModifie.current = false
        getDocument(Number(documentId))
            .then(setDocument)
            .catch(() => setError("Impossible de charger ce document."))
            .finally(() => setLoading(false))
    }, [documentId])

    useEffect(() => {
        if (!document || document.statut === 'finalise') return
        if (!dejaModifie.current) {          // ← on ignore le déclenchement initial
            dejaModifie.current = true
            return
        }
        const timeout = setTimeout(() => {
            sauvegarderDocument(document.id, { titre: document.titre, donnees: document.donnees })
                .then(() => setEnregistreLe(new Date()))
                .catch(() => setError("Erreur lors de l'enregistrement automatique."))
        }, 1200)
        return () => clearTimeout(timeout)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [document?.donnees, document?.titre])

    const majChamps = (nouveauxChamps: DonneesDocument['champs']) => {
        if (!document) return
        setDocument({ ...document, donnees: { ...document.donnees, champs: nouveauxChamps } })
    }

    const handleFinaliser = async () => {
        if (!document) return
        const probleme = documentEstIncomplet(document)
        if (probleme) {
            setError(probleme);
            return
        }
        setSaving(true)
        setError('')
        try {
            const updated = await sauvegarderDocument(document.id, { titre: document.titre, donnees: document.donnees, statut: 'finalise' })
            setDocument(updated)
        } catch {
            setError('Erreur lors de la finalisation.')
        } finally {
            setSaving(false)
        }
    }

    const handleReouvrir = async () => {
        if (!document) return
        setSaving(true)
        try {
            const updated = await sauvegarderDocument(document.id, { statut: 'brouillon' })
            setDocument(updated)
        } catch {
            setError('Erreur lors de la réouverture du brouillon.')
        } finally {
            setSaving(false)
        }
    }

    const handleSupprimer = async () => {
        if (!document) return
        try {
            await supprimerDocument(document.id)
            navigate(`/patients/${patientId}`)
        } catch {
            setError('Erreur lors de la suppression.')
            setShowDelete(false)
        }
    }

    const handleImprimer = () => window.print()

    const handleTelechargerPdf = async () => {
        if (!document) return
        setPdfLoading(true)
        setError('')
        try {
            const blob = await telechargerDocumentPdf(document.id)
            const url = URL.createObjectURL(blob)
            window.open(url, '_blank')
            setTimeout(() => URL.revokeObjectURL(url), 30000)
        } catch (err: any) {
            let message = "PDF indisponible pour l'instant — utilise Imprimer en attendant."
            const blob = err?.response?.data
            if (blob instanceof Blob && blob.type === 'application/json') {
                try {
                    const body = JSON.parse(await blob.text())
                    if (body?.detail) message = body.detail
                } catch { /* garde le message par défaut */
                }
            }
            setError(message)
        } finally {
            setPdfLoading(false)
        }
    }

    if (loading) return <SkeletonDetailPage />
    if (!document) return (
        <div className="p-10 text-center text-sm" style={{ color: 'var(--ht-text-muted)' }}>{error || "Document introuvable."}</div>
    )

    const estFinalise = document.statut === 'finalise'

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--ht-bg)' }}>
            {showDelete && (
                <div className="ht-modal-overlay">
                    <div className="ht-modal ht-modal-sm text-center">
                        <h3 className="text-base font-bold mb-1" style={{ color: 'var(--ht-text)' }}>Supprimer ce document ?</h3>
                        <p className="text-sm mb-6" style={{ color: 'var(--ht-text-secondary)' }}>Cette action est irréversible.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setShowDelete(false)} className="btn btn-secondary flex-1">Annuler</button>
                            <button onClick={handleSupprimer} className="btn btn-danger flex-1">Supprimer</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="border-b px-6 py-3 flex items-center gap-3 no-print" style={{ backgroundColor: 'var(--ht-card-bg)', borderColor: 'var(--ht-border)' }}>
                <button onClick={() => navigate(`/patients/${patientId}`)} className="text-sm flex items-center gap-1" style={{ color: 'var(--ht-text-muted)' }}>
                    <ChevronLeft size={16} /> Retour au dossier
                </button>
                <input value={document.titre} onChange={e => setDocument({ ...document, titre: e.target.value })} disabled={estFinalise}
                       className="text-sm font-semibold border-none bg-transparent focus:outline-none ml-2 flex-1 min-w-0" style={{ color: 'var(--ht-text)' }} />
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold flex-shrink-0"
                      style={estFinalise ? { backgroundColor: 'var(--ht-success-bg)', color: 'var(--ht-success)' } : { backgroundColor: 'var(--ht-muted-bg)', color: 'var(--ht-text-secondary)' }}>
                    {document.statut_label}
                </span>
                {!estFinalise && enregistreLe && (
                    <span className="text-xs flex-shrink-0" style={{ color: 'var(--ht-text-muted)' }}>
                        Enregistré {enregistreLe.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                )}
                <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => setShowDelete(true)} className="btn btn-secondary btn-sm gap-1.5"><Trash2 size={13} /> Supprimer</button>
                    <button onClick={handleImprimer} className="btn btn-secondary btn-sm gap-1.5"><Printer size={13} /> Imprimer</button>
                    <button onClick={handleTelechargerPdf} disabled={pdfLoading} className="btn btn-secondary btn-sm gap-1.5">
                        <Download size={13} /> {pdfLoading ? 'Génération…' : 'PDF'}
                    </button>
                    {estFinalise ? (
                        <button onClick={handleReouvrir} disabled={saving} className="btn btn-secondary btn-sm">Rouvrir en brouillon</button>
                    ) : (
                        <button onClick={handleFinaliser} disabled={saving} className="btn btn-primary btn-sm gap-1.5">
                            <CheckCircle2 size={14} /> {saving ? 'Finalisation…' : 'Finaliser'}
                        </button>
                    )}
                </div>
            </div>

            {error && <div className="ht-alert ht-alert-danger mx-6 mt-4 no-print">{error}</div>}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
                <div className="no-print">
                    {estFinalise && (
                        <div className="ht-alert mb-4" style={{ backgroundColor: 'var(--ht-success-bg)', color: 'var(--ht-success)' }}>
                            <Save size={14} className="inline mr-1.5" /> Document finalisé — rouvre-le en brouillon pour le modifier.
                        </div>
                    )}
                    <fieldset disabled={estFinalise} className="ht-card ht-card-padded-sm">
                        {document.type_document === 'ordonnance' && <FormulaireOrdonnance champs={document.donnees.champs as ChampsOrdonnance} onChange={majChamps} />}
                        {document.type_document === 'certificat_medical' && <FormulaireCertificatMedical champs={document.donnees.champs as ChampsCertificatMedical} onChange={majChamps} />}
                        {(document.type_document === 'demande_analyse' || document.type_document === 'demande_imagerie') && (
                            <FormulaireDemandeExamen champs={document.donnees.champs as ChampsDemandeExamen} onChange={majChamps} />
                        )}
                        {document.type_document === 'compte_rendu_consultation' && <FormulaireCompteRendu champs={document.donnees.champs as ChampsCompteRendu} onChange={majChamps} />}
                        {document.type_document === 'lettre_orientation' && <FormulaireLettreOrientation champs={document.donnees.champs as ChampsLettreOrientation} onChange={majChamps} />}
                        {document.type_document === 'arret_travail' && <FormulaireArretTravail champs={document.donnees.champs as ChampsArretTravail} onChange={majChamps} />}
                    </fieldset>
                </div>
                <div id="zone-impression" className="overflow-x-auto">
                    <ApercuA4 document={document} />
                </div>
            </div>

            <style>{`
                @media print {
                    .no-print { display: none !important; }
                    #zone-impression { padding: 0 !important; overflow: visible !important; }
                    .grid { display: block !important; }   /* ← neutralise la grille 2 colonnes */
                    body { background: white !important; }
                }
                @page { size: A4; margin: 0; }              /* ← évite le cumul avec les 18mm/16mm du composant */
            `}</style>
        </div>
    )
}

function documentEstIncomplet(document: DocumentGenere): string | null {
    switch (document.type_document) {
        case 'ordonnance': {
            const c = document.donnees.champs as ChampsOrdonnance
            if (c.medicaments.length === 0) return "Ajoute au moins un médicament avant de finaliser."
            break
        }
        case 'arret_travail': {
            const c = document.donnees.champs as ChampsArretTravail
            if (!c.date_debut || !c.date_fin) return "Renseigne les dates de début et de fin de l'arrêt."
            break
        }
        case 'certificat_medical': {
            const c = document.donnees.champs as ChampsCertificatMedical
            if (!c.motif && !c.constat) return "Renseigne au moins un motif ou un constat."
            break
        }
    }
    return null
}