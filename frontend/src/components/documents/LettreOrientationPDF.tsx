import { Text } from '@react-pdf/renderer'
import type { ChampsLettreOrientation, ContexteDocument, DocumentGenere } from '../../types'
import { PDFDocumentShell, PDFSectionTexte, pdfStyles } from './DocumentPDFShell'

interface LettreOrientationPDFProps {
    document: DocumentGenere
    contexte: ContexteDocument
    champs: ChampsLettreOrientation
}

export default function LettreOrientationPDF({ document, contexte, champs }: LettreOrientationPDFProps) {
    return (
        <PDFDocumentShell document={document} contexte={contexte}>
            {champs.destinataire && (
                <Text style={[pdfStyles.paragraphe, { fontWeight: 'bold' }]}>À l'attention de : {champs.destinataire}</Text>
            )}
            <Text style={pdfStyles.paragraphe}>Cher confrère, chère consœur,</Text>
            <Text style={pdfStyles.paragraphe}>
                Je vous adresse {contexte.patient.prenom} {contexte.patient.nom}, {contexte.patient.age ?? '—'} ans
                {champs.motif_orientation ? `, que je suis actuellement pour : ${champs.motif_orientation}.` : '.'}
            </Text>
            <PDFSectionTexte titre="Éléments cliniques" texte={champs.elements_cliniques} />
            <PDFSectionTexte titre="Conclusion" texte={champs.conclusion} />
            <Text style={pdfStyles.paragraphe}>Je vous remercie de l'attention que vous porterez à ce patient.</Text>
            <Text style={pdfStyles.paragraphe}>Confraternellement,</Text>
        </PDFDocumentShell>
    )
}
