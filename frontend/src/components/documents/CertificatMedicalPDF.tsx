import { Text } from '@react-pdf/renderer'
import type { ChampsCertificatMedical, ContexteDocument, DocumentGenere } from '../../types'
import { PDFDocumentShell, PDFSectionTexte, pdfStyles } from './DocumentPDFShell'

interface CertificatMedicalPDFProps {
    document: DocumentGenere
    contexte: ContexteDocument
    champs: ChampsCertificatMedical
}

export default function CertificatMedicalPDF({ document, contexte, champs }: CertificatMedicalPDFProps) {
    const repos = champs.duree_repos_jours
        ? `${champs.duree_repos_jours} jour(s)${champs.date_debut ? `, du ${champs.date_debut}` : ''}${champs.date_fin ? ` au ${champs.date_fin}` : ''}`
        : null

    return (
        <PDFDocumentShell document={document} contexte={contexte}>
            <Text style={pdfStyles.paragraphe}>
                Je soussigné(e) Dr {contexte.medecin?.prenom} {contexte.medecin?.nom}, certifie avoir examiné ce jour{' '}
                {contexte.patient.prenom} {contexte.patient.nom}.
            </Text>
            <PDFSectionTexte titre="Motif" texte={champs.motif} />
            <PDFSectionTexte titre="Constat" texte={champs.constat} />
            {repos && <PDFSectionTexte titre="Repos prescrit" texte={repos} />}
            <PDFSectionTexte titre="Observations" texte={champs.observations} />
            <Text style={{ fontSize: 8.5, fontStyle: 'italic', color: '#6B7280', marginTop: 4 }}>
                Certificat établi à la demande de l'intéressé(e), pour faire valoir ce que de droit.
            </Text>
        </PDFDocumentShell>
    )
}
