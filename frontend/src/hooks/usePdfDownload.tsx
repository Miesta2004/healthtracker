import { pdf } from '@react-pdf/renderer'
import type { DocumentGenere, ContexteDocument, ChampsOrdonnance } from '../types'
import OrdonnancePDF from '../components/documents/OrdonnancePDF'

export function usePdfDownload() {
    const genererEtTelechargerOrdonnance = async (
        docData: DocumentGenere,
        contexte: ContexteDocument,
        champs: ChampsOrdonnance,
    ) => {
        try {
            const pdfBlob = await pdf(
                <OrdonnancePDF document={docData} contexte={contexte} champs={champs} />
            ).toBlob()

            const url = URL.createObjectURL(pdfBlob)
            const downloadLink = document.createElement('a')
            downloadLink.href = url
            downloadLink.download = `ordonnance-${contexte.patient.numero_dossier || 'patient'}-${new Date().toISOString().slice(0, 10)}.pdf`
            document.body.appendChild(downloadLink)
            downloadLink.click()
            document.body.removeChild(downloadLink)
            URL.revokeObjectURL(url)

            return true
        } catch (error) {
            console.error('Erreur lors de la génération du PDF:', error)
            return false
        }
    }

    return { genererEtTelechargerOrdonnance }
}