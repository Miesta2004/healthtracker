import { PDFDocument as Document, PDFPage as Page, PDFText as Text, PDFView as View, StyleSheet } from './pdf-primitives'
import type { DocumentGenere, ContexteDocument, ChampsOrdonnance } from '../../types'

const styles = StyleSheet.create({
    page: {
        padding: 32,
        fontSize: 11,
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
        paddingBottom: 24,
        marginBottom: 24,
    },

    headerLeft: {
        flex: 1,
    },

    headerRight: {
        flex: 1,
        textAlign: 'right',
    },

    logo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },

    logoText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#2D8C7F',
        letterSpacing: 0.5,
    },

    subtitle: {
        fontSize: 9,
        color: '#6B7280',
        fontWeight: 500,
        marginTop: 4,
        marginBottom: 8,
    },

    medecinNom: {
        fontSize: 9,
        fontWeight: 'bold',
        color: '#374151',
        marginTop: 8,
        marginBottom: 2,
    },

    medecinSpecialite: {
        fontSize: 9,
        color: '#6B7280',
    },

    date: {
        fontSize: 9,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 4,
    },

    ordonnanceNum: {
        fontSize: 9,
        color: '#6B7280',
        marginTop: 4,
    },

    // BLOC PATIENT
    patientBlock: {
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 8,
        padding: 16,
        marginBottom: 24,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },

    patientField: {
        flex: 1,
    },

    patientLabel: {
        color: '#6B7280',
        fontSize: 10,
    },

    patientValue: {
        fontWeight: 'bold',
        color: '#111827',
        fontSize: 10,
        marginTop: 2,
    },

    patientValueTeal: {
        fontWeight: 'bold',
        color: '#2D8C7F',
        fontSize: 10,
        marginTop: 2,
        fontFamily: 'Courier',
    },

    // TITRE PRESCRIPTION
    prescriptionTitle: {
        fontSize: 10,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 2,
        color: '#111827',
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
        paddingBottom: 8,
        marginBottom: 16,
    },

    // LISTE MÉDICAMENTS
    medicamentsList: {
        marginBottom: 24,
    },

    medicamentItem: {
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#F3F4F6',
        borderRadius: 6,
        padding: 12,
        marginBottom: 12,
    },

    medicamentNumber: {
        fontWeight: 'bold',
        fontSize: 10,
        color: '#111827',
        marginRight: 4,
    },

    medicamentName: {
        fontWeight: 'bold',
        fontSize: 10,
        color: '#0F172A',
    },

    medicamentDosage: {
        fontWeight: 'bold',
        fontSize: 10,
        color: '#2D8C7F',
    },

    medicamentDetails: {
        marginTop: 8,
        marginLeft: 12,
        fontSize: 10,
        color: '#374151',
    },

    medicamentDetailLabel: {
        fontWeight: 'bold',
        color: '#111827',
    },

    medicamentInstructions: {
        fontSize: 10,
        color: '#6B7280',
        fontStyle: 'italic',
    },

    noMedicaments: {
        textAlign: 'center',
        paddingVertical: 32,
        fontSize: 10,
        color: '#9CA3AF',
        fontStyle: 'italic',
    },

    // RECOMMANDATIONS
    recommendationsSection: {
        marginTop: 24,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#E2E8F0',
    },

    recommendationsLabel: {
        fontWeight: 'bold',
        color: '#111827',
        fontSize: 10,
        marginBottom: 8,
    },

    recommendationsBox: {
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 6,
        padding: 12,
        fontSize: 10,
        color: '#4B5563',
    },

    // SIGNATURE
    signatureSection: {
        marginTop: 48,
        paddingTop: 24,
        borderTopWidth: 1,
        borderTopColor: '#E2E8F0',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
    },

    signatureLeft: {
        fontSize: 8,
        color: '#9CA3AF',
        flex: 1,
        lineHeight: 1.5,
    },

    signatureRight: {
        textAlign: 'center',
        flex: 1,
    },

    signatureMedecinNom: {
        fontSize: 9,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 4,
    },

    signatureLabel: {
        fontSize: 8,
        color: '#6B7280',
        fontStyle: 'italic',
        marginBottom: 32,
    },

    signatureStamp: {
        width: 144,
        height: 48,
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: '#CBD5E1',
        borderRadius: 4,
        textAlign: 'center',
        fontSize: 8,
        color: '#94A3B8',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },

    flexRow: {
        flexDirection: 'row',
    },

    flexBetween: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
})

interface OrdonnancePDFProps {
    document: DocumentGenere
    contexte: ContexteDocument
    champs: ChampsOrdonnance
}

export default function OrdonnancePDF({ document: _, contexte, champs }: OrdonnancePDFProps) {
    const dateFormatee = new Date(contexte.date_jour).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    })

    const ordonnanceNum = `ORD-${Date.now().toString().slice(-6)}`

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* EN-TÊTE */}
                <View style={styles.headerContainer}>
                    <View style={styles.headerLeft}>
                        <View style={styles.logo}>
                            <Text style={styles.logoText}>HealthTracker SIH</Text>
                        </View>
                        <Text style={styles.subtitle}>
                            Centre Hospitalier Universitaire & Médical
                        </Text>
                        <Text style={styles.medecinNom}>
                            {contexte.medecin?.prenom} {contexte.medecin?.nom}
                        </Text>
                        <Text style={styles.medecinSpecialite}>
                            {contexte.service?.nom || 'Médecine Générale'}
                        </Text>
                    </View>

                    <View style={styles.headerRight}>
                        <Text style={styles.date}>Dakar, le {dateFormatee}</Text>
                        <Text style={styles.ordonnanceNum}>
                            N° Ordonnance : {ordonnanceNum}
                        </Text>
                    </View>
                </View>

                {/* BLOC PATIENT */}
                <View style={styles.patientBlock}>
                    <View style={styles.patientField}>
                        <Text style={styles.patientLabel}>Patient(e) :</Text>
                        <Text style={styles.patientValue}>
                            {contexte.patient.prenom} {contexte.patient.nom}
                        </Text>
                    </View>
                    <View style={styles.patientField}>
                        <Text style={styles.patientLabel}>Âge / Sexe :</Text>
                        <Text style={styles.patientValue}>
                            {contexte.patient.age || 'N/A'} ans ({contexte.patient.sexe})
                        </Text>
                    </View>
                    <View style={styles.patientField}>
                        <Text style={styles.patientLabel}>N° Dossier :</Text>
                        <Text style={styles.patientValueTeal}>
                            {contexte.patient.numero_dossier || `P${contexte.patient.numero_dossier}`}
                        </Text>
                    </View>
                </View>

                {/* TITRE PRESCRIPTION */}
                <Text style={styles.prescriptionTitle}>Prescription Médicale :</Text>

                {/* MÉDICAMENTS */}
                <View style={styles.medicamentsList}>
                    {champs.medicaments.length === 0 ? (
                        <Text style={styles.noMedicaments}>
                            Aucun médicament ajouté à l'ordonnance.
                        </Text>
                    ) : (
                        champs.medicaments.map((med, idx) => (
                            <View key={idx} style={styles.medicamentItem}>
                                {/* Nom et dosage */}
                                <View style={styles.flexRow}>
                                    <Text style={styles.medicamentNumber}>{idx + 1}.</Text>
                                    <View>
                                        <Text style={styles.medicamentName}>{med.nom}</Text>
                                        <Text style={styles.medicamentDosage}>
                                            ({med.dosage})
                                        </Text>
                                    </View>
                                </View>

                                {/* Posologie, Durée, Instructions */}
                                <View style={styles.medicamentDetails}>
                                    <Text>
                                        • <Text style={styles.medicamentDetailLabel}>
                                        Posologie :
                                    </Text>
                                        {' '}{med.posologie} {med.frequence || ''}
                                    </Text>
                                </View>

                                <View style={styles.medicamentDetails}>
                                    <Text>
                                        • <Text style={styles.medicamentDetailLabel}>
                                        Durée :
                                    </Text>
                                        {' '}{med.duree}
                                    </Text>
                                </View>

                                {med.conseils && (
                                    <Text style={[styles.medicamentDetails, styles.medicamentInstructions]}>
                                        • Instructions : {med.conseils}
                                    </Text>
                                )}
                            </View>
                        ))
                    )}
                </View>

                {/* RECOMMANDATIONS */}
                {champs.conseils_generaux && (
                    <View style={styles.recommendationsSection}>
                        <Text style={styles.recommendationsLabel}>
                            Recommandations particulières :
                        </Text>
                        <View style={styles.recommendationsBox}>
                            <Text>{champs.conseils_generaux}</Text>
                        </View>
                    </View>
                )}

                {/* SIGNATURE */}
                <View style={styles.signatureSection}>
                    <Text style={styles.signatureLeft}>
                        Document généré de façon sécurisée par HealthTracker SIH.{'\n'}
                        Authenticité vérifiable via signature praticien.
                    </Text>

                    <View style={styles.signatureRight}>
                        <Text style={styles.signatureMedecinNom}>
                            {contexte.medecin?.nom}
                        </Text>
                        <Text style={styles.signatureLabel}>
                            Signature & Cachet médical
                        </Text>
                        <View style={styles.signatureStamp}>
                            <Text>[ Cachet Médecin ]</Text>
                        </View>
                    </View>
                </View>
            </Page>
        </Document>
    )
}