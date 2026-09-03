import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import type { ChampsOrdonnance, ContexteDocument, DocumentGenere } from '../../types'
import { PDFHeader, PDFPatientBlock, PDFSectionTitre, PDFSignature, pdfStyles } from './DocumentPDFShell'

const styles = StyleSheet.create({
    medicamentsList: { marginBottom: 8 },
    medicamentItem: {
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#F3F4F6',
        borderRadius: 6,
        padding: 10,
        marginBottom: 9,
    },
    medicamentHeadRow: { flexDirection: 'row', alignItems: 'baseline' },
    medicamentNumber: { fontWeight: 'bold', fontSize: 9.5, color: '#111827', marginRight: 4 },
    medicamentName: { fontWeight: 'bold', fontSize: 9.5, color: '#0F172A' },
    medicamentDosage: { fontWeight: 'bold', fontSize: 9.5, color: '#2D8C7F', marginLeft: 4 },
    medicamentDetails: { marginTop: 5, paddingLeft: 12 },
    medicamentDetailLine: { fontSize: 9.5, color: '#374151', marginTop: 2 },
    medicamentDetailLabel: { fontWeight: 'bold', color: '#111827' },
    medicamentInstructions: { fontSize: 9, color: '#6B7280', fontStyle: 'italic', marginTop: 2 },
    noMedicaments: { textAlign: 'center', paddingVertical: 28, fontSize: 9.5, color: '#9CA3AF', fontStyle: 'italic' },
    recommendationsSection: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#E2E8F0' },
    recommendationsLabel: { fontWeight: 'bold', color: '#111827', fontSize: 9.5, marginBottom: 6 },
    recommendationsBox: {
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 6,
        padding: 10,
        fontSize: 9.5,
        color: '#4B5563',
    },
})

interface OrdonnancePDFProps {
    document: DocumentGenere
    contexte: ContexteDocument
    champs: ChampsOrdonnance
}

export default function OrdonnancePDF({ document, contexte, champs }: OrdonnancePDFProps) {
    return (
        <Document>
            <Page size="A4" style={pdfStyles.page} wrap>
                <PDFHeader document={document} contexte={contexte} />
                <PDFPatientBlock contexte={contexte} />

                <PDFSectionTitre>Prescription Médicale :</PDFSectionTitre>

                <View style={styles.medicamentsList}>
                    {champs.medicaments.length === 0 ? (
                        <Text style={styles.noMedicaments}>Aucun médicament ajouté à l'ordonnance.</Text>
                    ) : (
                        champs.medicaments.map((med, idx) => (
                            <View key={idx} style={styles.medicamentItem} wrap={false}>
                                <View style={styles.medicamentHeadRow}>
                                    <Text style={styles.medicamentNumber}>{idx + 1}.</Text>
                                    <Text style={styles.medicamentName}>{med.nom}</Text>
                                    <Text style={styles.medicamentDosage}>({med.dosage})</Text>
                                </View>
                                <View style={styles.medicamentDetails}>
                                    <Text style={styles.medicamentDetailLine}>
                                        • <Text style={styles.medicamentDetailLabel}>Posologie :</Text>
                                        {' '}{med.posologie} {med.frequence}
                                    </Text>
                                    <Text style={styles.medicamentDetailLine}>
                                        • <Text style={styles.medicamentDetailLabel}>Durée :</Text>
                                        {' '}{med.duree}
                                        {med.quantite ? <>
                                            {' — '}<Text style={styles.medicamentDetailLabel}>Qté :</Text> {med.quantite}
                                        </> : null}
                                    </Text>
                                    {med.conseils && (
                                        <Text style={styles.medicamentInstructions}>• Instructions : {med.conseils}</Text>
                                    )}
                                </View>
                            </View>
                        ))
                    )}
                </View>

                {champs.conseils_generaux && (
                    <View style={styles.recommendationsSection} wrap={false}>
                        <Text style={styles.recommendationsLabel}>Recommandations particulières :</Text>
                        <View style={styles.recommendationsBox}>
                            <Text>{champs.conseils_generaux}</Text>
                        </View>
                    </View>
                )}

                <PDFSignature contexte={contexte} />
            </Page>
        </Document>
    )
}
