export interface Patient {
    photo_path: string;
    id: number
    nom: string
    prenom: string
    date_naissance: string
    date_naissance_estimee?: boolean
    age?: number
    sexe: 'M' | 'F'
    groupe_sanguin?: string
    telephone?: string
    adresse: string
    allergies?: string
    antecedents?: string
    actif: boolean
    statut_vital?: 'vivant' | 'decede'
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
    medecin?: number | null
    medecin_nom?: string | null
    medecin_prenom?: string | null
    date_heure: string
    duree_minutes?: number
    motif: string
    type_evenement: TypeEvenementRdv
    type_evenement_label?: string
    statut: StatutRendezVous
    statut_label?: string
    notes?: string
    date_creation: string
}

export interface CreneauDisponible {
    heure_debut: string
    heure_fin: string
    type: TypeCreneau
    disponible: boolean
}

export interface CreneauxDisponiblesResponse {
    creneaux: CreneauDisponible[]
    indisponible: boolean
    motif: string
}

export interface MedecinDisponible {
    id: number
    nom: string
    prenom: string
    specialite?: string
    disponible: boolean
    nb_creneaux_libres: number
    motif: string
}

export interface MedecinsDisponiblesResponse {
    date: string
    medecins: MedecinDisponible[]
}

export interface DateDisponible {
    date: string
    nb_creneaux_libres: number
}

export interface DatesDisponiblesResponse {
    medecin: number
    dates: DateDisponible[]
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
export type RoleEmploye = 'admin' | 'medecin' | 'infirmier' | 'secretaire' | 'laborantin' | 'chef_chirurgie'

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
    est_major?: boolean
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
    capacites?: string[]
    roles_effectifs?: RoleEmploye[]
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
    capacite_lits?: number | null
    date_creation: string
}

export interface HabilitationService {
    id: number
    employe: number
    employe_nom: string
    employe_prenom: string
    employe_role_label: string
    service: number
    service_nom: string
    date_debut?: string | null
    date_fin?: string | null
    actif: boolean
    date_creation: string
}

export interface MedecinPerf {
    id: number
    nom: string
    specialite?: string
    nb_patients: number
    nb_consultations: number
    nb_operations: number
}

export interface OccupationService {
    capacite_lits: number | null
    lits_occupes: number
    taux_occupation: number | null
    duree_moyenne_sejour: number | null
}

export interface ServiceStats {
    service: Service
    patients: {
        total: number
        actifs: number
        nouveaux_jour: number
        nouveaux_mois: number
        nouveaux_annee: number
    }
    employes: {
        total: number
        par_role: Record<RoleEmploye, number>
    }
    medecins: MedecinPerf[]
    occupation: OccupationService
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
    service?: number | null
    service_nom?: string | null
    est_major?: boolean
    capacites?: string[]
    roles_effectifs?: RoleEmploye[]
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

export type StatutException = 'en_attente' | 'valide' | 'rejete'

export interface ExceptionDisponibilite {
    id: number
    employe: number
    employe_nom?: string
    employe_prenom?: string
    employe_role_label?: string
    type: TypeException
    type_label: string
    date_debut: string
    date_fin: string
    motif: string
    valide: boolean
    statut: StatutException
    statut_label: string
    date_creation: string
}

// ─── Assignations infirmier ↔ patient ────────────────────────────────────────
export type Shift = 'matin' | 'apres_midi' | 'nuit'

export interface AssignationPatient {
    id: number
    infirmier: number
    infirmier_nom?: string
    infirmier_prenom?: string
    patient: number
    patient_nom?: string
    patient_prenom?: string
    patient_dossier?: string
    service: number
    service_nom?: string
    date: string
    shift: Shift
    shift_label: string
    date_creation: string
}

export interface MesPatientsAssignesResponse {
    date: string
    shift: Shift
    shift_label: string
    assignations: AssignationPatient[]
}

// ─── Chirurgie / Opérations ──────────────────────────────────────────────────
export type StatutOperation = 'planifiee' | 'confirmee' | 'en_cours' | 'terminee' | 'complication' | 'reportee' | 'annulee'

export interface SalleBloc {
    id: number
    nom: string
    service: number
    service_nom?: string
    actif: boolean
}

export interface Operation {
    id: number
    patient: number
    patient_nom?: string
    patient_prenom?: string
    consultation_indication: number | null
    hospitalisation: number | null
    service_chirurgie: number
    service_chirurgie_nom?: string
    salle: number | null
    salle_nom?: string | null
    chirurgien_principal: number
    chirurgien_nom?: string
    chirurgien_prenom?: string
    equipe: number[]
    type_intervention: string
    date_heure_prevue: string
    duree_estimee_min: number
    date_debut_reelle: string | null
    date_fin_reelle: string | null
    statut: StatutOperation
    statut_label: string
    compte_rendu_operatoire: string
    complications: string
    date_creation: string
    date_modification: string
}

export type TypeEvenementRdv = 'consultation' | 'intervention' | 'reunion' | 'garde' | 'visite_postoperatoire' | 'autre'

// ─── Planning médecin (calendrier Dashboard) ─────────────────────────────────
export interface EvenementPlanning {
    id: number
    start_time: string
    end_time: string
    statut: StatutRendezVous
    statut_label: string
    type_evenement: TypeEvenementRdv
    type_evenement_label: string
    motif: string
    notes: string
    patient: {
        id: number
        nom_complet: string
        numero_dossier: string
        age: number
    }
    a_alerte_critique: boolean
    consultation_id: number | null
}

export interface IndisponibilitePlanning {
    type: string
    type_label: string
    date_debut: string
    date_fin: string
    motif: string
}

export interface PlanningResponse {
    debut: string
    fin: string
    evenements: EvenementPlanning[]
    indisponibilites: IndisponibilitePlanning[]
}

// Calqué sur ServiceViewSet.vue_ensemble (services/views.py) — pas de champ
// inventé, chaque clé correspond exactement à ce que renvoie le backend.
export interface VueEnsemble {
    nb_services: number
    patients: {
        total: number
        actifs: number
        nouveaux_mois: number
    }
    employes: {
        total: number
        par_role: Record<RoleEmploye, number>
    }
    par_service: {
        id: number
        nom: string
        nb_patients: number
        nb_employes: number
        capacite_lits: number | null
        lits_occupes: number
        taux_occupation: number | null
        duree_moyenne_sejour: number | null
    }[]
}

// Calqué sur OperationViewSet.stats (chirurgie/views.py) — réel, scopé par service.
export interface InterventionRecenteReelle {
    date: string | null
    patient: string
    type: string
    chirurgien: string
    duree: string | null
    issue: 'succes' | 'complication'
}

export interface ChirurgienPerfReelle {
    id: number
    nom: string
    specialite: string
    nb_interventions: number
    duree_moyenne_min: number | null
    taux_succes: number | null
    patients_operes: number
}

export interface OperationStats {
    nb_interventions: number
    duree_moyenne_min: number | null
    taux_succes: number | null
    repartition_par_type: { type_intervention: string; nb: number }[]
    evolution_hebdo: { semaine: string; nb: number }[]
    dernieres_interventions: InterventionRecenteReelle[]
    par_chirurgien: ChirurgienPerfReelle[]
}

// Calqué sur ServiceViewSet.activite (services/views.py) : {'jour': ..., 'nb': ...} par jour
export interface ActiviteJour {
    jour: string
    nb: number}