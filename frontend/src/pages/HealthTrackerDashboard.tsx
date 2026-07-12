import { useState, useMemo, useEffect } from "react";
import {
  Activity, Heart, Thermometer, Droplet, Weight, AlertTriangle, Bell,
  Search, Calendar, Stethoscope, ClipboardList, ChevronRight,
  Check, Clock, Syringe, BedDouble, ArrowUp, ArrowDown, Minus, Phone, Cross,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, ReferenceLine, Cell,
} from "recharts";

/* ============================================================================
   HEALTHTRACKER — Poste de contrôle infirmier
   Thème: moniteur clinique nocturne. Papier millimétré de dossier patient
   projeté sur fond de salle de soins, tracé ECG comme fil conducteur.
============================================================================ */

/* ---------------------------------- Types --------------------------------- */

type Sexe = "M" | "F";
type Gravite = "critique" | "surveillance" | "stable";
type AlerteType = "tension" | "glycemie" | "temperature" | "frequence" | "rdv" | "resultat_analyse" | "autre";
type AlerteStatut = "non_lue" | "lue" | "traitee";
type ConsultationType = "consultation" | "examen" | "operation" | "autre";
type ConsultationStatut = "planifiee" | "en_cours" | "terminee" | "annulee";
type RdvStatut = "planifie" | "confirme" | "annule" | "termine";
type MetricKey = "tension" | "temperature" | "glycemie" | "frequence" | "poids";
type TabKey = "alertes" | "consultations" | "rdv";

interface VitalReading {
  date: string; // ISO
  tensionSys: number;
  tensionDia: number;
  temperature: number;
  poids: number;
  glycemie: number;
  freqCardiaque: number;
}

interface Alerte {
  id: string;
  type: AlerteType;
  message: string;
  statut: AlerteStatut;
  date: string;
}

interface Consultation {
  id: string;
  type: ConsultationType;
  date: string;
  motif: string;
  symptomes?: string;
  diagnostic?: string;
  ordonnance?: string;
  statut: ConsultationStatut;
}

interface RendezVous {
  id: string;
  dateHeure: string;
  motif: string;
  statut: RdvStatut;
}

interface Patient {
  id: string;
  nom: string;
  prenom: string;
  sexe: Sexe;
  dateNaissance: string;
  numeroDossier: string;
  service: string;
  chambre: string;
  medecinReferent: string;
  groupeSanguin: string;
  allergies: string;
  antecedents: string;
  gravite: Gravite;
  vitals: VitalReading[];
  alertes: Alerte[];
  consultations: Consultation[];
  rendezVous: RendezVous[];
}

/* --------------------------------- Données --------------------------------- */

const SERVICES = ["Cardiologie", "Urgences", "Pédiatrie", "Chirurgie", "Réanimation", "Médecine interne"];

function j(offsetDays: number, h = 8, m = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

const PATIENTS_SEED: Patient[] = [
  {
    id: "p1", nom: "Ndiaye", prenom: "Fatou", sexe: "F", dateNaissance: "1968-03-14",
    numeroDossier: "P482913", service: "Cardiologie", chambre: "212-B",
    medecinReferent: "Dr. Moussa Ba", groupeSanguin: "O+",
    allergies: "Pénicilline", antecedents: "Hypertension artérielle chronique, diabète type 2",
    gravite: "surveillance",
    vitals: [
      { date: j(-5), tensionSys: 142, tensionDia: 88, temperature: 37.1, poids: 68.9, glycemie: 5.6, freqCardiaque: 84 },
      { date: j(-4), tensionSys: 146, tensionDia: 90, temperature: 37.0, poids: 68.8, glycemie: 5.9, freqCardiaque: 86 },
      { date: j(-3), tensionSys: 151, tensionDia: 92, temperature: 37.3, poids: 68.7, glycemie: 6.1, freqCardiaque: 88 },
      { date: j(-2), tensionSys: 149, tensionDia: 91, temperature: 37.2, poids: 68.6, glycemie: 5.8, freqCardiaque: 87 },
      { date: j(-1), tensionSys: 154, tensionDia: 94, temperature: 37.4, poids: 68.5, glycemie: 6.0, freqCardiaque: 90 },
      { date: j(0), tensionSys: 158, tensionDia: 96, temperature: 37.2, poids: 68.4, glycemie: 5.8, freqCardiaque: 92 },
    ],
    alertes: [
      { id: "a1-1", type: "tension", message: "Tension artérielle élevée (158/96) — au-delà du seuil habituel.", statut: "non_lue", date: j(0, 7, 40) },
      { id: "a1-2", type: "rdv", message: "Rappel : consultation de suivi cardiologique dans 3 jours.", statut: "lue", date: j(-2, 9, 0) },
    ],
    consultations: [
      { id: "c1-1", type: "consultation", date: j(-30), motif: "Suivi hypertension", diagnostic: "HTA modérée stabilisée sous traitement", ordonnance: "Amlodipine 5mg, 1cp/jour", statut: "terminee" },
      { id: "c1-2", type: "examen", date: j(-14), motif: "ECG de contrôle", diagnostic: "Rythme sinusal régulier, léger surcharge ventriculaire gauche", statut: "terminee" },
      { id: "c1-3", type: "consultation", date: j(3), motif: "Suivi tension et ajustement traitement", statut: "planifiee" },
    ],
    rendezVous: [
      { id: "r1-1", dateHeure: j(3, 10, 30), motif: "Consultation cardiologie de suivi", statut: "confirme" },
    ],
  },
  {
    id: "p2", nom: "Diallo", prenom: "Ibrahima", sexe: "M", dateNaissance: "1985-11-02",
    numeroDossier: "P219087", service: "Urgences", chambre: "Box 4",
    medecinReferent: "Dr. Aminata Sarr", groupeSanguin: "A-",
    allergies: "Aucune connue", antecedents: "Aucun antécédent notable",
    gravite: "critique",
    vitals: [
      { date: j(0, 2, 0), tensionSys: 96, tensionDia: 62, temperature: 38.4, poids: 74.0, glycemie: 5.2, freqCardiaque: 112 },
      { date: j(0, 4, 0), tensionSys: 92, tensionDia: 58, temperature: 38.7, poids: 74.0, glycemie: 5.1, freqCardiaque: 118 },
      { date: j(0, 6, 0), tensionSys: 90, tensionDia: 56, temperature: 38.8, poids: 74.0, glycemie: 5.0, freqCardiaque: 122 },
      { date: j(0, 8, 0), tensionSys: 89, tensionDia: 55, temperature: 38.9, poids: 74.0, glycemie: 5.0, freqCardiaque: 125 },
      { date: j(0, 10, 0), tensionSys: 88, tensionDia: 54, temperature: 38.9, poids: 74.0, glycemie: 4.9, freqCardiaque: 128 },
    ],
    alertes: [
      { id: "a2-1", type: "tension", message: "Hypotension marquée (88/54) associée à une tachycardie.", statut: "non_lue", date: j(0, 10, 5) },
      { id: "a2-2", type: "frequence", message: "Fréquence cardiaque élevée (128 bpm) — surveillance rapprochée requise.", statut: "non_lue", date: j(0, 10, 5) },
      { id: "a2-3", type: "temperature", message: "Fièvre persistante à 38.9°C.", statut: "lue", date: j(0, 8, 10) },
    ],
    consultations: [
      { id: "c2-1", type: "examen", date: j(0, 1, 30), motif: "Admission pour douleurs abdominales fébriles", symptomes: "Douleur en fosse iliaque droite, fièvre, tachycardie", diagnostic: "Suspicion d'appendicite compliquée", statut: "en_cours" },
    ],
    rendezVous: [],
  },
  {
    id: "p3", nom: "Sow", prenom: "Aïssatou", sexe: "F", dateNaissance: "2019-06-22",
    numeroDossier: "P330441", service: "Pédiatrie", chambre: "104-A",
    medecinReferent: "Dr. Cheikh Diop", groupeSanguin: "AB+",
    allergies: "Aucune connue", antecedents: "Naissance à terme, développement normal",
    gravite: "stable",
    vitals: [
      { date: j(-3), tensionSys: 96, tensionDia: 62, temperature: 36.9, poids: 18.2, glycemie: 4.8, freqCardiaque: 102 },
      { date: j(-2), tensionSys: 97, tensionDia: 63, temperature: 37.0, poids: 18.2, glycemie: 4.9, freqCardiaque: 100 },
      { date: j(-1), tensionSys: 95, tensionDia: 61, temperature: 36.8, poids: 18.3, glycemie: 4.7, freqCardiaque: 98 },
      { date: j(0), tensionSys: 96, tensionDia: 62, temperature: 36.9, poids: 18.3, glycemie: 4.8, freqCardiaque: 99 },
    ],
    alertes: [
      { id: "a3-1", type: "rdv", message: "Rappel vaccinal à programmer avant la fin du mois.", statut: "non_lue", date: j(-1, 15, 0) },
    ],
    consultations: [
      { id: "c3-1", type: "consultation", date: j(-1), motif: "Contrôle de croissance", diagnostic: "Courbe staturo-pondérale normale", statut: "terminee" },
    ],
    rendezVous: [
      { id: "r3-1", dateHeure: j(6, 9, 0), motif: "Rappel vaccinal (DTCP)", statut: "planifie" },
    ],
  },
  {
    id: "p4", nom: "Kane", prenom: "Moustapha", sexe: "M", dateNaissance: "1977-01-09",
    numeroDossier: "P501122", service: "Chirurgie", chambre: "308-C",
    medecinReferent: "Dr. Aminata Sarr", groupeSanguin: "B+",
    allergies: "Latex", antecedents: "Cholécystectomie il y a 2 jours",
    gravite: "surveillance",
    vitals: [
      { date: j(-2, 8, 0), tensionSys: 128, tensionDia: 82, temperature: 37.6, poids: 81.2, glycemie: 5.4, freqCardiaque: 88 },
      { date: j(-1, 8, 0), tensionSys: 124, tensionDia: 80, temperature: 37.9, poids: 80.9, glycemie: 5.3, freqCardiaque: 84 },
      { date: j(0, 8, 0), tensionSys: 122, tensionDia: 79, temperature: 38.1, poids: 80.7, glycemie: 5.2, freqCardiaque: 82 },
    ],
    alertes: [
      { id: "a4-1", type: "temperature", message: "Température post-opératoire à surveiller (38.1°C).", statut: "lue", date: j(0, 8, 5) },
    ],
    consultations: [
      { id: "c4-1", type: "operation", date: j(-2), motif: "Cholécystectomie laparoscopique", diagnostic: "Lithiase vésiculaire symptomatique", ordonnance: "Antalgiques, antibioprophylaxie", statut: "terminee" },
      { id: "c4-2", type: "consultation", date: j(1), motif: "Visite post-opératoire J+3", statut: "planifiee" },
    ],
    rendezVous: [
      { id: "r4-1", dateHeure: j(1, 11, 0), motif: "Contrôle cicatrice post-opératoire", statut: "confirme" },
    ],
  },
  {
    id: "p5", nom: "Diouf", prenom: "Mariama", sexe: "F", dateNaissance: "1990-09-30",
    numeroDossier: "P118820", service: "Réanimation", chambre: "R-02",
    medecinReferent: "Dr. Cheikh Diop", groupeSanguin: "O-",
    allergies: "Aucune connue", antecedents: "Polytraumatisme suite à accident de la route",
    gravite: "critique",
    vitals: [
      { date: j(0, 0, 0), tensionSys: 84, tensionDia: 50, temperature: 36.2, poids: 59.0, glycemie: 6.8, freqCardiaque: 138 },
      { date: j(0, 2, 0), tensionSys: 82, tensionDia: 49, temperature: 36.0, poids: 59.0, glycemie: 6.9, freqCardiaque: 142 },
      { date: j(0, 4, 0), tensionSys: 80, tensionDia: 48, temperature: 35.9, poids: 59.0, glycemie: 7.0, freqCardiaque: 145 },
    ],
    alertes: [
      { id: "a5-1", type: "frequence", message: "Tachycardie sévère (145 bpm) sous sédation.", statut: "non_lue", date: j(0, 4, 5) },
      { id: "a5-2", type: "tension", message: "Hypotension sévère (80/48) — soutien vasopresseur en cours.", statut: "non_lue", date: j(0, 4, 5) },
    ],
    consultations: [
      { id: "c5-1", type: "operation", date: j(0, -1, 0), motif: "Prise en charge polytraumatisme", diagnostic: "Fractures multiples, contusion thoracique", statut: "en_cours" },
    ],
    rendezVous: [],
  },
  {
    id: "p6", nom: "Fall", prenom: "Cheikh", sexe: "M", dateNaissance: "1962-05-18",
    numeroDossier: "P290034", service: "Médecine interne", chambre: "115-A",
    medecinReferent: "Dr. Moussa Ba", groupeSanguin: "A+",
    allergies: "Aucune connue", antecedents: "Diabète type 2 depuis 12 ans, insuffisance rénale légère",
    gravite: "surveillance",
    vitals: [
      { date: j(-4), tensionSys: 134, tensionDia: 84, temperature: 37.0, poids: 92.1, glycemie: 9.8, freqCardiaque: 76 },
      { date: j(-3), tensionSys: 132, tensionDia: 83, temperature: 36.9, poids: 92.0, glycemie: 10.4, freqCardiaque: 78 },
      { date: j(-2), tensionSys: 136, tensionDia: 85, temperature: 37.1, poids: 91.9, glycemie: 11.2, freqCardiaque: 79 },
      { date: j(-1), tensionSys: 133, tensionDia: 84, temperature: 36.9, poids: 91.8, glycemie: 12.0, freqCardiaque: 80 },
      { date: j(0), tensionSys: 135, tensionDia: 85, temperature: 37.0, poids: 91.8, glycemie: 12.4, freqCardiaque: 81 },
    ],
    alertes: [
      { id: "a6-1", type: "glycemie", message: "Glycémie mal contrôlée, tendance à la hausse (12.4 g/L).", statut: "non_lue", date: j(0, 7, 0) },
      { id: "a6-2", type: "resultat_analyse", message: "Résultat de la fonction rénale disponible.", statut: "lue", date: j(-1, 16, 0) },
    ],
    consultations: [
      { id: "c6-1", type: "consultation", date: j(-10), motif: "Suivi diabète et fonction rénale", diagnostic: "Déséquilibre glycémique, à réajuster", ordonnance: "Metformine 1000mg x2/jour", statut: "terminee" },
    ],
    rendezVous: [
      { id: "r6-1", dateHeure: j(5, 14, 0), motif: "Consultation diabétologie", statut: "planifie" },
    ],
  },
  {
    id: "p7", nom: "Ba", prenom: "Awa", sexe: "F", dateNaissance: "1995-12-11",
    numeroDossier: "P404556", service: "Cardiologie", chambre: "210-A",
    medecinReferent: "Dr. Moussa Ba", groupeSanguin: "B-",
    allergies: "Aucune connue", antecedents: "Palpitations occasionnelles, sans cardiopathie structurelle",
    gravite: "stable",
    vitals: [
      { date: j(-3), tensionSys: 116, tensionDia: 74, temperature: 36.8, poids: 61.4, glycemie: 4.9, freqCardiaque: 70 },
      { date: j(-2), tensionSys: 118, tensionDia: 75, temperature: 36.9, poids: 61.3, glycemie: 4.8, freqCardiaque: 68 },
      { date: j(-1), tensionSys: 115, tensionDia: 73, temperature: 36.7, poids: 61.3, glycemie: 4.9, freqCardiaque: 69 },
      { date: j(0), tensionSys: 117, tensionDia: 74, temperature: 36.8, poids: 61.2, glycemie: 4.8, freqCardiaque: 67 },
    ],
    alertes: [],
    consultations: [
      { id: "c7-1", type: "examen", date: j(-1), motif: "Holter ECG 24h", diagnostic: "Absence de trouble du rythme significatif", statut: "terminee" },
    ],
    rendezVous: [
      { id: "r7-1", dateHeure: j(10, 9, 30), motif: "Consultation de suivi cardiologique", statut: "planifie" },
    ],
  },
  {
    id: "p8", nom: "Gueye", prenom: "Ousmane", sexe: "M", dateNaissance: "1954-08-27",
    numeroDossier: "P187765", service: "Médecine interne", chambre: "118-B",
    medecinReferent: "Dr. Aminata Sarr", groupeSanguin: "O+",
    allergies: "Sulfamides", antecedents: "BPCO, ancien tabagisme",
    gravite: "stable",
    vitals: [
      { date: j(-2), tensionSys: 128, tensionDia: 80, temperature: 37.0, poids: 70.5, glycemie: 5.3, freqCardiaque: 74 },
      { date: j(-1), tensionSys: 126, tensionDia: 79, temperature: 36.9, poids: 70.4, glycemie: 5.2, freqCardiaque: 73 },
      { date: j(0), tensionSys: 127, tensionDia: 80, temperature: 36.9, poids: 70.4, glycemie: 5.3, freqCardiaque: 72 },
    ],
    alertes: [
      { id: "a8-1", type: "resultat_analyse", message: "Spirométrie de contrôle disponible.", statut: "traitee", date: j(-3, 10, 0) },
    ],
    consultations: [
      { id: "c8-1", type: "examen", date: j(-3), motif: "Spirométrie de suivi BPCO", diagnostic: "Stabilité de la fonction respiratoire", statut: "terminee" },
    ],
    rendezVous: [
      { id: "r8-1", dateHeure: j(8, 10, 0), motif: "Consultation pneumologique", statut: "planifie" },
    ],
  },
];

/* ------------------------------- Utilitaires ------------------------------- */

function computeAge(dateNaissance: string): number {
  const today = new Date();
  const d = new Date(dateNaissance);
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
  return age;
}

function formatDateFR(iso: string, withTime = false): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
  if (!withTime) return date;
  const time = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  return `${date} · ${time}`;
}

function shortDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }) + " " +
      d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

const GRAVITE_COLOR: Record<Gravite, string> = {
  critique: "var(--coral)",
  surveillance: "var(--amber)",
  stable: "var(--teal)",
};

const GRAVITE_LABEL: Record<Gravite, string> = {
  critique: "Critique",
  surveillance: "Surveillance",
  stable: "Stable",
};

const GRAVITE_ORDER: Record<Gravite, number> = { critique: 0, surveillance: 1, stable: 2 };

const ALERTE_LABEL: Record<AlerteType, string> = {
  tension: "Tension anormale",
  glycemie: "Glycémie anormale",
  temperature: "Température anormale",
  frequence: "Fréquence cardiaque anormale",
  rdv: "Rendez-vous",
  resultat_analyse: "Résultat d'analyse",
  autre: "Autre",
};

const ALERTE_ICON: Record<AlerteType, any> = {
  tension: Activity,
  glycemie: Droplet,
  temperature: Thermometer,
  frequence: Heart,
  rdv: Calendar,
  resultat_analyse: ClipboardList,
  autre: Bell,
};

const CONSULT_LABEL: Record<ConsultationType, string> = {
  consultation: "Consultation",
  examen: "Examen",
  operation: "Opération",
  autre: "Autre",
};

const CONSULT_ICON: Record<ConsultationType, any> = {
  consultation: Stethoscope,
  examen: ClipboardList,
  operation: Syringe,
  autre: Activity,
};

const CONSULT_STATUT_COLOR: Record<ConsultationStatut, string> = {
  planifiee: "var(--blue)",
  en_cours: "var(--amber)",
  terminee: "var(--teal)",
  annulee: "var(--text-faint)",
};

const CONSULT_STATUT_LABEL: Record<ConsultationStatut, string> = {
  planifiee: "Planifiée", en_cours: "En cours", terminee: "Terminée", annulee: "Annulée",
};

const RDV_STATUT_COLOR: Record<RdvStatut, string> = {
  planifie: "var(--blue)", confirme: "var(--teal)", annule: "var(--text-faint)", termine: "var(--text-dim)",
};

const RDV_STATUT_LABEL: Record<RdvStatut, string> = {
  planifie: "Planifié", confirme: "Confirmé", annule: "Annulé", termine: "Terminé",
};

interface MetricConfig {
  key: MetricKey;
  label: string;
  unit: string;
  icon: any;
  color: string;
  normal: [number, number];
  get: (v: VitalReading) => number;
  getSecondary?: (v: VitalReading) => number;
  format: (v: VitalReading) => string;
}

const METRICS: MetricConfig[] = [
  {
    key: "tension", label: "Tension artérielle", unit: "mmHg", icon: Activity, color: "var(--teal)",
    normal: [90, 130], get: (v) => v.tensionSys, getSecondary: (v) => v.tensionDia,
    format: (v) => `${v.tensionSys}/${v.tensionDia}`,
  },
  {
    key: "frequence", label: "Fréquence cardiaque", unit: "bpm", icon: Heart, color: "var(--coral)",
    normal: [60, 100], get: (v) => v.freqCardiaque, format: (v) => `${v.freqCardiaque}`,
  },
  {
    key: "temperature", label: "Température", unit: "°C", icon: Thermometer, color: "var(--amber)",
    normal: [36.1, 37.5], get: (v) => v.temperature, format: (v) => v.temperature.toFixed(1),
  },
  {
    key: "glycemie", label: "Glycémie", unit: "g/L", icon: Droplet, color: "var(--blue)",
    normal: [3.9, 6.1], get: (v) => v.glycemie, format: (v) => v.glycemie.toFixed(1),
  },
  {
    key: "poids", label: "Poids", unit: "kg", icon: Weight, color: "var(--violet)",
    normal: [0, 999], get: (v) => v.poids, format: (v) => v.poids.toFixed(1),
  },
];

function isOutOfRange(metric: MetricConfig, v: VitalReading): boolean {
  const val = metric.get(v);
  return val < metric.normal[0] || val > metric.normal[1];
}

/* ------------------------------- Sous-composants ------------------------------- */

function EKGTrace({ color = "var(--teal)", height = 40 }: { color?: string; height?: number }) {
  const path = "M0,20 L40,20 L48,20 L54,6 L62,34 L70,20 L82,20 L88,10 L94,20 L400,20 L408,20 L414,6 L422,34 L430,20 L442,20 L448,10 L454,20 L760,20 L768,20 L774,6 L782,34 L790,20 L802,20 L808,10 L814,20 L1120,20";
  return (
      <svg viewBox="0 0 1120 40" preserveAspectRatio="none" style={{ width: "100%", height }}>
        <path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" className="htk-ekg-path" />
      </svg>
  );
}

function PulseDot({ freq, color }: { freq: number; color: string }) {
  const duration = Math.min(1.6, Math.max(0.4, 60 / Math.max(freq, 20)));
  return (
      <span
          className="htk-pulse-dot"
          style={{ background: color, animationDuration: `${duration}s`, boxShadow: `0 0 0 0 ${color}` }}
      />
  );
}

function Trend({ current, previous }: { current: number; previous?: number }) {
  if (previous === undefined) return <Minus size={13} className="htk-text-faint" />;
  const diff = current - previous;
  if (Math.abs(diff) < 0.05) return <Minus size={13} className="htk-text-faint" />;
  return diff > 0
      ? <ArrowUp size={13} style={{ color: "var(--coral)" }} />
      : <ArrowDown size={13} style={{ color: "var(--teal)" }} />;
}

function StatTile({ icon: Icon, label, value, sub, color }: { icon: any; label: string; value: string; sub?: string; color: string }) {
  return (
      <div className="htk-stat-tile">
        <div className="htk-stat-icon" style={{ color, background: `${color}1a` }}>
          <Icon size={17} />
        </div>
        <div>
          <div className="htk-stat-value">{value}</div>
          <div className="htk-stat-label">{label}</div>
          {sub && <div className="htk-stat-sub">{sub}</div>}
        </div>
      </div>
  );
}

function GraviteBadge({ gravite, size = "md" }: { gravite: Gravite; size?: "sm" | "md" }) {
  const color = GRAVITE_COLOR[gravite];
  return (
      <span
          className={`htk-badge ${size === "sm" ? "htk-badge-sm" : ""}`}
          style={{ color, borderColor: `${color}55`, background: `${color}14` }}
      >
      <span className="htk-badge-dot" style={{ background: color }} />
        {GRAVITE_LABEL[gravite]}
    </span>
  );
}

function PatientListItem({ p, active, onClick }: { p: Patient; active: boolean; onClick: () => void }) {
  const last = p.vitals[p.vitals.length - 1];
  const color = GRAVITE_COLOR[p.gravite];
  const unread = p.alertes.filter((a) => a.statut === "non_lue").length;
  return (
      <button onClick={onClick} className="htk-patient-item" style={{ borderLeftColor: color, background: active ? "var(--panel-alt)" : "transparent" }}>
        <div className="htk-avatar" style={{ background: `${color}1f`, color }}>
          {p.prenom[0]}{p.nom[0]}
        </div>
        <div className="htk-patient-item-body">
          <div className="htk-patient-item-top">
            <span className="htk-patient-name">{p.prenom} {p.nom}</span>
            <PulseDot freq={last.freqCardiaque} color={color} />
          </div>
          <div className="htk-patient-item-meta">
            {computeAge(p.dateNaissance)} ans · {p.service} · Ch. {p.chambre}
          </div>
          <div className="htk-patient-item-vitals">
            <span><Activity size={11} /> {last.tensionSys}/{last.tensionDia}</span>
            <span><Thermometer size={11} /> {last.temperature.toFixed(1)}°</span>
            <span><Heart size={11} /> {last.freqCardiaque}</span>
          </div>
        </div>
        {unread > 0 && <span className="htk-unread-badge">{unread}</span>}
        <ChevronRight size={16} className="htk-text-faint" />
      </button>
  );
}

/* --------------------------------- Composant principal --------------------------------- */

export default function HealthTrackerDashboard() {
  const [patients, setPatients] = useState<Patient[]>(PATIENTS_SEED);
  const [selectedId, setSelectedId] = useState<string>(PATIENTS_SEED[0].id);
  const [search, setSearch] = useState("");
  const [serviceFilter, setServiceFilter] = useState<string>("Tous");
  const [metric, setMetric] = useState<MetricKey>("tension");
  const [tab, setTab] = useState<TabKey>("alertes");
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000 * 30);
    return () => clearInterval(t);
  }, []);

  const filteredPatients = useMemo(() => {
    return patients
        .filter((p) => serviceFilter === "Tous" || p.service === serviceFilter)
        .filter((p) => {
          const q = search.trim().toLowerCase();
          if (!q) return true;
          return (
              p.nom.toLowerCase().includes(q) ||
              p.prenom.toLowerCase().includes(q) ||
              p.numeroDossier.toLowerCase().includes(q)
          );
        })
        .sort((a, b) => GRAVITE_ORDER[a.gravite] - GRAVITE_ORDER[b.gravite] || a.nom.localeCompare(b.nom));
  }, [patients, search, serviceFilter]);

  const selected = patients.find((p) => p.id === selectedId) ?? filteredPatients[0] ?? patients[0];

  const globalStats = useMemo(() => {
    const totalAlertesNonLues = patients.reduce((sum, p) => sum + p.alertes.filter((a) => a.statut === "non_lue").length, 0);
    const nbCritiques = patients.filter((p) => p.gravite === "critique").length;
    const avgFc = Math.round(
        patients.reduce((sum, p) => sum + p.vitals[p.vitals.length - 1].freqCardiaque, 0) / patients.length
    );
    const litsTotal = 40;
    const occupation = Math.round((patients.length / litsTotal) * 100);
    const parService = SERVICES.map((s) => ({
      service: s.length > 10 ? s.slice(0, 9) + "." : s,
      full: s,
      count: patients.filter((p) => p.service === s).length,
    }));
    return { totalAlertesNonLues, nbCritiques, avgFc, occupation, litsTotal, parService };
  }, [patients]);

  function updateAlerteStatut(patientId: string, alerteId: string, nextStatut: AlerteStatut) {
    setPatients((prev) =>
        prev.map((p) =>
            p.id !== patientId
                ? p
                : { ...p, alertes: p.alertes.map((a) => (a.id === alerteId ? { ...a, statut: nextStatut } : a)) }
        )
    );
  }

  function nextAlerteStatut(s: AlerteStatut): AlerteStatut {
    if (s === "non_lue") return "lue";
    if (s === "lue") return "traitee";
    return "traitee";
  }

  const activeMetric = METRICS.find((m) => m.key === metric)!;
  const chartData = selected.vitals.map((v) => ({
    label: shortDate(v.date),
    primary: activeMetric.get(v),
    secondary: activeMetric.getSecondary ? activeMetric.getSecondary(v) : undefined,
  }));

  const lastReading = selected.vitals[selected.vitals.length - 1];
  const prevReading = selected.vitals[selected.vitals.length - 2];

  return (
      <div className="htk-root">
        <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Spectral:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap');

        .htk-root {
          --bg: #0c1a18;
          --panel: #12211f;
          --panel-alt: #17302c;
          --panel-raised: #1c3a34;
          --border: rgba(140,200,190,0.14);
          --grid-line: rgba(140,200,190,0.055);
          --teal: #3fbfad;
          --coral: #ff6b5b;
          --amber: #ffb74d;
          --blue: #5ec8e0;
          --violet: #b39dde;
          --text: #e9f4f1;
          --text-dim: #86a8a1;
          --text-faint: #4d6864;
          --font-display: 'Spectral', Georgia, serif;
          --font-mono: 'JetBrains Mono', 'Courier New', monospace;

          background: var(--bg);
          color: var(--text);
          font-family: var(--font-mono);
          min-height: 100vh;
          position: relative;
          background-image:
            linear-gradient(var(--grid-line) 1px, transparent 1px),
            linear-gradient(90deg, var(--grid-line) 1px, transparent 1px);
          background-size: 26px 26px;
        }
        .htk-root * { box-sizing: border-box; }
        .htk-text-faint { color: var(--text-faint); }
        .htk-text-dim { color: var(--text-dim); }

        /* ---------- header ---------- */
        .htk-header {
          display: flex; align-items: center; gap: 20px;
          padding: 16px 22px; border-bottom: 1px solid var(--border);
          background: linear-gradient(180deg, rgba(18,33,31,0.9), rgba(18,33,31,0.5));
          position: sticky; top: 0; z-index: 20; backdrop-filter: blur(6px);
        }
        .htk-logo-mark {
          width: 38px; height: 38px; border-radius: 9px; flex-shrink: 0;
          background: var(--panel-raised); border: 1px solid var(--border);
          display: flex; align-items: center; justify-content: center; color: var(--teal);
        }
        .htk-hospital-name { font-family: var(--font-display); font-size: 18px; font-weight: 600; letter-spacing: 0.2px; }
        .htk-hospital-sub { font-size: 10.5px; color: var(--text-dim); letter-spacing: 1.6px; text-transform: uppercase; margin-top: 1px; }
        .htk-ekg-wrap { flex: 1; overflow: hidden; opacity: 0.85; min-width: 120px; }
        .htk-ekg-path { stroke-dasharray: 1120; animation: htk-ekg-run 3.2s linear infinite; }
        @keyframes htk-ekg-run { from { stroke-dashoffset: 1120; } to { stroke-dashoffset: 0; } }
        .htk-clock { font-family: var(--font-mono); font-size: 22px; font-weight: 600; letter-spacing: 1px; text-align: right; }
        .htk-date { font-size: 11px; color: var(--text-dim); text-align: right; text-transform: capitalize; }

        /* ---------- stats bar ---------- */
        .htk-stats-bar {
          display: grid; grid-template-columns: repeat(4, minmax(0,1fr)) 220px; gap: 14px;
          padding: 16px 22px; border-bottom: 1px solid var(--border);
        }
        .htk-stat-tile { display: flex; align-items: center; gap: 11px; background: var(--panel); border: 1px solid var(--border); border-radius: 10px; padding: 10px 13px; }
        .htk-stat-icon { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .htk-stat-value { font-family: var(--font-mono); font-size: 19px; font-weight: 600; line-height: 1.1; }
        .htk-stat-label { font-size: 10.5px; color: var(--text-dim); margin-top: 2px; letter-spacing: 0.3px; }
        .htk-stat-sub { font-size: 9.5px; color: var(--text-faint); margin-top: 1px; }
        .htk-occ-chart { background: var(--panel); border: 1px solid var(--border); border-radius: 10px; padding: 8px 10px; }
        .htk-occ-title { font-size: 9.5px; color: var(--text-dim); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 2px; }

        /* ---------- body layout ---------- */
        .htk-body { display: grid; grid-template-columns: 340px 1fr; gap: 0; }
        .htk-sidebar { border-right: 1px solid var(--border); min-height: calc(100vh - 172px); background: rgba(12,26,24,0.4); }
        .htk-sidebar-controls { padding: 14px 14px 10px; border-bottom: 1px solid var(--border); display: flex; flex-direction: column; gap: 8px; }
        .htk-search { display: flex; align-items: center; gap: 8px; background: var(--panel); border: 1px solid var(--border); border-radius: 8px; padding: 8px 10px; }
        .htk-search input { background: transparent; border: none; outline: none; color: var(--text); font-family: var(--font-mono); font-size: 12.5px; width: 100%; }
        .htk-search input::placeholder { color: var(--text-faint); }
        .htk-select { background: var(--panel); border: 1px solid var(--border); color: var(--text); border-radius: 8px; padding: 7px 9px; font-family: var(--font-mono); font-size: 12px; outline: none; }
        .htk-patient-list { display: flex; flex-direction: column; max-height: calc(100vh - 262px); overflow-y: auto; }
        .htk-patient-item {
          all: unset; display: flex; align-items: center; gap: 10px; padding: 11px 14px;
          border-left: 3px solid transparent; border-bottom: 1px solid var(--border);
          cursor: pointer; position: relative; transition: background 0.15s ease;
        }
        .htk-patient-item:hover { background: var(--panel-alt); }
        .htk-avatar {
          width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
          font-family: var(--font-display); font-weight: 600; font-size: 12.5px; flex-shrink: 0;
        }
        .htk-patient-item-body { flex: 1; min-width: 0; }
        .htk-patient-item-top { display: flex; align-items: center; justify-content: space-between; gap: 6px; }
        .htk-patient-name { font-family: var(--font-display); font-weight: 600; font-size: 13.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .htk-patient-item-meta { font-size: 10.5px; color: var(--text-dim); margin-top: 1px; }
        .htk-patient-item-vitals { display: flex; gap: 9px; margin-top: 4px; font-size: 10px; color: var(--text-dim); }
        .htk-patient-item-vitals span { display: flex; align-items: center; gap: 3px; }
        .htk-unread-badge {
          background: var(--coral); color: #1a0f0c; font-size: 10px; font-weight: 700; border-radius: 999px;
          min-width: 17px; height: 17px; display: flex; align-items: center; justify-content: center; padding: 0 4px;
        }
        .htk-pulse-dot { width: 7px; height: 7px; border-radius: 50%; display: inline-block; flex-shrink: 0; animation: htk-pulse ease-out infinite; }
        @keyframes htk-pulse { 0% { box-shadow: 0 0 0 0 currentColor; opacity: 1; } 70% { box-shadow: 0 0 0 6px transparent; opacity: 0.6; } 100% { box-shadow: 0 0 0 0 transparent; opacity: 1; } }

        /* ---------- main ---------- */
        .htk-main { padding: 20px 24px 40px; }
        .htk-card { background: var(--panel); border: 1px solid var(--border); border-radius: 12px; padding: 18px 20px; margin-bottom: 16px; }
        .htk-patient-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; flex-wrap: wrap; }
        .htk-patient-title { display: flex; align-items: center; gap: 14px; }
        .htk-avatar-lg {
          width: 56px; height: 56px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
          font-family: var(--font-display); font-weight: 700; font-size: 19px; border: 1px solid var(--border);
        }
        .htk-patient-name-lg { font-family: var(--font-display); font-size: 23px; font-weight: 700; }
        .htk-patient-sub { font-size: 12px; color: var(--text-dim); margin-top: 3px; }
        .htk-dossier { font-family: var(--font-mono); color: var(--text-dim); font-size: 11.5px; letter-spacing: 0.5px; }
        .htk-chip-row { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 10px; }
        .htk-chip {
          font-size: 11px; padding: 4px 10px; border-radius: 999px; border: 1px solid var(--border);
          background: var(--panel-alt); color: var(--text-dim); display: flex; align-items: center; gap: 5px;
        }
        .htk-badge {
          font-size: 11px; font-weight: 600; padding: 4px 10px 4px 8px; border-radius: 999px; border: 1px solid;
          display: inline-flex; align-items: center; gap: 6px; text-transform: uppercase; letter-spacing: 0.4px;
        }
        .htk-badge-sm { font-size: 10px; padding: 2px 8px 2px 7px; }
        .htk-badge-dot { width: 6px; height: 6px; border-radius: 50%; }
        .htk-allergy-banner {
          margin-top: 14px; display: flex; align-items: center; gap: 10px; background: rgba(255,107,91,0.1);
          border: 1px solid rgba(255,107,91,0.35); color: var(--coral); border-radius: 9px; padding: 9px 12px; font-size: 12.5px;
        }

        .htk-section-title {
          font-family: var(--font-display); font-size: 13.5px; font-weight: 600; text-transform: uppercase;
          letter-spacing: 1px; color: var(--text-dim); margin-bottom: 12px; display: flex; align-items: center; gap: 8px;
        }
        .htk-vitals-grid { display: grid; grid-template-columns: repeat(5, minmax(0,1fr)); gap: 10px; }
        .htk-vital-tile { background: var(--panel-alt); border: 1px solid var(--border); border-radius: 10px; padding: 12px; cursor: pointer; transition: border-color 0.15s ease; }
        .htk-vital-tile.active { border-color: var(--tile-color, var(--teal)); }
        .htk-vital-tile-top { display: flex; align-items: center; justify-content: space-between; }
        .htk-vital-value { font-family: var(--font-mono); font-size: 21px; font-weight: 700; margin-top: 8px; }
        .htk-vital-unit { font-size: 10.5px; color: var(--text-faint); margin-left: 3px; }
        .htk-vital-label { font-size: 10.5px; color: var(--text-dim); margin-top: 3px; display: flex; align-items: center; gap: 4px; }
        .htk-vital-tile.out-of-range .htk-vital-value { color: var(--coral); }

        .htk-metric-tabs { display: flex; gap: 6px; margin-bottom: 12px; flex-wrap: wrap; }
        .htk-metric-tab {
          all: unset; cursor: pointer; font-size: 11.5px; padding: 6px 12px; border-radius: 999px; border: 1px solid var(--border);
          color: var(--text-dim); display: flex; align-items: center; gap: 6px;
        }
        .htk-metric-tab.active { background: var(--panel-raised); color: var(--text); border-color: var(--tab-color); }

        .htk-tabs { display: flex; gap: 4px; border-bottom: 1px solid var(--border); margin-bottom: 14px; }
        .htk-tab-btn {
          all: unset; cursor: pointer; padding: 9px 16px; font-size: 12.5px; font-weight: 600; color: var(--text-dim);
          border-bottom: 2px solid transparent; display: flex; align-items: center; gap: 7px;
        }
        .htk-tab-btn.active { color: var(--text); border-bottom-color: var(--teal); }
        .htk-tab-count { background: var(--panel-raised); font-size: 10px; padding: 1px 6px; border-radius: 999px; }

        .htk-alert-row { display: flex; align-items: flex-start; gap: 12px; padding: 12px 4px; border-bottom: 1px solid var(--border); }
        .htk-alert-row:last-child { border-bottom: none; }
        .htk-alert-icon { width: 30px; height: 30px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .htk-alert-msg { font-size: 12.5px; line-height: 1.5; }
        .htk-alert-meta { font-size: 10.5px; color: var(--text-faint); margin-top: 4px; display: flex; gap: 8px; align-items: center; }
        .htk-alert-btn {
          all: unset; cursor: pointer; font-size: 10.5px; padding: 4px 9px; border-radius: 6px; border: 1px solid var(--border);
          color: var(--text-dim); white-space: nowrap;
        }
        .htk-alert-btn:hover { border-color: var(--teal); color: var(--teal); }
        .htk-alert-btn[disabled] { opacity: 0.5; cursor: default; }

        .htk-timeline { position: relative; padding-left: 22px; }
        .htk-timeline::before { content: ''; position: absolute; left: 6px; top: 4px; bottom: 4px; width: 1px; background: var(--border); }
        .htk-timeline-item { position: relative; padding-bottom: 18px; }
        .htk-timeline-item:last-child { padding-bottom: 0; }
        .htk-timeline-dot { position: absolute; left: -22px; top: 3px; width: 12px; height: 12px; border-radius: 50%; border: 2px solid var(--bg); }
        .htk-timeline-head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .htk-timeline-type { font-family: var(--font-display); font-weight: 600; font-size: 13px; }
        .htk-timeline-date { font-size: 10.5px; color: var(--text-faint); }
        .htk-timeline-motif { font-size: 12.5px; color: var(--text-dim); margin-top: 3px; }
        .htk-timeline-detail { font-size: 11.5px; color: var(--text-dim); margin-top: 6px; background: var(--panel-alt); border-radius: 8px; padding: 8px 10px; border: 1px solid var(--border); }
        .htk-timeline-detail-label { font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.6px; color: var(--text-faint); margin-bottom: 2px; }

        .htk-rdv-item { display: flex; align-items: center; gap: 12px; padding: 11px 4px; border-bottom: 1px solid var(--border); }
        .htk-rdv-item:last-child { border-bottom: none; }
        .htk-rdv-date-block { width: 52px; text-align: center; background: var(--panel-alt); border-radius: 8px; padding: 6px 4px; border: 1px solid var(--border); flex-shrink: 0; }
        .htk-rdv-day { font-family: var(--font-mono); font-weight: 700; font-size: 15px; line-height: 1; }
        .htk-rdv-month { font-size: 9px; text-transform: uppercase; color: var(--text-dim); }

        .htk-empty { text-align: center; padding: 30px 10px; color: var(--text-faint); font-size: 12.5px; }

        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-thumb { background: var(--panel-raised); border-radius: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }

        @media (max-width: 900px) {
          .htk-body { grid-template-columns: 1fr; }
          .htk-sidebar { border-right: none; border-bottom: 1px solid var(--border); }
          .htk-stats-bar { grid-template-columns: repeat(2, 1fr); }
          .htk-vitals-grid { grid-template-columns: repeat(2, 1fr); }
        }
      `}</style>

        {/* ---------------- HEADER ---------------- */}
        <header className="htk-header">
          <div className="htk-logo-mark"><Cross size={19} /></div>
          <div>
            <div className="htk-hospital-name">HealthTracker</div>
            <div className="htk-hospital-sub">Centre Hospitalier Régional · Dakar</div>
          </div>
          <div className="htk-ekg-wrap"><EKGTrace color="var(--teal)" /></div>
          <div>
            <div className="htk-clock">{now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</div>
            <div className="htk-date">{now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}</div>
          </div>
        </header>

        {/* ---------------- STATS BAR ---------------- */}
        <div className="htk-stats-bar">
          <StatTile icon={BedDouble} label="Patients admis" value={String(patients.length)} sub={`${globalStats.occupation}% d'occupation`} color="var(--teal)" />
          <StatTile icon={AlertTriangle} label="Alertes non lues" value={String(globalStats.totalAlertesNonLues)} sub="toutes unités confondues" color="var(--coral)" />
          <StatTile icon={Heart} label="Cas critiques" value={String(globalStats.nbCritiques)} sub="nécessitant surveillance" color="var(--amber)" />
          <StatTile icon={Activity} label="FC moyenne" value={`${globalStats.avgFc}`} sub="battements / min" color="var(--blue)" />
          <div className="htk-occ-chart">
            <div className="htk-occ-title">Occupation par service</div>
            <ResponsiveContainer width="100%" height={62}>
              <BarChart data={globalStats.parService} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                <XAxis dataKey="service" tick={{ fill: "var(--text-faint)", fontSize: 8.5 }} axisLine={false} tickLine={false} interval={0} />
                <YAxis hide />
                <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                  {globalStats.parService.map((entry, i) => (
                      <Cell key={i} fill={entry.count > 2 ? "var(--coral)" : "var(--teal)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ---------------- BODY ---------------- */}
        <div className="htk-body">
          {/* ---------- SIDEBAR ---------- */}
          <aside className="htk-sidebar">
            <div className="htk-sidebar-controls">
              <div className="htk-search">
                <Search size={14} color="var(--text-faint)" />
                <input placeholder="Rechercher nom, dossier..." value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <select className="htk-select" value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value)}>
                <option>Tous</option>
                {SERVICES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="htk-patient-list">
              {filteredPatients.length === 0 && <div className="htk-empty">Aucun patient ne correspond à la recherche.</div>}
              {filteredPatients.map((p) => (
                  <PatientListItem key={p.id} p={p} active={p.id === selected.id} onClick={() => { setSelectedId(p.id); setTab("alertes"); }} />
              ))}
            </div>
          </aside>

          {/* ---------- MAIN ---------- */}
          <main className="htk-main">
            {/* Fiche patient */}
            <div className="htk-card">
              <div className="htk-patient-header">
                <div className="htk-patient-title">
                  <div className="htk-avatar-lg" style={{ background: `${GRAVITE_COLOR[selected.gravite]}1f`, color: GRAVITE_COLOR[selected.gravite] }}>
                    {selected.prenom[0]}{selected.nom[0]}
                  </div>
                  <div>
                    <div className="htk-patient-name-lg">{selected.prenom} {selected.nom}</div>
                    <div className="htk-patient-sub">
                      {computeAge(selected.dateNaissance)} ans · {selected.sexe === "F" ? "Féminin" : "Masculin"} · {selected.service} · Chambre {selected.chambre}
                    </div>
                    <div className="htk-dossier">Dossier {selected.numeroDossier}</div>
                  </div>
                </div>
                <GraviteBadge gravite={selected.gravite} />
              </div>

              <div className="htk-chip-row">
                <span className="htk-chip"><Droplet size={11} /> Groupe {selected.groupeSanguin || "—"}</span>
                <span className="htk-chip"><Stethoscope size={11} /> {selected.medecinReferent}</span>
                <span className="htk-chip"><Phone size={11} /> Service {selected.service}</span>
              </div>

              {selected.allergies && selected.allergies !== "Aucune connue" && (
                  <div className="htk-allergy-banner">
                    <AlertTriangle size={16} />
                    <span><strong>Allergie —</strong> {selected.allergies}</span>
                  </div>
              )}
              {selected.antecedents && (
                  <div className="htk-patient-sub" style={{ marginTop: 10 }}>
                    <strong style={{ color: "var(--text-dim)" }}>Antécédents : </strong>{selected.antecedents}
                  </div>
              )}
            </div>

            {/* Signes vitaux */}
            <div className="htk-card">
              <div className="htk-section-title"><Activity size={14} /> Signes vitaux</div>
              <div className="htk-vitals-grid">
                {METRICS.map((m) => {
                  const out = isOutOfRange(m, lastReading);
                  return (
                      <div
                          key={m.key}
                          className={`htk-vital-tile ${metric === m.key ? "active" : ""} ${out ? "out-of-range" : ""}`}
                          style={{ ["--tile-color" as any]: m.color }}
                          onClick={() => setMetric(m.key)}
                      >
                        <div className="htk-vital-tile-top">
                          <m.icon size={15} color={m.color} />
                          <Trend current={m.get(lastReading)} previous={prevReading ? m.get(prevReading) : undefined} />
                        </div>
                        <div className="htk-vital-value">{m.format(lastReading)}<span className="htk-vital-unit">{m.unit}</span></div>
                        <div className="htk-vital-label">{m.label}{out && <AlertTriangle size={11} color="var(--coral)" />}</div>
                      </div>
                  );
                })}
              </div>

              <div style={{ marginTop: 18 }}>
                <div className="htk-metric-tabs">
                  {METRICS.map((m) => (
                      <button
                          key={m.key}
                          className={`htk-metric-tab ${metric === m.key ? "active" : ""}`}
                          style={{ ["--tab-color" as any]: m.color }}
                          onClick={() => setMetric(m.key)}
                      >
                        <m.icon size={12} /> {m.label}
                      </button>
                  ))}
                </div>
                <ResponsiveContainer width="100%" height={210}>
                  <LineChart data={chartData} margin={{ top: 6, right: 10, left: -14, bottom: 0 }}>
                    <CartesianGrid stroke="var(--grid-line)" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: "var(--text-faint)", fontSize: 10 }} axisLine={{ stroke: "var(--border)" }} tickLine={false} />
                    <YAxis tick={{ fill: "var(--text-faint)", fontSize: 10 }} axisLine={false} tickLine={false} domain={["auto", "auto"]} />
                    <Tooltip contentStyle={{ background: "var(--panel-raised)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12, fontFamily: "var(--font-mono)" }} labelStyle={{ color: "var(--text-dim)" }} />
                    <ReferenceLine y={activeMetric.normal[0]} stroke="var(--text-faint)" strokeDasharray="4 4" />
                    {activeMetric.normal[1] < 999 && <ReferenceLine y={activeMetric.normal[1]} stroke="var(--text-faint)" strokeDasharray="4 4" />}
                    <Line type="monotone" dataKey="primary" stroke={activeMetric.color} strokeWidth={2.4} dot={{ r: 3, fill: activeMetric.color }} name={activeMetric.label} />
                    {activeMetric.getSecondary && (
                        <Line type="monotone" dataKey="secondary" stroke="var(--violet)" strokeWidth={2} strokeDasharray="4 3" dot={{ r: 2.5, fill: "var(--violet)" }} name="Diastolique" />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Onglets: alertes / consultations / rdv */}
            <div className="htk-card">
              <div className="htk-tabs">
                <button className={`htk-tab-btn ${tab === "alertes" ? "active" : ""}`} onClick={() => setTab("alertes")}>
                  <Bell size={13} /> Alertes
                  {selected.alertes.filter((a) => a.statut === "non_lue").length > 0 && (
                      <span className="htk-tab-count" style={{ color: "var(--coral)" }}>{selected.alertes.filter((a) => a.statut === "non_lue").length}</span>
                  )}
                </button>
                <button className={`htk-tab-btn ${tab === "consultations" ? "active" : ""}`} onClick={() => setTab("consultations")}>
                  <Stethoscope size={13} /> Consultations <span className="htk-tab-count">{selected.consultations.length}</span>
                </button>
                <button className={`htk-tab-btn ${tab === "rdv" ? "active" : ""}`} onClick={() => setTab("rdv")}>
                  <Calendar size={13} /> Rendez-vous <span className="htk-tab-count">{selected.rendezVous.length}</span>
                </button>
              </div>

              {tab === "alertes" && (
                  <div>
                    {selected.alertes.length === 0 && <div className="htk-empty">Aucune alerte pour ce patient.</div>}
                    {selected.alertes.map((a) => {
                      const Icon = ALERTE_ICON[a.type];
                      const color = a.statut === "non_lue" ? "var(--coral)" : a.statut === "lue" ? "var(--amber)" : "var(--teal)";
                      return (
                          <div key={a.id} className="htk-alert-row">
                            <div className="htk-alert-icon" style={{ background: `${color}1a`, color }}><Icon size={15} /></div>
                            <div style={{ flex: 1 }}>
                              <div className="htk-alert-msg">{a.message}</div>
                              <div className="htk-alert-meta">
                                <span>{ALERTE_LABEL[a.type]}</span> · <span>{formatDateFR(a.date, true)}</span>
                              </div>
                            </div>
                            <button
                                className="htk-alert-btn"
                                disabled={a.statut === "traitee"}
                                onClick={() => updateAlerteStatut(selected.id, a.id, nextAlerteStatut(a.statut))}
                            >
                              {a.statut === "non_lue" && "Marquer lue"}
                              {a.statut === "lue" && "Marquer traitée"}
                              {a.statut === "traitee" && <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Check size={11} /> Traitée</span>}
                            </button>
                          </div>
                      );
                    })}
                  </div>
              )}

              {tab === "consultations" && (
                  <div className="htk-timeline">
                    {selected.consultations.length === 0 && <div className="htk-empty">Aucune consultation enregistrée.</div>}
                    {selected.consultations.map((c) => {
                      const Icon = CONSULT_ICON[c.type];
                      const color = CONSULT_STATUT_COLOR[c.statut];
                      return (
                          <div key={c.id} className="htk-timeline-item">
                            <div className="htk-timeline-dot" style={{ background: color }} />
                            <div className="htk-timeline-head">
                              <Icon size={13} color={color} />
                              <span className="htk-timeline-type">{CONSULT_LABEL[c.type]}</span>
                              <span className="htk-badge htk-badge-sm" style={{ color, borderColor: `${color}55`, background: `${color}14` }}>
                          {CONSULT_STATUT_LABEL[c.statut]}
                        </span>
                              <span className="htk-timeline-date">{formatDateFR(c.date)}</span>
                            </div>
                            <div className="htk-timeline-motif">{c.motif}</div>
                            {c.symptomes && (
                                <div className="htk-timeline-detail">
                                  <div className="htk-timeline-detail-label">Symptômes</div>{c.symptomes}
                                </div>
                            )}
                            {c.diagnostic && (
                                <div className="htk-timeline-detail">
                                  <div className="htk-timeline-detail-label">Diagnostic</div>{c.diagnostic}
                                </div>
                            )}
                            {c.ordonnance && (
                                <div className="htk-timeline-detail">
                                  <div className="htk-timeline-detail-label">Ordonnance</div>{c.ordonnance}
                                </div>
                            )}
                          </div>
                      );
                    })}
                  </div>
              )}

              {tab === "rdv" && (
                  <div>
                    {selected.rendezVous.length === 0 && <div className="htk-empty">Aucun rendez-vous programmé.</div>}
                    {selected.rendezVous.map((r) => {
                      const d = new Date(r.dateHeure);
                      const color = RDV_STATUT_COLOR[r.statut];
                      return (
                          <div key={r.id} className="htk-rdv-item">
                            <div className="htk-rdv-date-block">
                              <div className="htk-rdv-day">{d.getDate()}</div>
                              <div className="htk-rdv-month">{d.toLocaleDateString("fr-FR", { month: "short" })}</div>
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 12.5, fontWeight: 600 }}>{r.motif}</div>
                              <div className="htk-alert-meta"><Clock size={11} /> {d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</div>
                            </div>
                            <span className="htk-badge htk-badge-sm" style={{ color, borderColor: `${color}55`, background: `${color}14` }}>
                        {RDV_STATUT_LABEL[r.statut]}
                      </span>
                          </div>
                      );
                    })}
                  </div>
              )}
            </div>
          </main>
        </div>
      </div>
  );
}