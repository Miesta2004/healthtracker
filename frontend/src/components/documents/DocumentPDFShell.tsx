// Composants et styles partagés par tous les documents PDF (@react-pdf/renderer) :
// en-tête HealthTracker, bloc patient, alerte allergies, signature/cachet, et
// briques de section génériques. Un seul moteur de rendu / une seule identité
// visuelle pour les 6 types de documents — chaque type a son propre fichier
// (OrdonnancePDF.tsx, CertificatMedicalPDF.tsx, DemandeExamenPDF.tsx,
// CompteRenduPDF.tsx, LettreOrientationPDF.tsx, ArretTravailPDF.tsx) qui
// s'appuie sur ce socle commun.
import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import type { ReactNode } from 'react'
import type { ContexteDocument, DocumentGenere } from '../../types'

export const pdfStyles = StyleSheet.create({
    page: {
        paddingTop: 40,
        paddingBottom: 40,
        paddingHorizontal: 36,
        fontSize: 10,
        fontFamily: 'Helvetica',
        color: '#111827',
        lineHeight: 1.4,
    },

    // EN-TÊTE
    headerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
        paddingBottom: 16,
        marginBottom: 16,
    },
    headerLeft: { flexDirection: 'column' },
    headerRight: { flexDirection: 'column', alignItems: 'flex-end' },
    marque: { fontSize: 17, fontWeight: 'bold', color: '#2D8C7F', letterSpacing: 0.3 },
    marqueSoustitre: { fontSize: 8, color: '#6B7280', fontWeight: 'bold', marginTop: 3 },
    medecinNom: { fontSize: 9, fontWeight: 'bold', color: '#374151', marginTop: 9 },
    medecinSpecialite: { fontSize: 8, color: '#6B7280', marginTop: 1 },
    dateLieu: { fontSize: 9.5, fontWeight: 'bold', color: '#111827' },
    documentNum: { fontSize: 8.5, color: '#6B7280', marginTop: 4 },

    // BLOC PATIENT
    patientBlock: {
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 8,
        paddingVertical: 10,
        paddingHorizontal: 14,
        marginBottom: 18,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    patientField: { flexDirection: 'row', alignItems: 'baseline' },
    patientLabel: { color: '#6B7280', fontSize: 9 },
    patientValue: { fontWeight: 'bold', color: '#111827', fontSize: 9.5, marginLeft: 4 },
    patientValueAccent: { fontWeight: 'bold', color: '#2D8C7F', fontSize: 9.5, marginLeft: 4, fontFamily: 'Courier-Bold' },

    // ALERTE ALLERGIES
    alerteAllergies: {
        backgroundColor: '#FEF2F2',
        borderWidth: 1,
        borderColor: '#FCA5A5',
        borderRadius: 6,
        paddingVertical: 7,
        paddingHorizontal: 12,
        marginBottom: 16,
        fontSize: 9,
        color: '#7A2419',
    },
    alerteAllergiesLabel: { fontWeight: 'bold', color: '#DC2626' },

    // SECTIONS GÉNÉRIQUES (certificat, compte-rendu, lettre, arrêt de travail)
    sectionTitre: {
        fontSize: 8.5,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 1,
        color: '#111827',
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
        paddingBottom: 5,
        marginBottom: 6,
    },
    sectionTexte: { fontSize: 10, color: '#111827', marginBottom: 12 },
    sectionVide: { fontSize: 9.5, color: '#9CA3AF', fontStyle: 'italic', marginBottom: 12 },
    paragraphe: { fontSize: 10, color: '#111827', marginBottom: 10 },
    encadre: {
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 6,
        padding: 10,
        fontSize: 9.5,
        color: '#4B5563',
        marginBottom: 12,
    },

    // SIGNATURE
    signatureSection: {
        marginTop: 28,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#E2E8F0',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
    },
    signatureLeft: { fontSize: 7.5, color: '#9CA3AF', flex: 1, lineHeight: 1.5, paddingRight: 20 },
    signatureRight: { alignItems: 'flex-end' },
    signatureMedecinNom: { fontSize: 9.5, fontWeight: 'bold', color: '#111827', marginBottom: 3 },
    signatureLabel: { fontSize: 8, color: '#6B7280', fontStyle: 'italic', marginBottom: 20 },
    signatureStamp: {
        width: 130,
        height: 44,
        borderWidth: 1.5,
        borderStyle: 'dashed',
        borderColor: '#CBD5E1',
        borderRadius: 4,
        alignItems: 'center',
        justifyContent: 'center',
    },
    signatureStampText: { fontSize: 7.5, color: '#94A3B8' },
})

export function numeroDocument(document: DocumentGenere): string {
    return `${document.type_document.toUpperCase()}-${String(document.id).padStart(6, '0')}`
}

export function PDFHeader({ document, contexte }: { document: DocumentGenere; contexte: ContexteDocument }) {
    return (
        <View style={pdfStyles.headerContainer} fixed>
            <View style={pdfStyles.headerLeft}>
                <Text style={pdfStyles.marque}>HealthTracker SIH</Text>
                <Text style={pdfStyles.marqueSoustitre}>Centre Hospitalier Universitaire & Médical</Text>
                <Text style={pdfStyles.medecinNom}>Dr {contexte.medecin?.prenom} {contexte.medecin?.nom}</Text>
                <Text style={pdfStyles.medecinSpecialite}>{contexte.service?.nom || 'Médecine Générale'}</Text>
            </View>
            <View style={pdfStyles.headerRight}>
                <Text style={pdfStyles.dateLieu}>Dakar, le {contexte.date_jour}</Text>
                <Text style={pdfStyles.documentNum}>
                    {document.type_document_label || 'Document'} — N° {numeroDocument(document)}
                </Text>
            </View>
        </View>
    )
}

export function PDFPatientBlock({ contexte }: { contexte: ContexteDocument }) {
    return (
        <View style={pdfStyles.patientBlock}>
            <View style={pdfStyles.patientField}>
                <Text style={pdfStyles.patientLabel}>Patient(e) :</Text>
                <Text style={pdfStyles.patientValue}>{contexte.patient.prenom} {contexte.patient.nom}</Text>
            </View>
            <View style={pdfStyles.patientField}>
                <Text style={pdfStyles.patientLabel}>Âge / Sexe :</Text>
                <Text style={pdfStyles.patientValue}>{contexte.patient.age ?? 'N/A'} ans ({contexte.patient.sexe})</Text>
            </View>
            <View style={pdfStyles.patientField}>
                <Text style={pdfStyles.patientLabel}>N° Dossier :</Text>
                <Text style={pdfStyles.patientValueAccent}>{contexte.patient.numero_dossier}</Text>
            </View>
        </View>
    )
}

export function PDFSignature({ contexte }: { contexte: ContexteDocument }) {
    return (
        <View style={pdfStyles.signatureSection} wrap={false}>
            <Text style={pdfStyles.signatureLeft}>
                Document généré de façon sécurisée par HealthTracker SIH.{'\n'}
                Authenticité vérifiable via signature praticien.
            </Text>
            <View style={pdfStyles.signatureRight}>
                <Text style={pdfStyles.signatureMedecinNom}>Dr {contexte.medecin?.prenom} {contexte.medecin?.nom}</Text>
                <Text style={pdfStyles.signatureLabel}>Signature & Cachet médical</Text>
                <View style={pdfStyles.signatureStamp}>
                    <Text style={pdfStyles.signatureStampText}>[ Cachet Médecin ]</Text>
                </View>
            </View>
        </View>
    )
}

export function PDFSectionTitre({ children }: { children: string }) {
    return <Text style={pdfStyles.sectionTitre}>{children}</Text>
}

export function PDFSectionTexte({ titre, texte }: { titre: string; texte: string | null | undefined }) {
    return (
        <View wrap={false}>
            <PDFSectionTitre>{titre}</PDFSectionTitre>
            {texte
                ? <Text style={pdfStyles.sectionTexte}>{texte}</Text>
                : <Text style={pdfStyles.sectionVide}>Non renseigné.</Text>}
        </View>
    )
}

/** Page A4 standard (en-tête + bloc patient + contenu + signature) utilisée par
 * les 5 types de documents autres que l'ordonnance (qui a une mise en page
 * spécifique pour ses cartes médicaments). */
export function PDFDocumentShell({ document, contexte, children }: {
    document: DocumentGenere
    contexte: ContexteDocument
    children: ReactNode
}) {
    return (
        <Document>
            <Page size="A4" style={pdfStyles.page} wrap>
                <PDFHeader document={document} contexte={contexte} />
                <PDFPatientBlock contexte={contexte} />
                {children}
                <PDFSignature contexte={contexte} />
            </Page>
        </Document>
    )
}
