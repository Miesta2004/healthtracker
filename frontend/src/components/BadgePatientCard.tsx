import { QRCodeSVG } from 'qrcode.react'
import type { BadgePatient, BadgeAccompagnant } from '../types'

type Props =
    | { kind: 'patient'; badge: BadgePatient; format: 'badge' | 'bracelet' }
    | { kind: 'accompagnant'; badge: BadgeAccompagnant }

/**
 * Rendu visuel du badge (fiche à découper), du bracelet (étiquette longue,
 * format bracelet d'hospitalisation) ou du pass accompagnant. Pensé pour être
 * imprimé directement (voir window.print() dans la page parente).
 */
export default function BadgePatientCard(props: Props) {
    if (props.kind === 'accompagnant') {
        const { badge } = props
        return (
            <div
                className="bg-white"
                style={{ width: '320px', border: '1px solid #cbd5e1', borderRadius: '10px', overflow: 'hidden', color: '#0f172a' }}
            >
                <div style={{ backgroundColor: '#334155', color: 'white', padding: '8px 14px' }}>
                    <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em' }}>PASS ACCOMPAGNANT</p>
                </div>
                <div style={{ padding: '14px', display: 'flex', gap: '14px', alignItems: 'center' }}>
                    <QRCodeSVG value={badge.qr_payload} size={72} level="M" />
                    <div className="min-w-0 flex-1">
                        <p style={{ fontSize: '15px', fontWeight: 700, lineHeight: 1.2 }}>{badge.prenom} {badge.nom.toUpperCase()}</p>
                        {badge.lien_parente && (
                            <p style={{ fontSize: '11px', color: '#475569', marginTop: 2 }}>{badge.lien_parente} de :</p>
                        )}
                        <p style={{ fontSize: '13px', fontWeight: 600, marginTop: 2 }}>{badge.patient_prenom} {badge.patient_nom}</p>
                        <p style={{ fontSize: '10px', color: '#64748b' }}>N° {badge.patient_dossier}</p>
                    </div>
                </div>
                <div style={{ padding: '6px 14px', backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
                    <p style={{ fontSize: '9px', color: '#94a3b8' }}>
                        Généré le {new Date(badge.genere_le).toLocaleString('fr-FR')} · Accès autorisé à l'établissement
                    </p>
                </div>
            </div>
        )
    }

    const { badge, format } = props
    const dateNaissance = new Date(badge.date_naissance).toLocaleDateString('fr-FR')

    if (format === 'bracelet') {
        return (
            <div
                className="flex items-center gap-3 bg-white border-2 border-dashed"
                style={{ borderColor: '#94a3b8', padding: '10px 14px', width: '380px', borderRadius: '4px' }}
            >
                <QRCodeSVG value={badge.qr_payload} size={56} level="M" />
                <div className="min-w-0 flex-1" style={{ color: '#0f172a' }}>
                    <p style={{ fontSize: '13px', fontWeight: 700, lineHeight: 1.2 }}>
                        {badge.prenom.toUpperCase()} {badge.nom.toUpperCase()}
                        {badge.identite_provisoire && ' (PROVISOIRE)'}
                    </p>
                    <p style={{ fontSize: '10px', color: '#475569', marginTop: 2 }}>
                        Né(e) le {dateNaissance} · {badge.sexe === 'M' ? 'M' : 'F'}
                    </p>
                    <p style={{ fontSize: '10px', color: '#475569' }}>
                        N° {badge.numero_dossier}
                    </p>
                    <p style={{ fontSize: '10px', fontWeight: 600, color: '#0f172a', marginTop: 2 }}>
                        {badge.service_nom}
                    </p>
                    {badge.groupe_sanguin && (
                        <p style={{ fontSize: '10px', fontWeight: 700, color: '#b91c1c', marginTop: 2 }}>
                            Groupe : {badge.groupe_sanguin}
                        </p>
                    )}
                </div>
            </div>
        )
    }

    return (
        <div
            className="bg-white"
            style={{ width: '340px', border: '1px solid #cbd5e1', borderRadius: '10px', overflow: 'hidden', color: '#0f172a' }}
        >
            <div style={{ backgroundColor: badge.identite_provisoire ? '#b91c1c' : '#0f172a', color: 'white', padding: '8px 14px' }}>
                <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em' }}>
                    HEALTHTRACKER — BADGE PATIENT{badge.identite_provisoire ? ' · IDENTITÉ PROVISOIRE' : ''}
                </p>
            </div>

            <div style={{ padding: '14px', display: 'flex', gap: '14px', alignItems: 'center' }}>
                <QRCodeSVG value={badge.qr_payload} size={84} level="M" />
                <div className="min-w-0 flex-1">
                    <p style={{ fontSize: '16px', fontWeight: 700, lineHeight: 1.2 }}>{badge.prenom}</p>
                    <p style={{ fontSize: '16px', fontWeight: 700, lineHeight: 1.2 }}>{badge.nom.toUpperCase()}</p>
                    <p style={{ fontSize: '11px', color: '#475569', marginTop: 4 }}>
                        Né(e) le {dateNaissance} · {badge.sexe === 'M' ? 'Masculin' : 'Féminin'}
                    </p>
                </div>
            </div>

            <div style={{ borderTop: '1px dashed #cbd5e1', padding: '10px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                <div>
                    <p style={{ fontSize: '9px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>N° dossier</p>
                    <p style={{ fontSize: '13px', fontWeight: 700, fontFamily: 'monospace' }}>{badge.numero_dossier}</p>
                </div>
                <div>
                    <p style={{ fontSize: '9px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Service</p>
                    <p style={{ fontSize: '13px', fontWeight: 700 }}>{badge.service_nom}</p>
                </div>
                {badge.groupe_sanguin && (
                    <div>
                        <p style={{ fontSize: '9px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Groupe sanguin</p>
                        <p style={{ fontSize: '13px', fontWeight: 700, color: '#b91c1c' }}>{badge.groupe_sanguin}</p>
                    </div>
                )}
                {badge.allergies && (
                    <div>
                        <p style={{ fontSize: '9px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Allergies</p>
                        <p style={{ fontSize: '11px', fontWeight: 600, color: '#b91c1c' }}>{badge.allergies}</p>
                    </div>
                )}
            </div>

            <div style={{ padding: '6px 14px', backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
                <p style={{ fontSize: '9px', color: '#94a3b8' }}>
                    Généré le {new Date(badge.genere_le).toLocaleString('fr-FR')}
                </p>
            </div>
        </div>
    )
}
