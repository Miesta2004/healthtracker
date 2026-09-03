import { StyleSheet, Text, View } from '@react-pdf/renderer'
import type { ChampsDemandeExamen, ContexteDocument, DocumentGenere } from '../../types'
import { PDFDocumentShell, PDFSectionTexte, PDFSectionTitre, pdfStyles } from './DocumentPDFShell'

const styles = StyleSheet.create({
    examenListe: { marginBottom: 12 },
    examenLigne: { flexDirection: 'row', fontSize: 10, color: '#111827', marginBottom: 4 },
    examenPuce: { marginRight: 5 },
    examenCategorie: { fontSize: 8.5, color: '#6B7280', marginLeft: 4 },
    urgenceLigne: { fontSize: 10, marginBottom: 10 },
    urgenceLabel: { fontWeight: 'bold' },
})

interface DemandeExamenPDFProps {
    document: DocumentGenere
    contexte: ContexteDocument
    champs: ChampsDemandeExamen
}

export default function DemandeExamenPDF({ document, contexte, champs }: DemandeExamenPDFProps) {
    return (
        <PDFDocumentShell document={document} contexte={contexte}>
            <Text style={styles.urgenceLigne}>
                Urgence :{' '}
                <Text style={[styles.urgenceLabel, champs.urgence === 'urgente' ? { color: '#DC2626' } : {}]}>
                    {champs.urgence === 'urgente' ? 'URGENTE' : 'Normale'}
                </Text>
            </Text>
            <PDFSectionTexte titre="Indication clinique" texte={champs.indication_clinique} />
            <PDFSectionTitre>Examens demandés</PDFSectionTitre>
            <View style={styles.examenListe}>
                {champs.examens.length === 0 ? (
                    <Text style={pdfStyles.sectionVide}>Aucun examen sélectionné.</Text>
                ) : (
                    champs.examens.map((ex, idx) => (
                        <View key={idx} style={styles.examenLigne}>
                            <Text style={styles.examenPuce}>•</Text>
                            <Text>{ex.nom}</Text>
                            <Text style={styles.examenCategorie}>({ex.categorie === 'imagerie' ? 'imagerie' : 'biologie'})</Text>
                        </View>
                    ))
                )}
            </View>
            <PDFSectionTexte titre="Commentaires" texte={champs.commentaires} />
        </PDFDocumentShell>
    )
}
