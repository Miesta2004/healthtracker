import { pdf } from '@react-pdf/renderer'
import type {
    ChampsArretTravail,
    ChampsCertificatMedical,
    ChampsCompteRendu,
    ChampsDemandeExamen,
    ChampsLettreOrientation,
    ChampsOrdonnance,
    ContexteDocument,
    DocumentGenere,
    DonneesDocument,
} from '../types'
import OrdonnancePDF from '../components/documents/OrdonnancePDF'
import CertificatMedicalPDF from '../components/documents/CertificatMedicalPDF'
import DemandeExamenPDF from '../components/documents/DemandeExamenPDF'
import CompteRenduPDF from '../components/documents/CompteRenduPDF'
import LettreOrientationPDF from '../components/documents/LettreOrientationPDF'
import ArretTravailPDF from '../components/documents/ArretTravailPDF'

function construireDocumentPdf(docData: DocumentGenere, contexte: ContexteDocument, champs: DonneesDocument['champs']) {
    switch (docData.type_document) {
        case 'ordonnance':
            return <OrdonnancePDF document={docData} contexte={contexte} champs={champs as ChampsOrdonnance} />
        case 'certificat_medical':
            return <CertificatMedicalPDF document={docData} contexte={contexte} champs={champs as ChampsCertificatMedical} />
        case 'demande_analyse':
        case 'demande_imagerie':
            return <DemandeExamenPDF document={docData} contexte={contexte} champs={champs as ChampsDemandeExamen} />
        case 'compte_rendu_consultation':
            return <CompteRenduPDF document={docData} contexte={contexte} champs={champs as ChampsCompteRendu} />
        case 'lettre_orientation':
            return <LettreOrientationPDF document={docData} contexte={contexte} champs={champs as ChampsLettreOrientation} />
        case 'arret_travail':
            return <ArretTravailPDF document={docData} contexte={contexte} champs={champs as ChampsArretTravail} />
        default:
            return null
    }
}

export function usePdfDownload() {
    const genererEtTelechargerDocument = async (
        docData: DocumentGenere,
        contexte: ContexteDocument,
        champs: DonneesDocument['champs'],
    ) => {
        const element = construireDocumentPdf(docData, contexte, champs)
        if (!element) {
            console.error(`Aucun rendu PDF disponible pour le type "${docData.type_document}".`)
            return false
        }

        try {
            const pdfBlob = await pdf(element).toBlob()

            const url = URL.createObjectURL(pdfBlob)
            const downloadLink = document.createElement('a')
            downloadLink.href = url
            const prefixe = docData.type_document.replace(/_/g, '-')
            downloadLink.download = `${prefixe}-${contexte.patient.numero_dossier || 'patient'}-${new Date().toISOString().slice(0, 10)}.pdf`
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

    // Conservé pour compatibilité : équivalent à genererEtTelechargerDocument, typé pour l'ordonnance.
    const genererEtTelechargerOrdonnance = (docData: DocumentGenere, contexte: ContexteDocument, champs: ChampsOrdonnance) =>
        genererEtTelechargerDocument(docData, contexte, champs)

    return { genererEtTelechargerDocument, genererEtTelechargerOrdonnance }
}
