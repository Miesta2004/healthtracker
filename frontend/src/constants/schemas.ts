import { Pill, Award, FlaskConical, FileText, Send, FileWarning, type LucideIcon } from 'lucide-react'
import type {
    TypeDocument, ChampsOrdonnance, ChampsCertificatMedical, ChampsDemandeExamen,
    ChampsCompteRendu, ChampsLettreOrientation, ChampsArretTravail,
    TypeConsultation, DecisionOrientation,
} from '../types'

// ─── Type de consultation (modale de démarrage) ──────────────────────────────
export const TYPES_CONSULTATION: TypeConsultation[] = [
    'initiale', 'suivi', 'controle', 'urgence',
    'preoperatoire', 'postoperatoire', 'teleconsultation', 'autre',
]

export const TYPE_CONSULTATION_LABELS: Record<TypeConsultation, string> = {
    initiale:         'Consultation initiale',
    suivi:            'Consultation de suivi',
    controle:         'Consultation de contrôle',
    urgence:          "Consultation d'urgence",
    preoperatoire:    'Consultation préopératoire',
    postoperatoire:   'Consultation postopératoire',
    teleconsultation: 'Téléconsultation',
    autre:            'Autre',
}

// ─── Décision d'orientation à la fin de la consultation ──────────────────────
export const DECISIONS_ORIENTATION: Exclude<DecisionOrientation, ''>[] = [
    'sortie', 'hospitalisation', 'rendez_vous',
]

export const DECISION_ORIENTATION_LABELS: Record<Exclude<DecisionOrientation, ''>, string> = {
    sortie:           'Retour à domicile',
    hospitalisation:  'Hospitalisation',
    rendez_vous:      'Rendez-vous de suivi à prendre',
}

export const TYPES_EDITEUR: TypeDocument[] = [
    'ordonnance', 'certificat_medical', 'demande_analyse',
    'compte_rendu_consultation', 'lettre_orientation', 'arret_travail',
]

export const TYPE_DOCUMENT_LABELS: Record<TypeDocument, string> = {
    compte_rendu_consultation: 'Compte rendu de consultation',
    ordonnance: 'Ordonnance',
    certificat_medical: 'Certificat médical',
    demande_analyse: "Demande d'examen",
    demande_imagerie: "Demande d'imagerie",
    lettre_orientation: "Lettre d'orientation",
    arret_travail: 'Arrêt de travail',
    autre: 'Autre',
}

export const TYPE_DOCUMENT_ICONS: Record<TypeDocument, LucideIcon> = {
    compte_rendu_consultation: FileText,
    ordonnance: Pill,
    certificat_medical: Award,
    demande_analyse: FlaskConical,
    demande_imagerie: FlaskConical,
    lettre_orientation: Send,
    arret_travail: FileWarning,
    autre: FileText,
}

export const LIGNE_MEDICAMENT_VIDE = {
    nom: '', dosage: '', posologie: '', frequence: '', duree: '', quantite: '', conseils: '',
}

export const LIGNE_EXAMEN_VIDE = { nom: '', categorie: 'biologie' as const }

export const CHAMPS_VIDES: {
    ordonnance: ChampsOrdonnance
    certificat_medical: ChampsCertificatMedical
    demande_analyse: ChampsDemandeExamen
    demande_imagerie: ChampsDemandeExamen
    compte_rendu_consultation: ChampsCompteRendu
    lettre_orientation: ChampsLettreOrientation
    arret_travail: ChampsArretTravail
} = {
    ordonnance: { medicaments: [], conseils_generaux: '' },
    certificat_medical: { motif: '', constat: '', duree_repos_jours: null, date_debut: '', date_fin: '', observations: '' },
    demande_analyse: { examens: [], indication_clinique: '', urgence: 'normale', commentaires: '' },
    demande_imagerie: { examens: [], indication_clinique: '', urgence: 'normale', commentaires: '' },
    compte_rendu_consultation: { resume: '', evolution: '', recommandations: '' },
    lettre_orientation: { destinataire: '', motif_orientation: '', elements_cliniques: '', conclusion: '' },
    arret_travail: { motif_medical: '', date_debut: '', date_fin: '', duree_jours: null },
}

export const EXAMENS_SUGGERES: { nom: string; categorie: 'biologie' | 'imagerie' }[] = [
    { nom: 'NFS', categorie: 'biologie' },
    { nom: 'CRP', categorie: 'biologie' },
    { nom: 'Glycémie', categorie: 'biologie' },
    { nom: 'Bilan rénal', categorie: 'biologie' },
    { nom: 'Bilan hépatique', categorie: 'biologie' },
    { nom: 'Ionogramme sanguin', categorie: 'biologie' },
    { nom: 'Groupe sanguin', categorie: 'biologie' },
    { nom: 'Échographie abdominale', categorie: 'imagerie' },
    { nom: 'Radiographie thoracique', categorie: 'imagerie' },
    { nom: 'Scanner cérébral', categorie: 'imagerie' },
    { nom: 'IRM', categorie: 'imagerie' },
    { nom: 'ECG', categorie: 'imagerie' },
]
