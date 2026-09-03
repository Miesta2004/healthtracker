import { Text } from '@react-pdf/renderer'
import type { ChampsArretTravail, ContexteDocument, DocumentGenere } from '../../types'
import { PDFDocumentShell, PDFSectionTexte, PDFSectionTitre, pdfStyles } from './DocumentPDFShell'

interface ArretTravailPDFProps {
    document: DocumentGenere
    contexte: ContexteDocument
    champs: ChampsArretTravail
}

export default function ArretTravailPDF({ document, contexte, champs }: ArretTravailPDFProps) {
    const duree = champs.date_debut && champs.date_fin
        ? `Du ${champs.date_debut} au ${champs.date_fin}${champs.duree_jours ? ` (${champs.duree_jours} jour(s))` : ''}`
        : null

    return (
        <PDFDocumentShell document={document} contexte={contexte}>
            <Text style={pdfStyles.paragraphe}>
                Je soussigné(e) Dr {contexte.medecin?.prenom} {contexte.medecin?.nom}, certifie que l'état de santé de{' '}
                {contexte.patient.prenom} {contexte.patient.nom} nécessite un arrêt de travail.
            </Text>
            <PDFSectionTexte titre="Motif médical" texte={champs.motif_medical} />
            <PDFSectionTitre>Durée de l'arrêt</PDFSectionTitre>
            {duree
                ? <Text style={pdfStyles.sectionTexte}>{duree}</Text>
                : <Text style={pdfStyles.sectionVide}>À compléter.</Text>}
        </PDFDocumentShell>
    )
}
