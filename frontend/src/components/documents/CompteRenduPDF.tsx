import type { ChampsCompteRendu, ContexteDocument, DocumentGenere } from '../../types'
import { PDFDocumentShell, PDFSectionTexte } from './DocumentPDFShell'

interface CompteRenduPDFProps {
    document: DocumentGenere
    contexte: ContexteDocument
    champs: ChampsCompteRendu
}

export default function CompteRenduPDF({ document, contexte, champs }: CompteRenduPDFProps) {
    return (
        <PDFDocumentShell document={document} contexte={contexte}>
            {contexte.consultation && (
                <>
                    <PDFSectionTexte titre="Motif de consultation" texte={contexte.consultation.motif} />
                    <PDFSectionTexte titre="Observations cliniques" texte={contexte.consultation.symptomes} />
                    <PDFSectionTexte titre="Diagnostic" texte={contexte.consultation.diagnostic} />
                </>
            )}
            <PDFSectionTexte titre="Résumé" texte={champs.resume} />
            <PDFSectionTexte titre="Évolution" texte={champs.evolution} />
            <PDFSectionTexte titre="Recommandations" texte={champs.recommandations} />
        </PDFDocumentShell>
    )
}
