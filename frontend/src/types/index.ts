export interface Patient {
    photo_path: string;
    id: number
    nom: string
    prenom: string
    date_naissance: string
    age?: number
    sexe: 'M' | 'F'
    groupe_sanguin?: string
    telephone?: string
    adresse: string
    allergies?: string
    antecedents?: string
    actif: boolean
    date_creation: string
    numero_dossier?: string
    service?: number | null
    service_nom?: string | null
    medecin_referent?: number | null
    medecin_nom?: string | null
}

// ─── Rendez-vous ────────────────────────────────────────────────────────────
export type StatutRendezVous = 'planifie' | 'confirme' | 'annule' | 'termine'

export interface RendezVous {
    id: number
    patient: number
    patient_nom?: string
    patient_prenom?: string
    patient_dossier?: string
    date_heure: string
    motif: string
    statut: StatutRendezVous
    statut_label?: string
    notes?: string
    date_creation: string
}

export interface AuthTokens {
    access: string
    refresh: string
}

export interface LoginCredentials {
    username: string
    password: string
}

export interface SignesVitaux {
    id: number
    patient: number
    date: string
    tension_systolique: number | null
    tension_diastolique: number | null
    temperature: number | null
    poids: number | null
    glycemie: number | null
    frequence_cardiaque: number | null
}

export type ConsultationStatut = 'planifiee' | 'en_cours' | 'terminee' | 'annulee'
export type TypeEvenement = 'consultation' | 'examen' | 'operation' | 'autre'

// ─── Comptes / Employés ─────────────────────────────────────────────────────
export type RoleEmploye = 'admin' | 'medecin' | 'infirmier' | 'secretaire' | 'laborantin'

export type TypeContrat = 'cdi' | 'cdd' | 'stage' | 'vacation' | 'benevolat' | ''

export interface Employe {
    id: number
    username: string
    email: string
    nom: string
    prenom: string
    date_naissance: string
    sexe: 'M' | 'F'
    age: number
    telephone?: string
    adresse?: string
    photo_path?: string | null
    role: RoleEmploye
    role_label: string
    specialite?: string
    matricule: string
    actif: boolean
    service?: number | null
    service_nom?: string | null
    type_contrat?: TypeContrat
    type_contrat_label?: string
    date_debut_contrat?: string | null
    date_fin_contrat?: string | null
    description_poste?: string
    date_creation: string
    signature_medicale?: string
    preferences?: Record<string, unknown>
}

export interface Service {
    id: number
    nom: string
    description?: string
    chef_de_service?: number
    chef_nom?: string
    nb_employes: number
    nb_patients: number
    actif: boolean
    date_creation: string
}

// Réponse de /employes/me/ : soit un Employe complet, soit un fallback minimal
// pour un superuser Django sans fiche Employe associée.
export interface CurrentUser {
    username: string
    role: RoleEmploye
    role_label: string
    id?: number
    nom?: string
    prenom?: string
    specialite?: string
    service_id?: number | null
    service_nom?: string | null
}

// ─── Antécédents ──────────────────────────────────────────────────────────────
export type TypeAntecedent = 'maladie_chronique' | 'chirurgie' | 'allergie' | 'familial' | 'autre'
export type StatutAntecedent = 'actif' | 'resolu'

export interface Antecedent {
    id: number
    patient: number
    type_antecedent: TypeAntecedent
    type_antecedent_label: string
    libelle: string
    observations?: string
    statut: StatutAntecedent
    statut_label: string
    date_diagnostic: string
    consultation_source: number | null
    date_creation: string
    date_modification: string
}

export interface Consultation {
    id: number
    patient: number
    type_evenement: TypeEvenement
    date: string
    motif: string
    symptomes: string
    examens_realises: string
    diagnostic: string
    ordonnance: string
    notes: string
    statut: ConsultationStatut
    date_creation: string
    date_modification: string
}

// ─── Hospitalisations ───────────────────────────────────────────────────────
export type StatutHospitalisation = 'en_cours' | 'terminee' | 'transferee'

export interface Hospitalisation {
    id: number
    patient: number
    patient_prenom?: string
    patient_nom?: string
    patient_dossier?: string
    service: number | null
    service_nom?: string | null
    medecin_responsable: number | null
    medecin_nom?: string | null
    chambre: string
    lit: string
    motif_admission: string
    diagnostic_entree: string
    diagnostic_sortie: string
    notes: string
    date_admission: string
    date_sortie_prevue: string | null
    date_sortie: string | null
    statut: StatutHospitalisation
    statut_label?: string
    duree_jours?: number
    date_creation: string
    date_modification: string
}

// ─── Urgences ───────────────────────────────────────────────────────────────
export type NiveauTri = 1 | 2 | 3 | 4 | 5
export type ModeArrivee = 'pied' | 'ambulance' | 'police' | 'transfert' | 'autre'
export type StatutUrgence = 'en_attente' | 'en_consultation' | 'sorti'
export type DecisionSortie = 'domicile' | 'hospitalisation' | 'transfert' | 'parti_sans_attendre' | 'deces' | ''

export interface PassageUrgence {
    id: number
    patient: number
    patient_prenom?: string
    patient_nom?: string
    patient_dossier?: string
    patient_age?: number
    service: number | null
    service_nom?: string | null
    infirmier_accueil: number | null
    infirmier_nom?: string | null
    medecin_examinateur: number | null
    medecin_nom?: string | null
    hospitalisation: number | null
    date_arrivee: string
    mode_arrivee: ModeArrivee
    mode_arrivee_label?: string
    niveau_tri: NiveauTri | null
    niveau_tri_label?: string
    motif: string
    diagnostic: string
    notes: string
    statut: StatutUrgence
    statut_label?: string
    decision: DecisionSortie
    decision_label?: string
    date_sortie: string | null
    temps_attente_minutes?: number
    date_creation: string
    date_modification: string
}

// ─── Analyses de laboratoire ────────────────────────────────────────────────
export type TypeAnalyse =
    | 'nfs' | 'glycemie' | 'bilan_renal' | 'bilan_hepatique' | 'bilan_lipidique'
    | 'ionogramme' | 'crp' | 'groupe_sanguin' | 'hemostase' | 'urine' | 'parasite' | 'autre'
export type StatutAnalyse = 'en_attente' | 'en_cours' | 'terminee' | 'annulee'
export type UrgenceAnalyse = 'normale' | 'urgente'

export interface DemandeAnalyse {
    id: number
    patient: number
    patient_nom?: string
    patient_dossier?: string
    patient_prenom?: string
    patient_nom_famille?: string
    patient_age?: number
    patient_sexe?: 'M' | 'F'
    patient_groupe_sanguin?: string
    patient_allergies?: string
    consultation: number | null
    demandeur: number | null
    demandeur_nom?: string | null
    laborantin: number | null
    laborantin_nom?: string | null
    type_analyse: TypeAnalyse
    type_label?: string
    urgence: UrgenceAnalyse
    urgence_label?: string
    statut: StatutAnalyse
    statut_label?: string
    notes_medecin: string
    resultats: string
    valeurs_normales: string
    date_demande: string
    date_resultat: string | null
}

// ─── Alertes ─────────────────────────────────────────────────────────────────
export type TypeAlerte = 'tension' | 'glycemie' | 'temperature' | 'frequence' | 'rdv' | 'resultat_analyse' | 'autre'
export type StatutAlerte = 'non_lue' | 'lue' | 'traitee'

export interface Alerte {
    id: number
    patient: number
    patient_nom?: string
    type: TypeAlerte
    type_label?: string
    message: string
    statut: StatutAlerte
    date_creation: string
}

// ─── Disponibilités ──────────────────────────────────────────────────────────
export type JourSemaine = 0 | 1 | 2 | 3 | 4 | 5 | 6
export type TypeCreneau = 'presentiel' | 'garde' | 'astreinte' | 'teleconsultation'
export type TypeException = 'conge' | 'absence' | 'garde' | 'formation' | 'mission'

export interface CreneauDisponibilite {
    id: number
    employe: number
    jour: JourSemaine
    jour_label: string
    heure_debut: string   // "08:00:00"
    heure_fin: string     // "16:00:00"
    type: TypeCreneau
    type_label: string
    actif: boolean
}

export interface ExceptionDisponibilite {
    id: number
    employe: number
    type: TypeException
    type_label: string
    date_debut: string
    date_fin: string
    motif: string
    valide: boolean
    date_creation: string
}