import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Check, Ban, ArrowRight, Folder, AlertTriangle } from 'lucide-react'
import { getSignesVitaux } from '../../api/patients'
import type { SignesVitaux, StatutRendezVous } from '../../types'
import type { PlanningBlock } from './usePlanning'
import { STATUT_BLOCK_BG, STATUT_BLOCK_TEXT, STATUT_LABEL_COURT, formatHeure } from '../../utils/planningUtils.ts'

// Mêmes seuils que components/SignesCharts.tsx — on ne réinvente pas de
// nouvelles bornes cliniques, on réutilise celles déjà validées ailleurs
// dans l'app pour rester cohérent.
const SEUILS = {
    tensionSystolique: { min: 90, max: 140 },
    tensionDiastolique: { min: 60, max: 90 },
    temperature: { min: 36.1, max: 38.0 },
    glycemie: { min: 3.9, max: 7.8 },
    frequenceCardiaque: { min: 50, max: 100 },
}

function horsSeuil(valeur: number | null, bornes: { min: number; max: number }): boolean {
    return valeur !== null && (valeur < bornes.min || valeur > bornes.max)
}

function ValeurConstante({ label, valeur, unite, alerte }: { label: string; valeur: string; unite: string; alerte: boolean }) {
    return (
        <div>
            <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--ht-text-muted)' }}>{label}</p>
            <p className="text-sm font-semibold flex items-center gap-1" style={{ color: alerte ? 'var(--ht-danger)' : 'var(--ht-text)' }}>
                {valeur} <span className="text-xs font-normal" style={{ color: 'var(--ht-text-muted)' }}>{unite}</span>
                {alerte && <AlertTriangle size={12} />}
            </p>
        </div>
    )
}

export default function PlanningEventPreviewModal({
                                                      bloc, onClose, onChangerStatut, onDemarrerConsultation,
                                                  }: {
    bloc: PlanningBlock
    onClose: () => void
    onChangerStatut: (id: number, statut: StatutRendezVous) => void
    onDemarrerConsultation: (bloc: PlanningBlock) => void
}) {
    const navigate = useNavigate()
    const [dernieresConstantes, setDernieresConstantes] = useState<SignesVitaux | null | undefined>(undefined)

    useEffect(() => {
        // Chargement différé : uniquement à l'ouverture de la modale, jamais
        // préchargé pour tous les événements de la semaine (§3.1a). Pas de
        // reset synchrone ici : la modale est remontée à chaque nouveau
        // `bloc` (le parent la conditionne sur `previewBloc`), donc l'état
        // initial `undefined` sert déjà d'indicateur de chargement.
        getSignesVitaux(bloc.patientId)
            .then((liste: SignesVitaux[]) => {
                if (!liste || liste.length === 0) { setDernieresConstantes(null); return }
                const triees = [...liste].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                setDernieresConstantes(triees[0])
            })
            .catch(() => setDernieresConstantes(null))
    }, [bloc.patientId])

    const estUrgence = bloc.kind === 'urgence'
    const bg = estUrgence ? 'var(--ht-danger-bg-light)' : STATUT_BLOCK_BG[bloc.statut]
    const texte = estUrgence ? 'var(--ht-danger)' : STATUT_BLOCK_TEXT[bloc.statut]

    return (
        <div className="ht-modal-overlay" onClick={onClose}>
            <div className="ht-modal ht-modal-md" onClick={e => e.stopPropagation()}>

                {/* En-tête */}
                <div className="pb-4 border-b flex items-start justify-between gap-3" style={{ borderColor: 'var(--ht-border)' }}>
                    <div>
                        <h3 className="text-base font-bold flex items-center gap-2 flex-wrap" style={{ color: 'var(--ht-text)' }}>
                            {bloc.patientNom}
                            {typeof bloc.patientAge === 'number' && (
                                <span className="text-sm font-normal" style={{ color: 'var(--ht-text-secondary)' }}>· {bloc.patientAge} ans</span>
                            )}
                        </h3>
                        <p className="text-xs mt-1 flex items-center gap-1.5" style={{ color: 'var(--ht-text-secondary)' }}>
                            {formatHeure(bloc.start)} – {formatHeure(bloc.end)}
                        </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="badge" style={{ backgroundColor: bg, color: texte }}>
                            {estUrgence ? bloc.statutLabel : STATUT_LABEL_COURT[bloc.statut as StatutRendezVous]}
                        </span>
                        <button onClick={onClose} className="btn btn-ghost btn-sm !p-1.5">
                            <X size={18} />
                        </button>
                    </div>
                </div>

                <div className="mt-4 space-y-5">
                    {/* Lien dossier */}
                    <div className="flex items-center justify-between px-3 py-2 rounded-xl border"
                         style={{ backgroundColor: 'var(--ht-primary-tint-bg)', borderColor: 'var(--ht-primary-tint)' }}>
                        <span className="text-xs flex items-center gap-1.5" style={{ color: 'var(--ht-primary-tint-text)' }}>
                            <Folder size={14} /> Dossier {bloc.patientDossier ? `#${bloc.patientDossier}` : 'existant'}
                        </span>
                        <button
                            onClick={() => navigate(`/patients/${bloc.patientId}`)}
                            className="text-xs font-semibold flex items-center gap-0.5 hover:underline"
                            style={{ color: 'var(--ht-primary-tint-text)' }}
                        >
                            Dossier complet <ArrowRight size={12} />
                        </button>
                    </div>

                    {/* Motif */}
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--ht-text-muted)' }}>Motif</p>
                        <p className="text-sm" style={{ color: 'var(--ht-text)' }}>{bloc.motif}</p>
                    </div>

                    {/* Dernières constantes */}
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--ht-text-muted)' }}>
                            Dernières constantes
                            {dernieresConstantes && ` (${new Date(dernieresConstantes.date).toLocaleDateString('fr-FR')})`}
                        </p>
                        {dernieresConstantes === undefined ? (
                            <p className="text-xs" style={{ color: 'var(--ht-text-muted)' }}>Chargement…</p>
                        ) : dernieresConstantes === null ? (
                            <p className="text-xs" style={{ color: 'var(--ht-text-muted)' }}>Aucune constante enregistrée</p>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-xl p-3 border" style={{ backgroundColor: 'var(--ht-bg)', borderColor: 'var(--ht-border)' }}>
                                {dernieresConstantes.tension_systolique !== null && dernieresConstantes.tension_diastolique !== null && (
                                    <ValeurConstante
                                        label="Tension"
                                        valeur={`${dernieresConstantes.tension_systolique}/${dernieresConstantes.tension_diastolique}`}
                                        unite="mmHg"
                                        alerte={
                                            horsSeuil(dernieresConstantes.tension_systolique, SEUILS.tensionSystolique) ||
                                            horsSeuil(dernieresConstantes.tension_diastolique, SEUILS.tensionDiastolique)
                                        }
                                    />
                                )}
                                {dernieresConstantes.temperature !== null && (
                                    <ValeurConstante
                                        label="Température"
                                        valeur={String(dernieresConstantes.temperature)}
                                        unite="°C"
                                        alerte={horsSeuil(dernieresConstantes.temperature, SEUILS.temperature)}
                                    />
                                )}
                                {dernieresConstantes.glycemie !== null && (
                                    <ValeurConstante
                                        label="Glycémie"
                                        valeur={String(dernieresConstantes.glycemie)}
                                        unite="mmol/L"
                                        alerte={horsSeuil(dernieresConstantes.glycemie, SEUILS.glycemie)}
                                    />
                                )}
                                {dernieresConstantes.frequence_cardiaque !== null && (
                                    <ValeurConstante
                                        label="Fréq. cardiaque"
                                        valeur={String(dernieresConstantes.frequence_cardiaque)}
                                        unite="bpm"
                                        alerte={horsSeuil(dernieresConstantes.frequence_cardiaque, SEUILS.frequenceCardiaque)}
                                    />
                                )}
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    {bloc.kind === 'rdv' && (
                        <div className="space-y-2 pt-1">
                            <div className="flex gap-2">
                                {bloc.statut === 'planifie' && (
                                    <button
                                        onClick={() => { onChangerStatut(bloc.id, 'confirme'); onClose() }}
                                        className="btn btn-primary btn-sm flex-1 gap-1.5"
                                    >
                                        <Check size={14} /> Confirmer
                                    </button>
                                )}
                                {(bloc.statut === 'planifie' || bloc.statut === 'confirme') && (
                                    <button
                                        onClick={() => { onChangerStatut(bloc.id, 'annule'); onClose() }}
                                        className="btn btn-danger btn-sm flex-1 gap-1.5"
                                    >
                                        <Ban size={14} /> Annuler
                                    </button>
                                )}
                            </div>
                            <button
                                onClick={() => onDemarrerConsultation(bloc)}
                                className="btn btn-success btn-full gap-1.5"
                            >
                                {bloc.consultationId ? 'Reprendre la consultation' : 'Démarrer la consultation'} <ArrowRight size={14} />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}