import type {
    DocumentGenere, ContexteDocument, ChampsOrdonnance, ChampsCertificatMedical,
    ChampsDemandeExamen, ChampsCompteRendu, ChampsLettreOrientation, ChampsArretTravail,
} from '../../types'

interface ApercuProps<C> {
    document: DocumentGenere
    contexte: ContexteDocument
    champs: C
}

// Palette fixe et volontairement indépendante du thème de l'appli (clair/sombre) :
// un document médical imprimé/signé doit toujours avoir le même rendu, quel que
// soit le thème choisi par la personne qui l'imprime. Ne jamais remplacer ces
// valeurs par des `var(--ht-*)`.
const A4_COULEURS = {
    primaire: '#2D8C7F',
    texte: '#111827',
    texteMuted: '#6B7280',
    bordure: '#E2E8F0',
    fond: '#F8FAFC',
    danger: '#DC2626',
} as const

export default function ApercuA4({ document }: { document: DocumentGenere }) {
    const { contexte, champs } = document.donnees
    const entete = document.entete_rendue ?? ''
    const piedDePage = document.pied_de_page_rendu ?? ''
    const numero = `${document.type_document.toUpperCase()}-${String(document.id).padStart(6, '0')}`

    return (
        <div
            id="apercu-a4-impression"
            className="bg-white mx-auto shadow-lg"
            style={{
                width: '210mm',
                minHeight: '297mm',
                padding: '18mm 16mm',
                color: A4_COULEURS.texte,
                fontFamily: "'Inter', ui-sans-serif, system-ui, -apple-system, Helvetica, Arial, sans-serif"
            }}
        >
            {entete && (
                <div
                    className="text-[11px] pb-2.5 mb-4 border-b"
                    style={{ borderColor: A4_COULEURS.bordure, color: A4_COULEURS.texteMuted }}
                >
                    {entete.split('\n').map((l, i) => <div key={i}>{l}</div>)}
                </div>
            )}

            {/* EN-TÊTE — identité HealthTracker + médecin à gauche, date/référence à droite */}
            <div className="flex justify-between items-start border-b pb-4 mb-4" style={{ borderColor: A4_COULEURS.bordure }}>
                <div>
                    <div className="font-black text-lg tracking-tight" style={{ color: A4_COULEURS.primaire }}>
                        HealthTracker SIH
                    </div>
                    <div className="text-[10px] font-semibold mt-0.5" style={{ color: A4_COULEURS.texteMuted }}>
                        Centre Hospitalier Universitaire &amp; Médical
                    </div>
                    <div className="text-[11px] font-semibold mt-1.5" style={{ color: A4_COULEURS.texte }}>
                        Dr {contexte.medecin?.prenom} {contexte.medecin?.nom}
                    </div>
                    <div className="text-[10px]" style={{ color: A4_COULEURS.texteMuted }}>
                        {contexte.service?.nom || 'Médecine Générale'}
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-[11px] font-bold" style={{ color: A4_COULEURS.texte }}>
                        Dakar, le {contexte.date_jour}
                    </div>
                    <div className="text-[10px] mt-1" style={{ color: A4_COULEURS.texteMuted }}>
                        {document.type_document_label} — N° {numero}
                    </div>
                </div>
            </div>

            <BlocPatient contexte={contexte} />

            {document.type_document === 'ordonnance' && <ApercuOrdonnance document={document} contexte={contexte} champs={champs as ChampsOrdonnance} />}
            {document.type_document === 'certificat_medical' && <ApercuCertificatMedical document={document} contexte={contexte} champs={champs as ChampsCertificatMedical} />}
            {(document.type_document === 'demande_analyse' || document.type_document === 'demande_imagerie') && (
                <ApercuDemandeExamen document={document} contexte={contexte} champs={champs as ChampsDemandeExamen} />
            )}
            {document.type_document === 'compte_rendu_consultation' && <ApercuCompteRendu document={document} contexte={contexte} champs={champs as ChampsCompteRendu} />}
            {document.type_document === 'lettre_orientation' && <ApercuLettreOrientation document={document} contexte={contexte} champs={champs as ChampsLettreOrientation} />}
            {document.type_document === 'arret_travail' && <ApercuArretTravail document={document} contexte={contexte} champs={champs as ChampsArretTravail} />}

            {/* SIGNATURE — disclaimer à gauche, nom + cachet pointillé à droite */}
            <div className="pt-6 mt-10 border-t flex justify-between items-end" style={{ borderColor: A4_COULEURS.bordure }}>
                <div className="text-[9px] max-w-[55%]" style={{ color: '#9CA3AF' }}>
                    Document généré de façon sécurisée par HealthTracker SIH.<br />
                    Authenticité vérifiable via signature praticien.
                </div>
                <div className="text-right">
                    <div className="text-[11px] font-bold" style={{ color: A4_COULEURS.texte }}>
                        Dr {contexte.medecin?.prenom} {contexte.medecin?.nom}
                    </div>
                    <div className="text-[9px] italic mb-2" style={{ color: A4_COULEURS.texteMuted }}>
                        Signature &amp; Cachet médical
                    </div>
                    {contexte.medecin?.signature && (
                        <div className="text-[9px] italic mb-2 whitespace-pre-wrap" style={{ color: A4_COULEURS.texteMuted }}>
                            {contexte.medecin.signature}
                        </div>
                    )}
                    <div
                        className="w-36 h-12 border-2 border-dashed rounded-lg flex items-center justify-center text-[9px] ml-auto"
                        style={{ borderColor: '#CBD5E1', color: '#94A3B8' }}
                    >
                        [ Cachet Médecin ]
                    </div>
                </div>
            </div>

            {piedDePage && (
                <div
                    className="text-[10px] mt-8 pt-2.5 border-t whitespace-pre-wrap"
                    style={{
                        borderColor: A4_COULEURS.bordure,
                        color: A4_COULEURS.texteMuted
                    }}
                >
                    {piedDePage}
                </div>
            )}
        </div>
    )
}

function BlocPatient({ contexte }: { contexte: ContexteDocument }) {
    return (
        <div
            className="flex justify-between items-center text-xs rounded-xl px-4 py-3 mb-5 border"
            style={{ backgroundColor: A4_COULEURS.fond, borderColor: A4_COULEURS.bordure }}
        >
            <div>
                <span style={{ color: A4_COULEURS.texteMuted }}>Patient(e) :</span>{' '}
                <span className="font-bold text-[13px]" style={{ color: A4_COULEURS.texte }}>{contexte.patient.prenom} {contexte.patient.nom}</span>
            </div>
            <div>
                <span style={{ color: A4_COULEURS.texteMuted }}>Âge / Sexe :</span>{' '}
                <span className="font-semibold" style={{ color: A4_COULEURS.texte }}>{contexte.patient.age ?? 'N/A'} ans ({contexte.patient.sexe})</span>
            </div>
            <div>
                <span style={{ color: A4_COULEURS.texteMuted }}>N° Dossier :</span>{' '}
                <span className="font-mono font-bold" style={{ color: A4_COULEURS.primaire }}>{contexte.patient.numero_dossier}</span>
            </div>
        </div>
    )
}

function SectionTexte({ titre, texte }: { titre: string; texte: string }) {
    if (!texte) return null
    return (
        <div className="mb-3.5">
            <p className="text-[10px] font-extrabold uppercase tracking-widest pb-1.5 mb-1.5 border-b" style={{ color: A4_COULEURS.texte, borderColor: A4_COULEURS.bordure }}>{titre}</p>
            <p className="text-[13px] whitespace-pre-wrap leading-snug" style={{ color: A4_COULEURS.texte }}>{texte}</p>
        </div>
    )
}

function ApercuOrdonnance({ champs }: ApercuProps<ChampsOrdonnance>) {
    return (
        <div>
            <p className="text-[11px] font-extrabold uppercase tracking-widest pb-2 mb-3 border-b" style={{ color: A4_COULEURS.texte, borderColor: A4_COULEURS.bordure }}>
                Prescription Médicale :
            </p>
            {champs.medicaments.length === 0 ? (
                <p className="text-[13px] italic text-center py-8" style={{ color: A4_COULEURS.texteMuted }}>Aucun médicament ajouté à l'ordonnance.</p>
            ) : (
                <ol className="space-y-3 list-decimal list-inside text-xs">
                    {champs.medicaments.map((m, i) => (
                        <li key={i} className="p-3 rounded-lg border" style={{ backgroundColor: '#F9FAFB', borderColor: '#F3F4F6' }}>
                            <span className="font-bold text-[13px]" style={{ color: '#0F172A' }}>{m.nom || '—'}</span>{' '}
                            <span className="font-bold" style={{ color: A4_COULEURS.primaire }}>({m.dosage})</span>
                            <div className="pl-5 mt-1 space-y-0.5" style={{ color: '#374151' }}>
                                <div>• <strong style={{ color: A4_COULEURS.texte }}>Posologie :</strong> {m.posologie} {m.frequence}</div>
                                <div>• <strong style={{ color: A4_COULEURS.texte }}>Durée :</strong> {m.duree}{m.quantite && <> — <strong style={{ color: A4_COULEURS.texte }}>Qté :</strong> {m.quantite}</>}</div>
                                {m.conseils && <div className="italic" style={{ color: A4_COULEURS.texteMuted }}>• Instructions : {m.conseils}</div>}
                            </div>
                        </li>
                    ))}
                </ol>
            )}
            {champs.conseils_generaux && (
                <div className="mt-5 pt-4 border-t text-xs" style={{ borderColor: A4_COULEURS.bordure }}>
                    <strong style={{ color: A4_COULEURS.texte }}>Recommandations particulières :</strong>
                    <p className="mt-1.5 p-3 rounded-lg border whitespace-pre-wrap" style={{ color: '#4B5563', backgroundColor: A4_COULEURS.fond, borderColor: A4_COULEURS.bordure }}>
                        {champs.conseils_generaux}
                    </p>
                </div>
            )}
        </div>
    )
}

function ApercuCertificatMedical({ contexte, champs }: ApercuProps<ChampsCertificatMedical>) {
    return (
        <div>
            <p className="text-[13px] mb-3" style={{ color: A4_COULEURS.texte }}>
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
            <p className="text-[11px] italic mt-3" style={{ color: A4_COULEURS.texteMuted }}>
                Certificat établi à la demande de l'intéressé(e), pour faire valoir ce que de droit.
            </p>
        </div>
    )
}

function ApercuDemandeExamen({ champs }: ApercuProps<ChampsDemandeExamen>) {
    return (
        <div>
            <p className="text-[13px] mb-3" style={{ color: A4_COULEURS.texte }}>
                Urgence :{' '}
                <span className="font-semibold" style={{ color: champs.urgence === 'urgente' ? A4_COULEURS.danger : 'inherit' }}>
                    {champs.urgence === 'urgente' ? 'URGENTE' : 'Normale'}
                </span>
            </p>
            <SectionTexte titre="Indication clinique" texte={champs.indication_clinique} />
            <p className="text-[10px] font-extrabold uppercase tracking-widest pb-1.5 mb-1.5 border-b" style={{ color: A4_COULEURS.texte, borderColor: A4_COULEURS.bordure }}>Examens demandés</p>
            {champs.examens.length === 0 ? (
                <p className="text-[13px] italic" style={{ color: A4_COULEURS.texteMuted }}>Aucun examen sélectionné.</p>
            ) : (
                <ul className="text-[13px] list-disc pl-4 mb-3" style={{ color: A4_COULEURS.texte }}>
                    {champs.examens.map((e, i) => (
                        <li key={i}>{e.nom} <span className="text-[10px]" style={{ color: A4_COULEURS.texteMuted }}>({e.categorie === 'imagerie' ? 'imagerie' : 'biologie'})</span></li>
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
            {champs.destinataire && <p className="text-[13px] font-semibold mb-2" style={{ color: A4_COULEURS.texte }}>À l'attention de : {champs.destinataire}</p>}
            <p className="text-[13px] mb-2" style={{ color: A4_COULEURS.texte }}>Cher confrère, chère consœur,</p>
            <p className="text-[13px] mb-3" style={{ color: A4_COULEURS.texte }}>
                Je vous adresse {contexte.patient.prenom} {contexte.patient.nom}, {contexte.patient.age ?? '—'} ans
                {champs.motif_orientation ? `, que je suis actuellement pour : ${champs.motif_orientation}.` : '.'}
            </p>
            <SectionTexte titre="Éléments cliniques" texte={champs.elements_cliniques} />
            <SectionTexte titre="Conclusion" texte={champs.conclusion} />
            <p className="text-[13px] mt-3" style={{ color: A4_COULEURS.texte }}>Je vous remercie de l'attention que vous porterez à ce patient.</p>
            <p className="text-[13px]" style={{ color: A4_COULEURS.texte }}>Confraternellement,</p>
        </div>
    )
}

function ApercuArretTravail({ contexte, champs }: ApercuProps<ChampsArretTravail>) {
    return (
        <div>
            <p className="text-[13px] mb-3" style={{ color: A4_COULEURS.texte }}>
                Je soussigné(e) Dr {contexte.medecin?.prenom} {contexte.medecin?.nom}, certifie que l'état de santé de{' '}
                {contexte.patient.prenom} {contexte.patient.nom} nécessite un arrêt de travail.
            </p>
            <SectionTexte titre="Motif médical" texte={champs.motif_medical} />
            <p className="text-[10px] font-extrabold uppercase tracking-widest" style={{ color: A4_COULEURS.texte }}>Durée de l'arrêt</p>
            <p className="text-[13px]" style={{ color: A4_COULEURS.texte }}>
                {champs.date_debut && champs.date_fin
                    ? `Du ${champs.date_debut} au ${champs.date_fin}${champs.duree_jours ? ` (${champs.duree_jours} jour(s))` : ''}`
                    : <span className="italic" style={{ color: A4_COULEURS.texteMuted }}>À compléter</span>}
            </p>
        </div>
    )
}
