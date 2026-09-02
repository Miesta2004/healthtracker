import { PDFDocument as Document, PDFPage as Page, PDFText as Text, PDFView as View, StyleSheet } from './pdf-primitives'
import type { DocumentGenere, ContexteDocument, ChampsOrdonnance } from '../../types'

const COULEURS = {
    primaire: '#2D8C7F',
    texte: '#111827',
    texteMuted: '#6B7280',
    bordure: '#E5E7EB',
    fondClair: '#F8FAFC',
    fondLegere: '#F9FAFB',
}

const styles = StyleSheet.create({
    page: {
        padding: 36,
        fontSize: 11,
        fontFamily: 'Helvetica',
        color: COULEURS.texte,
        lineHeight: 1.4,
    },
    headerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        borderBottomWidth: 2,
        borderBottomColor: COULEURS.primaire,
        paddingBottom: 12,
        marginBottom: 20,
    },
    headerLeft: {
        flex: 1,
    },
    headerRight: {
        flex: 1,
        textAlign: 'right',
        fontSize: 10,
    },
    logoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    logoText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: COULEURS.primaire,
    },
    headerSubtitle: {
        fontSize: 9,
        color: COULEURS.texteMuted,
        fontWeight: 500,
        marginBottom: 8,
    },
    medecinNom: {
        fontSize: 11,
        fontWeight: 'bold',
        color: COULEURS.texte,
        marginTop: 8,
    },
    medecinSpecialite: {
        fontSize: 10,
        color: COULEURS.texteMuted,
    },
    headerDate: {
        fontSize: 9,
        fontWeight: 'bold',
        color: COULEURS.texte,
        marginBottom: 4,
    },
    headerOrdonnanceNum: {
        fontSize: 9,
        color: COULEURS.texteMuted,
        marginTop: 4,
        fontStyle: 'italic',
    },
    patientSection: {
        backgroundColor: COULEURS.fondClair,
        borderWidth: 1,
        borderColor: COULEURS.bordure,
        padding: 12,
        marginBottom: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        fontSize: 10,
    },
    patientField: {
        flex: 1,
        marginRight: 16,
    },
    patientLabel: {
        color: COULEURS.texteMuted,
        fontSize: 9,
        fontWeight: 500,
    },
    patientValue: {
        fontWeight: 'bold',
        color: COULEURS.texte,
        fontSize: 10,
        marginTop: 2,
    },
    patientValueTeal: {
        fontWeight: 'bold',
        color: COULEURS.primaire,
        fontSize: 10,
        marginTop: 2,
        fontFamily: 'Courier',
    },
    sectionTitle: {
        fontSize: 10,
        fontWeight: 'bold',
        color: COULEURS.texte,
        textTransform: 'uppercase',
        borderBottomWidth: 1,
        borderBottomColor: COULEURS.bordure,
        paddingBottom: 4,
        marginBottom: 12,
        marginTop: 4,
    },
    medicamentsList: {
        marginBottom: 12,
    },
    medicamentItem: {
        marginBottom: 12,
        padding: 8,
        backgroundColor: COULEURS.fondLegere,
        borderWidth: 1,
        borderColor: COULEURS.bordure,
    },
    medicamentName: {
        fontSize: 11,
        fontWeight: 'bold',
        color: COULEURS.texte,
        marginBottom: 2,
    },
    medicamentDosage: {
        fontSize: 10,
        fontWeight: 'bold',
        color: COULEURS.primaire,
    },
    medicamentDetail: {
        fontSize: 10,
        color: COULEURS.texte,
        marginLeft: 12,
        marginTop: 2,
    },
    medicamentDetailLabel: {
        fontWeight: 'bold',
        color: COULEURS.texte,
    },
    medicamentInstructions: {
        fontSize: 9,
        color: COULEURS.texteMuted,
        fontStyle: 'italic',
        marginLeft: 12,
        marginTop: 2,
    },
    noMedicaments: {
        fontSize: 10,
        color: COULEURS.texteMuted,
        fontStyle: 'italic',
        textAlign: 'center',
        marginVertical: 16,
    },
    recommendationsSection: {
        marginTop: 12,
        borderTopWidth: 1,
        borderTopColor: COULEURS.bordure,
        paddingTop: 8,
    },
    recommendationsLabel: {
        fontSize: 10,
        fontWeight: 'bold',
        color: COULEURS.texte,
        marginBottom: 4,
    },
    recommendationsBox: {
        backgroundColor: COULEURS.fondClair,
        borderWidth: 1,
        borderColor: COULEURS.bordure,
        padding: 8,
        fontSize: 10,
        color: COULEURS.texte,
    },
    signatureSection: {
        marginTop: 32,
        borderTopWidth: 1,
        borderTopColor: COULEURS.bordure,
        paddingTop: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
    },
    footerText: {
        fontSize: 8,
        color: COULEURS.texteMuted,
        flex: 1,
        lineHeight: 1.3,
    },
    signatureBox: {
        textAlign: 'center',
        flex: 1,
    },
    signatureMedecinNom: {
        fontSize: 9,
        fontWeight: 'bold',
        color: COULEURS.texte,
        marginBottom: 4,
    },
    signatureLabel: {
        fontSize: 8,
        color: COULEURS.texteMuted,
        fontStyle: 'italic',
        marginBottom: 24,
    },
    signatureStamp: {
        width: 80,
        height: 40,
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: COULEURS.bordure,
        textAlign: 'center',
        fontSize: 8,
        color: COULEURS.texteMuted,
        padding: 4,
    },
    flexRow: {
        flexDirection: 'row',
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
                {/* En-tête */}
                <View style={styles.headerContainer}>
                    <View style={styles.headerLeft}>
                        <View style={styles.logoContainer}>
                            <Text style={styles.logoText}>HealthTracker SIH</Text>
                        </View>
                        <Text style={styles.headerSubtitle}>
                            Centre Hospitalier Universitaire & Médical
                        </Text>
                        <Text style={styles.medecinNom}>
                            Dr {contexte.medecin?.prenom} {contexte.medecin?.nom}
                        </Text>
                        {contexte.service && (
                            <Text style={styles.medecinSpecialite}>{contexte.service.nom}</Text>
                        )}
                    </View>

                    <View style={styles.headerRight}>
                        <Text style={styles.headerDate}>Dakar, le {dateFormatee}</Text>
                        <Text style={styles.headerOrdonnanceNum}>
                            N° Ordonnance : {ordonnanceNum}
                        </Text>
                    </View>
                </View>

                {/* Section Patient */}
                <View style={styles.patientSection}>
                    <View style={styles.patientField}>
                        <Text style={styles.patientLabel}>Patient(e) :</Text>
                        <Text style={styles.patientValue}>
                            {contexte.patient.prenom} {contexte.patient.nom}
                        </Text>
                    </View>
                    <View style={styles.patientField}>
                        <Text style={styles.patientLabel}>Âge / Sexe :</Text>
                        <Text style={styles.patientValue}>
                            {contexte.patient.age ?? '—'} ans — {contexte.patient.sexe}
                        </Text>
                    </View>
                    <View style={styles.patientField}>
                        <Text style={styles.patientLabel}>N° Dossier :</Text>
                        <Text style={styles.patientValueTeal}>
                            {contexte.patient.numero_dossier || '—'}
                        </Text>
                    </View>
                </View>

                {/* Titre */}
                <Text style={styles.sectionTitle}>Prescription Médicale :</Text>

                {/* Médicaments */}
                <View style={styles.medicamentsList}>
                    {champs.medicaments.length === 0 ? (
                        <Text style={styles.noMedicaments}>
                            Aucun médicament ajouté à l'ordonnance.
                        </Text>
                    ) : (
                        champs.medicaments.map((med, idx) => (
                            <View key={idx} style={styles.medicamentItem}>
                                <View style={styles.flexRow}>
                                    <Text style={{ marginRight: 4, fontWeight: 'bold' }}>
                                        {idx + 1}.
                                    </Text>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.medicamentName}>{med.nom}</Text>
                                        <Text style={styles.medicamentDosage}>
                                            ({med.dosage})
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.medicamentDetail}>
                                    <Text>
                                        <Text style={styles.medicamentDetailLabel}>
                                            Posologie :{' '}
                                        </Text>
                                        {med.posologie} {med.frequence || ''}
                                    </Text>
                                </View>

                                <View style={styles.medicamentDetail}>
                                    <Text>
                                        <Text style={styles.medicamentDetailLabel}>
                                            Durée :{' '}
                                        </Text>
                                        {med.duree}
                                    </Text>
                                </View>

                                {med.conseils && (
                                    <Text style={styles.medicamentInstructions}>
                                        • Instructions : {med.conseils}
                                    </Text>
                                )}
                            </View>
                        ))
                    )}
                </View>

                {/* Recommandations */}
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

                {/* Signature */}
                <View style={styles.signatureSection}>
                    <Text style={styles.footerText}>
                        Document généré de façon sécurisée par HealthTracker SIH.
                        {'\n'}Authenticité vérifiable via signature praticien.
                    </Text>

                    <View style={styles.signatureBox}>
                        <Text style={styles.signatureMedecinNom}>
                            Dr {contexte.medecin?.prenom} {contexte.medecin?.nom}
                        </Text>
                        <Text style={styles.signatureLabel}>Signature & Cachet médical</Text>
                        <View style={styles.signatureStamp}>
                            <Text>[ Cachet Médecin ]</Text>
                        </View>
                    </View>
                </View>
            </Page>
        </Document>
    )
}