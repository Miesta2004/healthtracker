import type {
    DocumentGenere, ContexteDocument, ChampsOrdonnance, ChampsCertificatMedical,
    ChampsDemandeExamen, ChampsCompteRendu, ChampsLettreOrientation, ChampsArretTravail,
} from '../../types'

function BlocPatient({ contexte }: { contexte: ContexteDocument }) {
    return (
        <table className="w-full text-xs mb-4">
            <tbody>
            <tr>
                <td className="py-0.5 pr-2 text-[var(--ht-text-muted)] w-1/4">Patient</td>
                <td className="py-0.5 font-semibold">{contexte.patient.prenom} {contexte.patient.nom}</td>
                <td className="py-0.5 pr-2 pl-4 text-[var(--ht-text-muted)] w-1/4">Dossier n°</td>
                <td className="py-0.5 font-semibold">{contexte.patient.numero_dossier}</td>
            </tr>
            <tr>
                <td className="py-0.5 pr-2 text-[var(--ht-text-muted)]">Né(e) le</td>
                <td className="py-0.5 font-semibold">{contexte.patient.date_naissance}</td>
                <td className="py-0.5 pr-2 pl-4 text-[var(--ht-text-muted)]">Âge / Sexe</td>
                <td className="py-0.5 font-semibold">{contexte.patient.age ?? '—'} ans — {contexte.patient.sexe}</td>
            </tr>
            </tbody>
        </table>
    )
}

interface ApercuProps<C> {
    document: DocumentGenere
    contexte: ContexteDocument
    champs: C
}

function SectionTexte({ titre, texte }: { titre: string; texte: string }) {
    if (!texte) return null
    return (
        <div className="mb-3.5">
            <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--ht-primary)' }}>{titre}</p>
            <p className="text-[13px] whitespace-pre-wrap leading-snug">{texte}</p>
        </div>
    )
}

function ApercuOrdonnance({ champs }: ApercuProps<ChampsOrdonnance>) {
    return (
        <div>
            <p className="text-[10px] font-bold uppercase tracking-wide mb-1.5" style={{ color: 'var(--ht-primary)' }}>Prescription</p>
            {champs.medicaments.length === 0 ? (
                <p className="text-[13px] italic" style={{ color: 'var(--ht-text-muted)' }}>Aucun médicament ajouté.</p>
            ) : (
                <table className="w-full text-[12px] border-collapse mb-3">
                    <thead>
                    <tr className="border-b" style={{ borderColor: 'var(--ht-border)' }}>
                        <th className="text-left py-1 font-medium" style={{ color: 'var(--ht-text-muted)' }}>Médicament</th>
                        <th className="text-left py-1 font-medium" style={{ color: 'var(--ht-text-muted)' }}>Dosage</th>
                        <th className="text-left py-1 font-medium" style={{ color: 'var(--ht-text-muted)' }}>Posologie</th>
                        <th className="text-left py-1 font-medium" style={{ color: 'var(--ht-text-muted)' }}>Durée</th>
                    </tr>
                    </thead>
                    <tbody>
                    {champs.medicaments.map((m, i) => (
                        <tr key={i} className="border-b" style={{ borderColor: 'var(--ht-border)' }}>
                            <td className="py-1.5 font-semibold">
                                {m.nom || '—'}
                                {m.conseils && <div className="text-[10px] font-normal" style={{ color: 'var(--ht-text-muted)' }}>{m.conseils}</div>}
                            </td>
                            <td className="py-1.5">{m.dosage}</td>
                            <td className="py-1.5">{m.posologie} {m.frequence}</td>
                            <td className="py-1.5">{m.duree}</td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            )}
            <SectionTexte titre="Conseils" texte={champs.conseils_generaux} />
        </div>
    )
}

function ApercuCertificatMedical({ contexte, champs }: ApercuProps<ChampsCertificatMedical>) {
    return (
        <div>
            <p className="text-[13px] mb-3">
                Je soussigné(e) Dr {contexte.medecin?.prenom} {contexte.medecin?.nom}, certifie avoir examiné ce jour{' '}
                {contexte.patient.prenom} {contexte.patient.nom}.
            </p>
            <SectionTexte titre="Motif" texte={champs.motif} />
            <SectionTexte titre="Constat" texte={champs.constat} />
            {champs.duree_repos_jours && (
                <SectionTexte
                    titre="Repos prescrit"
                    texte={`${champs.duree_repos_jours} jour(s)${champs.date_debut ? `, du ${champs.date_debut}` : ''}${champs.date_fin ? ` au ${champs.date_fin}` : ''}`}
                />
            )}
            <SectionTexte titre="Observations" texte={champs.observations} />
            <p className="text-[11px] italic mt-3" style={{ color: 'var(--ht-text-muted)' }}>
                Certificat établi à la demande de l'intéressé(e), pour faire valoir ce que de droit.
            </p>
        </div>
    )
}

function ApercuDemandeExamen({ champs }: ApercuProps<ChampsDemandeExamen>) {
    return (
        <div>
            <p className="text-[13px] mb-3">
                Urgence :{' '}
                <span className="font-semibold" style={{ color: champs.urgence === 'urgente' ? 'var(--ht-danger)' : 'inherit' }}>
                    {champs.urgence === 'urgente' ? 'URGENTE' : 'Normale'}
                </span>
            </p>
            <SectionTexte titre="Indication clinique" texte={champs.indication_clinique} />
            <p className="text-[10px] font-bold uppercase tracking-wide mb-1.5" style={{ color: 'var(--ht-primary)' }}>Examens demandés</p>
            {champs.examens.length === 0 ? (
                <p className="text-[13px] italic" style={{ color: 'var(--ht-text-muted)' }}>Aucun examen sélectionné.</p>
            ) : (
                <ul className="text-[13px] list-disc pl-4 mb-3">
                    {champs.examens.map((e, i) => (
                        <li key={i}>{e.nom} <span className="text-[10px]" style={{ color: 'var(--ht-text-muted)' }}>({e.categorie === 'imagerie' ? 'imagerie' : 'biologie'})</span></li>
                    ))}
                </ul>
            )}
            <SectionTexte titre="Commentaires" texte={champs.commentaires} />
        </div>
    )
}

function ApercuCompteRendu({ contexte, champs }: ApercuProps<ChampsCompteRendu>) {
    return (
        <div>
            {contexte.consultation && (
                <>
                    <SectionTexte titre="Motif de consultation" texte={contexte.consultation.motif} />
                    <SectionTexte titre="Observations cliniques" texte={contexte.consultation.symptomes} />
                    <SectionTexte titre="Diagnostic" texte={contexte.consultation.diagnostic} />
                </>
            )}
            <SectionTexte titre="Résumé" texte={champs.resume} />
            <SectionTexte titre="Évolution" texte={champs.evolution} />
            <SectionTexte titre="Recommandations" texte={champs.recommandations} />
        </div>
    )
}

function ApercuLettreOrientation({ contexte, champs }: ApercuProps<ChampsLettreOrientation>) {
    return (
        <div>
            {champs.destinataire && <p className="text-[13px] font-semibold mb-2">À l'attention de : {champs.destinataire}</p>}
            <p className="text-[13px] mb-2">Cher confrère, chère consœur,</p>
            <p className="text-[13px] mb-3">
                Je vous adresse {contexte.patient.prenom} {contexte.patient.nom}, {contexte.patient.age ?? '—'} ans
                {champs.motif_orientation ? `, que je suis actuellement pour : ${champs.motif_orientation}.` : '.'}
            </p>
            <SectionTexte titre="Éléments cliniques" texte={champs.elements_cliniques} />
            <SectionTexte titre="Conclusion" texte={champs.conclusion} />
            <p className="text-[13px] mt-3">Je vous remercie de l'attention que vous porterez à ce patient.</p>
            <p className="text-[13px]">Confraternellement,</p>
        </div>
    )
}

function ApercuArretTravail({ contexte, champs }: ApercuProps<ChampsArretTravail>) {
    return (
        <div>
            <p className="text-[13px] mb-3">
                Je soussigné(e) Dr {contexte.medecin?.prenom} {contexte.medecin?.nom}, certifie que l'état de santé de{' '}
                {contexte.patient.prenom} {contexte.patient.nom} nécessite un arrêt de travail.
            </p>
            <SectionTexte titre="Motif médical" texte={champs.motif_medical} />
            <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--ht-primary)' }}>Durée de l'arrêt</p>
            <p className="text-[13px]">
                {champs.date_debut && champs.date_fin
                    ? `Du ${champs.date_debut} au ${champs.date_fin}${champs.duree_jours ? ` (${champs.duree_jours} jour(s))` : ''}`
                    : <span className="italic" style={{ color: 'var(--ht-text-muted)' }}>À compléter</span>}
            </p>
        </div>
    )
}

export default function ApercuA4({ document }: { document: DocumentGenere }) {
    const { contexte, champs } = document.donnees
    const entete = document.entete_rendue ?? ''
    const piedDePage = document.pied_de_page_rendu ?? ''

    return (
        <div
            id="apercu-a4-impression"
            className="bg-white mx-auto shadow-lg"
            style={{ width: '210mm', minHeight: '297mm', padding: '18mm 16mm', color: '#1a1a1a', fontFamily: 'Georgia, serif' }}
        >
            {entete && (
                <div className="text-[11px] pb-2.5 mb-4 border-b-[1.5px]" style={{ borderColor: 'var(--ht-primary)', color: '#444' }}>
                    {entete.split('\n').map((l, i) => <div key={i}>{l}</div>)}
                </div>
            )}

            <h1 className="text-xl font-bold mb-0.5" style={{ color: 'var(--ht-primary)' }}>
                {document.type_document_label}
            </h1>
            <p className="text-[11px] mb-4" style={{ color: 'var(--ht-text-muted)' }}>
                Fait le {contexte.date_jour}{contexte.service ? ` — ${contexte.service.nom}` : ''}
            </p>

            <BlocPatient contexte={contexte} />

            {document.type_document === 'ordonnance' && <ApercuOrdonnance document={document} contexte={contexte} champs={champs as ChampsOrdonnance} />}
            {document.type_document === 'certificat_medical' && <ApercuCertificatMedical document={document} contexte={contexte} champs={champs as ChampsCertificatMedical} />}
            {(document.type_document === 'demande_analyse' || document.type_document === 'demande_imagerie') && (
                <ApercuDemandeExamen document={document} contexte={contexte} champs={champs as ChampsDemandeExamen} />
            )}
            {document.type_document === 'compte_rendu_consultation' && <ApercuCompteRendu document={document} contexte={contexte} champs={champs as ChampsCompteRendu} />}
            {document.type_document === 'lettre_orientation' && <ApercuLettreOrientation document={document} contexte={contexte} champs={champs as ChampsLettreOrientation} />}
            {document.type_document === 'arret_travail' && <ApercuArretTravail document={document} contexte={contexte} champs={champs as ChampsArretTravail} />}

            <div className="text-right text-[13px] mt-10 whitespace-pre-wrap">
                Dr {contexte.medecin?.prenom} {contexte.medecin?.nom}
                {contexte.medecin?.signature && <div className="mt-1">{contexte.medecin.signature}</div>}
            </div>

            {piedDePage && (
                <div className="text-[10px] mt-8 pt-2.5 border-t whitespace-pre-wrap" style={{ borderColor: 'var(--ht-border)', color: 'var(--ht-text-muted)' }}>
                    {piedDePage}
                </div>
            )}
        </div>
    )
}
