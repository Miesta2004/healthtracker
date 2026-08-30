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
    statut_orientation?: StatutOrientation
    statut_orientation_label?: string
    contact_urgence_nom?: string
    contact_urgence_telephone?: string
    contact_urgence_lien?: string
    mutuelle?: string
    numero_mutuelle?: string
    accompagnants?: Accompagnant[]
    identite_provisoire?: boolean
    regularise_par?: number | null
    regularise_par_nom?: string | null
    date_regularisation?: string | null
}

// ─── Accompagnants ─────────────────────────────────────────────────────────
export type StatutAccompagnant = 'present' | 'sorti'

export interface Accompagnant {
    id: number
    patient: number
    patient_nom?: string
    patient_prenom?: string
    patient_dossier?: string
    nom: string
    prenom: string
    lien_parente?: string
    cni?: string
    telephone?: string
    statut: StatutAccompagnant
    statut_label?: string
    date_entree: string
    date_sortie?: string | null
    enregistre_par?: number | null
    enregistre_par_nom?: string | null
}

// ─── Recherche & identitovigilance ─────────────────────────────────────────
export interface PatientSearchResult {
    id: number
    nom: string
    prenom: string
    age?: number
    date_naissance: string
    sexe: 'M' | 'F'
    telephone?: string
    numero_dossier: string
    service_nom?: string | null
    statut_orientation: StatutOrientation
    statut_orientation_label?: string
    identite_provisoire: boolean
    accompagnants_correspondants: Accompagnant[]
}

// ─── Badge / bracelet patient ──────────────────────────────────────────────
export interface BadgePatient {
    patient_id: number
    numero_dossier: string
    nom: string
    prenom: string
    date_naissance: string
    sexe: 'M' | 'F'
    service_nom: string
    statut_orientation: StatutOrientation
    identite_provisoire: boolean
    groupe_sanguin: string
    allergies: string
    qr_payload: string
    genere_le: string
}

// ─── Pass d'accès accompagnant ─────────────────────────────────────────────
export interface BadgeAccompagnant {
    accompagnant_id: number
    nom: string
    prenom: string
    lien_parente: string
    patient_nom: string
    patient_prenom: string
    patient_dossier: string
    statut: StatutAccompagnant
    qr_payload: string
    genere_le: string
}

// ─── Service des Admissions — workflow d'orientation ───────────────────────
export type StatutOrientation =
    | 'en_attente_validation_service'
    | 'admis_dans_le_service'
    | 'en_consultation'
    | 'hospitalise'
    | 'admis_urgences'
    | 'sorti'

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
export type RoleEmploye = 'admin' | 'medecin' | 'infirmier' | 'secretaire' | 'laborantin' | 'chef_chirurgie' | 'agent_admission' | 'facturier' | 'caissier'

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
    specialite_principale_nom?: string
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

export interface Rappel {
    id: number
    texte: string
    fait: boolean
    date_echeance?: string | null
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

// ─── Documents (bibliothèque de modèles + éditeur structuré) ──────────────────
export type TypeDocument =
    | 'compte_rendu_consultation' | 'ordonnance' | 'certificat_medical'
    | 'demande_analyse' | 'demande_imagerie' | 'lettre_orientation'
    | 'arret_travail' | 'autre'

export type StatutDocument = 'brouillon' | 'finalise'

export interface ContextePatientDocument {
    nom: string
    prenom: string
    age: number | null
    sexe: string
    numero_dossier: string
    date_naissance: string
}
export interface ContexteConsultationDocument {
    motif: string
    diagnostic: string
    symptomes: string
    date: string
}
export interface ContexteMedecinDocument {
    nom: string
    prenom: string
    signature: string
}
export interface ContexteServiceDocument {
    nom: string
}
export interface ContexteDocument {
    patient: ContextePatientDocument
    consultation: ContexteConsultationDocument | null
    medecin: ContexteMedecinDocument | null
    service: ContexteServiceDocument | null
    date_jour: string
}

export interface LigneMedicament {
    nom: string
    dosage: string
    posologie: string
    frequence: string
    duree: string
    quantite: string
    conseils: string
}
export interface ChampsOrdonnance {
    medicaments: LigneMedicament[]
    conseils_generaux: string
}
export interface ChampsCertificatMedical {
    motif: string
    constat: string
    duree_repos_jours: number | null
    date_debut: string
    date_fin: string
    observations: string
}
export interface LigneExamen {
    nom: string
    categorie: 'biologie' | 'imagerie'
}
export interface ChampsDemandeExamen {
    examens: LigneExamen[]
    indication_clinique: string
    urgence: 'normale' | 'urgente'
    commentaires: string
}
export interface ChampsCompteRendu {
    resume: string
    evolution: string
    recommandations: string
}
export interface ChampsLettreOrientation {
    destinataire: string
    motif_orientation: string
    elements_cliniques: string
    conclusion: string
}
export interface ChampsArretTravail {
    motif_medical: string
    date_debut: string
    date_fin: string
    duree_jours: number | null
}
export interface ChampsAutre {
    texte_libre: string
}

export interface DonneesDocument {
    contexte: ContexteDocument
    champs: ChampsOrdonnance | ChampsCertificatMedical | ChampsDemandeExamen
        | ChampsCompteRendu | ChampsLettreOrientation | ChampsArretTravail | ChampsAutre
}

export interface ModeleDocument {
    id: number
    nom: string
    type_document: TypeDocument
    type_document_label?: string
    entete: string
    pied_de_page: string
    actif: boolean
    cree_par: number | null
    cree_par_nom?: string | null
    date_creation: string
    date_modification: string
}

export interface DocumentGenere {
    id: number
    patient: number
    patient_nom?: string
    patient_prenom?: string
    consultation: number | null
    modele: number | null
    modele_nom?: string | null
    type_document: TypeDocument
    type_document_label?: string
    statut: StatutDocument
    statut_label?: string
    titre: string
    donnees: DonneesDocument
    contenu: string
    genere_par: number | null
    genere_par_nom?: string | null
    date_creation: string
    date_modification: string
    entete_rendue?: string
    pied_de_page_rendu?: string
}

export interface Medicament {
    id: number
    nom: string
    dci: string
    forme: string
    dosages_courants: string
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
    // true si l'assignation n'avait pas encore été faite par la majeure/chef
    // de service et a été générée automatiquement (mode démo/fallback)
    auto_assigne: boolean
    assignations: AssignationPatient[]
}

// ─── Gardes (fusion CreneauDisponibilite récurrent + ExceptionDisponibilite validée) ──
export interface GardeOccurrence {
    id: string
    source: 'recurrent' | 'exception'
    employe_id: number
    employe_nom: string
    employe_prenom: string
    employe_role_label: string
    type: 'garde' | 'astreinte'
    type_label: string
    start_time: string
    end_time: string
    motif: string
}

export interface GardesPlanningResponse {
    debut: string
    fin: string
    gardes: GardeOccurrence[]
}

// ─── Chirurgie / Opérations ──────────────────────────────────────────────────
export type StatutSalleBloc = 'disponible' | 'occupe' | 'desinfection_approfondie' | 'maintenance'
export type StatutIntervention = 'programmee' | 'en_cours' | 'terminee' | 'deces_au_bloc' | 'annulee'
/** @deprecated conservé pour compatibilité — utiliser StatutIntervention */
export type StatutOperation = StatutIntervention

export interface SalleBloc {
    id: number
    nom: string
    service: number
    service_nom?: string
    statut: StatutSalleBloc
    statut_label?: string
}

export interface MembreEquipeOperation {
    id: number
    nom: string
    prenom: string
    role: string
    role_label: string
    specialite_principale_nom: string | null
}

export interface Operation {
    id: number
    patient: number
    patient_nom?: string
    patient_prenom?: string
    patient_age?: number
    patient_sexe?: 'M' | 'F'
    patient_numero_dossier?: string
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
    equipe_detail?: MembreEquipeOperation[]
    type_acte: string
    heure_debut: string
    heure_fin: string
    date_debut_reelle: string | null
    date_fin_reelle: string | null
    statut: StatutIntervention
    statut_label: string
    compte_rendu_operatoire: string
    complications: string
    date_creation: string
    date_modification: string
}


export type TypeEvenementRdv = 'consultation' | 'intervention' | 'reunion' | 'formation' | 'garde' | 'visite_postoperatoire' | 'autre'
// Sous-ensemble utilisable pour un événement administratif (pas de patient) — reunion/formation/garde/autre.
export type TypeEvenementAdmin = 'reunion' | 'formation' | 'garde' | 'autre'

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
    source: 'medical' | 'administratif'
    patient?: {
        id: number
        nom_complet: string
        numero_dossier: string
        age: number
        sexe: 'M' | 'F'
    }
    alerte_critique: boolean
    consultation_id: number | null
    medecin_id: number | null
    medecin_nom: string | null
    medecin_prenom: string | null
    lieu?: string
    service?: number | null
    service_nom?: string | null
}

export interface EvenementAdministratif {
    id: number
    titre: string
    type_evenement: TypeEvenementAdmin
    type_evenement_label: string
    service: number | null
    service_nom: string | null
    date_heure_debut: string
    date_heure_fin: string
    lieu: string
    description: string
    participants: number[]
    organisateur: number | null
    organisateur_nom: string | null
    organisateur_prenom: string | null
    statut: 'planifie' | 'annule' | 'termine'
    statut_label: string
    date_creation: string
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

// Calqué sur ServiceViewSet.qualite (services/views.py) — tous les chiffres
// sont calculés à la volée sur des données réelles (Operation, Hospitalisation,
// RendezVous, PassageUrgence) ; `valeur`/`delta` sont null quand la période
// n'a tout simplement pas assez de données pour produire un taux fiable.
export interface QualiteIndicateur {
    valeur: number | null
    delta: number | null
    nb?: number
    total?: number
}

export interface QualiteIndicateurs {
    indicateurs: {
        periode: { depuis: string; jusqua: string; jours: number }
        taux_complications: QualiteIndicateur
        taux_readmission: QualiteIndicateur
        taux_annulation: QualiteIndicateur
        temps_operatoire_moyen: QualiteIndicateur
        temps_prise_en_charge_moyen: QualiteIndicateur
    }
    evolution: {
        semaine: string
        complications: number | null
        readmission: number | null
        annulation: number | null
    }[]
    evenements_recents: {
        date: string
        intervention: string
        service: string
        chirurgien: string
        description: string
    }[]
}

// Calqué sur OperationViewSet.stats (chirurgie/views.py) — réel, scopé par service.
export interface InterventionRecenteReelle {
    date: string | null
    patient: string
    type: string
    chirurgien: string
    duree: string | null
    issue: 'succes' | 'deces_au_bloc'
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
    repartition_par_type: { type_acte: string; nb: number }[]
    evolution_hebdo: { semaine: string; nb: number }[]
    dernieres_interventions: InterventionRecenteReelle[]
    par_chirurgien: ChirurgienPerfReelle[]
}

// Calqué sur ServiceViewSet.activite (services/views.py) : {'jour': ..., 'nb': ...} par jour
export interface ActiviteJour {
    jour: string
    nb: number}


// Calqué sur activites.serializers.JournalActiviteSerializer — bloc "activité
// récente" du Dashboard + page dédiée /activites.
export type TypeObjetActivite = 'rendez_vous' | 'consultation' | 'intervention' | 'patient' | 'hospitalisation' | 'urgence' | 'employe' | 'autre'
export type ActionActivite = 'creation' | 'modification' | 'suppression' | 'annulation' | 'autre'

export interface JournalActivite {
    id: number
    employe: number | null
    employe_nom: string | null
    employe_prenom: string | null
    employe_role_label: string | null
    service: number | null
    service_nom: string | null
    type_objet: TypeObjetActivite
    type_objet_label: string
    action: ActionActivite
    action_label: string
    description: string
    objet_id: number | null
    date_creation: string
}
// ─── Module Facturation & Encaissement ─────────────────────────────────────
// Miroir des modèles Django (facturation/models.py) et des serializers DRF.
// Les statuts utilisent les classes .badge-* déjà définies dans index.css
// (theme-aware, dark mode inclus) plutôt que des couleurs Tailwind en dur.

export type TypeActe =
    | 'consultation'
    | 'hospitalisation'
    | 'examen_laboratoire'
    | 'acte_chirurgical'
    | 'medicament'
    | 'autre'

export const TYPE_ACTE_LABELS: Record<TypeActe, string> = {
    consultation:        'Consultation',
    hospitalisation:     'Hospitalisation (nuitée)',
    examen_laboratoire:  'Examen de laboratoire',
    acte_chirurgical:    'Acte chirurgical',
    medicament:          'Médicament / Pharmacie',
    autre:               'Autre',
}

export type StatutFacture =
    | 'brouillon'
    | 'ouverte'
    | 'en_attente'
    | 'payee_partiellement'
    | 'payee'
    | 'annulee'

export const STATUT_FACTURE_LABELS: Record<StatutFacture, string> = {
    brouillon:            'Brouillon',
    ouverte:              'Ouverte (séjour en cours)',
    en_attente:           'En attente de paiement',
    payee_partiellement:  'Payée partiellement',
    payee:                'Payée',
    annulee:              'Annulée',
}

// Classe .badge-* (cf. index.css) par statut
export const STATUT_FACTURE_BADGE: Record<StatutFacture, string> = {
    brouillon:            'badge-muted',
    ouverte:              'badge-tint',
    en_attente:           'badge-warning',
    payee_partiellement:  'badge-warning',
    payee:                'badge-success',
    annulee:              'badge-muted',
}

export type StatutValidationAssurance =
    | 'non_soumis' | 'soumis' | 'valide' | 'rejete_partiel' | 'rejete'

export const STATUT_VALIDATION_ASSURANCE_LABELS: Record<StatutValidationAssurance, string> = {
    non_soumis:      'Non soumis',
    soumis:          "Soumis à l'assurance",
    valide:          "Validé par l'assurance",
    rejete_partiel:  'Rejeté partiellement',
    rejete:          'Rejeté',
}

export type ModePaiement =
    | 'especes' | 'carte_bancaire' | 'mobile_money' | 'virement' | 'prise_en_charge_assurance'

export const MODE_PAIEMENT_LABELS: Record<ModePaiement, string> = {
    especes:                    'Espèces',
    carte_bancaire:             'Carte bancaire',
    mobile_money:               'Mobile Money',
    virement:                   'Virement',
    prise_en_charge_assurance:  'Prise en charge assurance',
}

export type OperateurMobileMoney = 'wave' | 'orange_money' | 'free_money' | 'autre'

export const OPERATEUR_MOBILE_MONEY_LABELS: Record<OperateurMobileMoney, string> = {
    wave: 'Wave', orange_money: 'Orange Money', free_money: 'Free Money', autre: 'Autre',
}

export type PeriodiciteEcheance = 'hebdomadaire' | 'mensuelle' | 'bimensuelle'

export const PERIODICITE_ECHEANCE_LABELS: Record<PeriodiciteEcheance, string> = {
    hebdomadaire: 'Hebdomadaire', mensuelle: 'Mensuelle', bimensuelle: 'Bimensuelle',
}

export type StatutEcheancier = 'actif' | 'solde' | 'en_defaut' | 'annule'
export type StatutEcheance = 'a_venir' | 'payee' | 'en_retard' | 'impayee'

export const STATUT_ECHEANCE_LABELS: Record<StatutEcheance, string> = {
    a_venir: 'À venir', payee: 'Payée', en_retard: 'En retard', impayee: 'Impayée',
}
export const STATUT_ECHEANCE_BADGE: Record<StatutEcheance, string> = {
    a_venir: 'badge-tint', payee: 'badge-success', en_retard: 'badge-warning', impayee: 'badge-danger',
}

export type StatutBordereauAssurance = 'brouillon' | 'soumis' | 'traite'

export const STATUT_BORDEREAU_LABELS: Record<StatutBordereauAssurance, string> = {
    brouillon: 'Brouillon', soumis: 'Soumis', traite: 'Traité',
}
export const STATUT_BORDEREAU_BADGE: Record<StatutBordereauAssurance, string> = {
    brouillon: 'badge-muted', soumis: 'badge-tint', traite: 'badge-success',
}

export interface BordereauAssurance {
    id: number
    numero_bordereau: string
    mutuelle_nom: string
    statut: StatutBordereauAssurance
    date_creation: string
    date_soumission?: string | null
    cree_par?: number | null
    cree_par_nom?: string | null
    notes?: string
    nombre_lignes: number
    montant_total_demande: number
}

export interface ReponseAssurancePayload {
    statut: 'valide' | 'rejete' | 'rejete_partiel'
    montant_valide?: number
    motif_rejet?: string
}

export interface TarifActe {
    id: number
    type_acte: TypeActe
    code_acte: string
    libelle: string
    prix_unitaire: number
    service?: number | null
    service_nom?: string | null
    actif: boolean
    date_creation: string
    date_modification: string
}

export interface NouveauTarifActePayload {
    type_acte: TypeActe
    code_acte: string
    libelle: string
    prix_unitaire: number
    service?: number
    actif?: boolean
}

export interface LigneFacture {
    id: number
    facture: number
    tarif_acte?: number | null
    type_acte: TypeActe
    description: string
    code_acte?: string
    consultation?: number | null
    hospitalisation?: number | null
    demande_analyse?: number | null
    quantite: number
    prix_unitaire: number
    montant_ligne: number
    taux_prise_en_charge_assurance?: number | null
    montant_part_assurance_ligne: number
    montant_part_patient_ligne: number
    statut_assurance: StatutValidationAssurance
    motif_rejet?: string
    bordereau_assurance?: number | null
    montant_assurance_demande?: number | null
    date_acte: string
    notes?: string
}

export interface NouvelleLigneFacturePayload {
    tarif_acte?: number
    type_acte?: TypeActe
    description?: string
    consultation?: number
    hospitalisation?: number
    demande_analyse?: number
    quantite: number
    prix_unitaire?: number
    taux_prise_en_charge_assurance?: number
    date_acte: string
    notes?: string
}

export interface Paiement {
    id: number
    facture: number
    echeance?: number | null
    montant: number
    mode_paiement: ModePaiement
    operateur_mobile_money?: OperateurMobileMoney | null
    reference_transaction?: string
    date_paiement: string
    encaisse_par?: number | null
    encaisse_par_nom?: string | null
    notes?: string
}

export interface NouveauPaiementPayload {
    facture: number
    montant: number
    mode_paiement: ModePaiement
    echeance?: number
    operateur_mobile_money?: OperateurMobileMoney
    reference_transaction?: string
    notes?: string
}

export interface Echeance {
    id: number
    echeancier: number
    numero_echeance: number
    date_echeance: string
    montant_prevu: number
    montant_paye: number
    statut: StatutEcheance
}

export interface EcheancierPaiement {
    id: number
    facture: number
    montant_total_echeancier: number
    nombre_echeances: number
    periodicite: PeriodiciteEcheance
    date_premiere_echeance: string
    statut: StatutEcheancier
    engagement_signe: boolean
    date_signature?: string | null
    document_signe_url?: string | null
    garant_nom?: string
    garant_telephone?: string
    garant_cni?: string
    echeances: Echeance[]
    cree_par?: number | null
    cree_par_nom?: string | null
    date_creation: string
    notes?: string
}

export interface NouvelEcheancierPayload {
    montant_total_echeancier: number
    nombre_echeances: number
    periodicite: PeriodiciteEcheance
    date_premiere_echeance: string
    engagement_signe: boolean
    garant_nom?: string
    garant_telephone?: string
    garant_cni?: string
    notes?: string
}

export interface Facture {
    id: number
    numero_facture: string
    patient: number
    patient_nom?: string
    patient_prenom?: string
    patient_dossier?: string
    service?: number | null
    service_nom?: string | null
    hospitalisation?: number | null
    statut: StatutFacture
    statut_label?: string
    date_emission: string
    date_echeance?: string | null
    lignes: LigneFacture[]
    paiements: Paiement[]
    echeancier?: EcheancierPaiement | null
    mutuelle_nom?: string
    numero_mutuelle?: string
    part_assurance_pourcentage_defaut: number
    montant_total: number
    montant_part_assurance: number
    montant_part_patient: number
    montant_paye: number
    montant_restant: number
    notes?: string
    date_creation: string
    date_modification: string
    cree_par?: number | null
    cree_par_nom?: string | null
}

export interface NouvelleFacturePayload {
    patient: number
    service?: number
    hospitalisation?: number
    date_echeance?: string
    part_assurance_pourcentage_defaut?: number
    mutuelle_nom?: string
    numero_mutuelle?: string
    notes?: string
}

// Formate un montant en FCFA, cohérent partout dans le module.
export function formatMontant(montant: number | string): string {
    const n = typeof montant === 'string' ? parseFloat(montant) : montant
    return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n) + ' FCFA'
}