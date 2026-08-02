import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getPatients } from "../api/patients";
import { getFileAttente } from "../api/urgences";
import { getHospitalisationsEnCours } from "../api/hospitalisations";
import { getConsultations } from "../api/consultations";
import { getEmployes } from "../api/comptes";
import { getServices } from "../api/services";
import { getDemandesEnAttente, getDemandes } from "../api/analyses";
import { getAlertes } from "../api/alertes";
import { getRappels } from "../api/rappels";
import { getActivitesRecentes } from "../api/activites";
import type { Patient, PassageUrgence, Hospitalisation, Consultation, NiveauTri, Alerte, DemandeAnalyse, Rappel, JournalActivite } from "../types";
import Sidebar from "../components/Sidebar.tsx";
import PageBanner from "../components/PageBanner.tsx";
import DayTimeline from "../components/dashboard/DayTimeLine.tsx";
import PriorityPatientsCard from "../components/dashboard/PriorityPatientsCard.tsx";
import BlocOperatoireCard from "../components/dashboard/BlocOperatoireCard.tsx";
import ContinuerMonTravailCard, { type WorkItem } from "../components/dashboard/ContinuerMonTravailCard.tsx";
import { useAuth } from "../contexts/AuthContext";
import { useRealtimeCalendrier } from "../hooks/useRealtimeCalendrier";
import { usePlanning } from "../hooks/useCalendrier";
import { useOperationsPlanning } from "../hooks/useBlocOperatoire";
import { toISODate } from "../components/calendrier/calendrierConfig";
import { SkeletonSimpleList } from "../components/Skeleton";
import type { LucideIcon } from "lucide-react";
import {
    BedDouble,
    Stethoscope,
    Scissors,
    Calendar,
    ShieldAlert,
    FlaskConical,
    ClipboardList,
    FileText,
    Sparkles,
    Plus,
    Search,
    ChevronRight,
    LayoutDashboard,
    Sunrise,
    History,
} from "lucide-react";
import RappelsPanel from "../components/RappelsPanel.tsx";

// ─── CONFIGURATION DES BADGES DE TRIAGE (déjà définis dans index.css) ─────────
const TRI_BADGE: Record<NiveauTri, string> = {
    1: "badge-tri-1",
    2: "badge-tri-2",
    3: "badge-tri-3",
    4: "badge-tri-4",
    5: "badge-tri-5",
};

function tempsEcoule(dateIso: string) {
    const mins = Math.floor((Date.now() - new Date(dateIso).getTime()) / 60000)
    if (mins < 1) return "à l'instant"
    if (mins < 60) return `il y a ${mins} min`
    const h = Math.floor(mins / 60)
    if (h < 24) return `il y a ${h}h${(mins % 60).toString().padStart(2, '0')}`
    return `il y a ${Math.floor(h / 24)} j`
}

// ─── COMPOSANT WIDGETCARD ─────────────────────────────────────────────────────
interface WidgetCardProps {
    title: string;
    count?: number;
    linkLabel?: string;
    onLink?: () => void;
    children: React.ReactNode;
    loading: boolean;
    empty: boolean;
    emptyLabel: string;
}

function WidgetCard({ title, count, linkLabel, onLink, children, loading, empty, emptyLabel }: WidgetCardProps) {
    return (
        <div className="ht-card ht-card-padded-sm flex flex-col h-full">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--ht-border)] mb-4">
                <h3 className="text-sm font-semibold text-[var(--ht-text)] flex items-center gap-2">
                    {title}
                    {typeof count === "number" && !loading && (
                        <span className="badge badge-muted">{count}</span>
                    )}
                </h3>
                {onLink && (
                    <button onClick={onLink} className="text-xs font-medium flex items-center gap-0.5 transition-colors"
                            style={{ color: "var(--ht-primary)" }}>
                        {linkLabel} <ChevronRight size={14} />
                    </button>
                )}
            </div>
            <div className="flex-1 flex flex-col justify-between">
                {loading ? (
                    <SkeletonSimpleList rows={3} />
                ) : empty ? (
                    <div className="ht-empty">{emptyLabel}</div>
                ) : (
                    <div className="space-y-3">{children}</div>
                )}
            </div>
        </div>
    );
}

// ─── COMPOSANT FOCUSCARD (bloc « Aujourd'hui ») ───────────────────────────────
interface FocusCardProps {
    label: string;
    value: string;
    sub?: string;
    icon: LucideIcon;
    tone?: "default" | "danger";
    onClick?: () => void;
}

function FocusCard({ label, value, sub, icon: Icon, tone = "default", onClick }: FocusCardProps) {
    return (
        <div
            onClick={onClick}
            className={`ht-card ht-card-padded-sm flex items-start gap-3 ${onClick ? "cursor-pointer hover:shadow-md transition-shadow" : ""}`}
        >
            <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                    backgroundColor: tone === "danger" ? "var(--ht-danger-bg)" : "var(--ht-primary-light)",
                }}
            >
                <Icon size={18} style={{ color: tone === "danger" ? "var(--ht-danger)" : "var(--ht-primary)" }} />
            </div>
            <div className="min-w-0">
                <p className="text-xs font-medium truncate" style={{ color: "var(--ht-text-muted)" }}>{label}</p>
                <p className="text-sm font-bold truncate mt-0.5" style={{ color: "var(--ht-text)" }}>{value}</p>
                {sub && <p className="text-xs truncate mt-0.5" style={{ color: "var(--ht-text-muted)" }}>{sub}</p>}
            </div>
        </div>
    );
}

// ─── PAGE COMPOSANTE DASHBOARD ────────────────────────────────────────────────
export default function Dashboard() {
    const navigate = useNavigate();
    const { user, hasRole } = useAuth();
    useRealtimeCalendrier();

    const canSeePatients = hasRole("admin", "medecin", "secretaire");
    const canSeeUrgences = hasRole("admin", "medecin", "infirmier");
    const canSeeHospit   = hasRole("admin", "medecin");
    const canSeeConsult  = hasRole("admin", "medecin", "infirmier");
    const canSeeRdv      = hasRole("admin", "medecin", "secretaire");
    const canSeeBloc     = hasRole("admin", "medecin", "chef_chirurgie");
    const isAdmin        = hasRole("admin");
    const isNurse         = hasRole("infirmier");
    const isSecretaire   = hasRole("secretaire");
    const isMedecin      = hasRole("medecin");

    const [patients, setPatients] = useState<Patient[] | null>(null);
    const [urgences, setUrgences] = useState<PassageUrgence[] | null>(null);
    const [hospitalisations, setHospitalisations] = useState<Hospitalisation[] | null>(null);
    const [consultations, setConsultations] = useState<Consultation[] | null>(null);
    const [, setEffectif] = useState<{ employes: number; services: number } | null>(null);
    const [demandesEnAttente, setDemandesEnAttente] = useState<number | null>(null);
    const [alertes, setAlertes] = useState<Alerte[] | null>(null);
    const [demandesAnalyses, setDemandesAnalyses] = useState<DemandeAnalyse[] | null>(null);
    const [rappels, setRappels] = useState<Rappel[] | null>(null);
    const [activitesRecentes, setActivitesRecentes] = useState<JournalActivite[] | null>(null);

    useEffect(() => {
        if (canSeePatients) getPatients().then(setPatients).catch(() => setPatients([]));
        if (canSeeUrgences) getFileAttente().then(setUrgences).catch(() => setUrgences([]));
        if (canSeeHospit) getHospitalisationsEnCours().then(setHospitalisations).catch(() => setHospitalisations([]));
        if (canSeeConsult) getConsultations().then(setConsultations).catch(() => setConsultations([]));
        if (hasRole("laborantin")) getDemandesEnAttente().then((d) => setDemandesEnAttente(d.length)).catch(() => setDemandesEnAttente(0));
        if (isMedecin || isAdmin) getDemandes().then(setDemandesAnalyses).catch(() => setDemandesAnalyses([]));
        getRappels().then(setRappels).catch(() => setRappels([]));
        getAlertes().then(setAlertes).catch(() => setAlertes([]));
        getActivitesRecentes().then(setActivitesRecentes).catch(() => setActivitesRecentes([]));
        if (isAdmin) {
            Promise.all([getEmployes(), getServices()])
                .then(([emps, servs]) => setEffectif({
                    employes: emps.filter((e) => e.actif).length,
                    services: servs.filter((s) => s.actif).length,
                }))
                .catch(() => setEffectif({ employes: 0, services: 0 }));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const aujourdhuiISO = toISODate(new Date());
    const { data: planningJour } = usePlanning(aujourdhuiISO, aujourdhuiISO);
    const { data: blocJour, isLoading: blocLoading } = useOperationsPlanning(aujourdhuiISO, aujourdhuiISO, canSeeBloc);

    const urgencesTriees = urgences
        ? [...urgences].sort((a, b) => (a.niveau_tri ?? 5) - (b.niveau_tri ?? 5)).slice(0, 5)
        : [];

    // ── Bloc « Aujourd'hui » : prochains événements + compteurs prioritaires ──
    const maintenant = new Date();
    const evenementsAvenir = (planningJour?.evenements ?? [])
        .filter(e => e.statut !== "annule" && new Date(e.start_time) >= maintenant)
        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
    const prochaineConsultation = evenementsAvenir.find(e => e.type_evenement === "consultation");
    const prochaineIntervention = evenementsAvenir.find(e => e.type_evenement === "intervention");

    const patientsPrioritairesCount =
        urgencesTriees.filter(u => u.niveau_tri === 1 || u.niveau_tri === 2).length +
        Math.min([...(hospitalisations ?? [])].filter(h => (h.duree_jours ?? 0) >= 7).length, 3);

    const alertesCritiquesCount = (alertes ?? []).filter(a => a.statut === "non_lue").length;

    const formatHeure = (iso: string) => new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

    // ── « Continuer mon travail » : agrégation depuis les données déjà chargées ──
    const consultationEnCours = canSeeConsult
        ? (consultations ?? []).find((c) => c.statut === "en_cours")
        : undefined;
    const patientConsultation = consultationEnCours
        ? (patients ?? []).find((p) => p.id === consultationEnCours.patient)
        : undefined;

    const operationsACompteRendu = canSeeBloc
        ? (blocJour?.operations ?? []).filter(
            (op) => op.chirurgien_principal === user?.id
                && (op.statut === "terminee" || op.statut === "en_cours")
                && !op.compte_rendu_operatoire?.trim()
        )
        : [];

    const resultatsDisponibles = (isMedecin || isAdmin)
        ? (demandesAnalyses ?? []).filter((d) => d.demandeur === user?.id && d.statut === "terminee")
        : [];

    const rappelsEnAttente = (rappels ?? []).filter((r) => !r.fait);

    const chargementTravail =
        (canSeeConsult && consultations === null) ||
        (canSeeBloc && blocLoading) ||
        ((isMedecin || isAdmin) && demandesAnalyses === null) ||
        rappels === null;

    const travailItems: WorkItem[] | null = chargementTravail ? null : [
        ...(consultationEnCours ? [{
            id: "consultation",
            icon: Stethoscope,
            title: patientConsultation ? `${patientConsultation.prenom} ${patientConsultation.nom}` : `Patient #${consultationEnCours.patient}`,
            subtitle: "Consultation en cours · prescription à terminer",
            ctaLabel: "Reprendre",
            onClick: () => navigate(`/patients/${consultationEnCours.patient}/consultations/${consultationEnCours.id}`),
        }] : []),
        ...(operationsACompteRendu.length > 0 ? [{
            id: "compte-rendu",
            icon: FileText,
            title: "Compte rendu opératoire",
            subtitle: `Intervention de ${formatHeure(operationsACompteRendu[0].heure_debut)} · compte rendu non finalisé`,
            ctaLabel: "Continuer",
            onClick: () => navigate("/calendrier"),
        }] : []),
        ...(resultatsDisponibles.length > 0 ? [{
            id: "resultats",
            icon: FlaskConical,
            title: "Résultats biologiques",
            subtitle: `${resultatsDisponibles.length} résultat${resultatsDisponibles.length > 1 ? "s" : ""} disponible${resultatsDisponibles.length > 1 ? "s" : ""}`,
            ctaLabel: "Consulter",
            onClick: () => navigate(`/patients/${resultatsDisponibles[0].patient}`),
        }] : []),
        ...(rappelsEnAttente.length > 0 ? [{
            id: "rappels",
            icon: ClipboardList,
            title: "Tâches en attente",
            subtitle: `${rappelsEnAttente.length} rappel${rappelsEnAttente.length > 1 ? "s" : ""} non traité${rappelsEnAttente.length > 1 ? "s" : ""}`,
            ctaLabel: "Voir",
        }] : []),
    ];

    // ── Sous-titre selon le rôle (inchangé depuis la version d'origine) ──
    const sousTitreHeader =
        (hasRole("admin")      && "Vue globale et gestion de l'établissement") ||
        (hasRole("medecin")    && "Vos patients et consultations du jour") ||
        (hasRole("infirmier")  && "Suivi des patients et constantes vitales") ||
        (hasRole("secretaire") && "Gestion des rendez-vous et admissions") ||
        (hasRole("laborantin") && "Analyses et résultats biologiques") || "";

    return (
        <div className="ht-page">
            <Sidebar />

            <main className="ht-page-content space-y-10" style={{ maxWidth: "1600px" }}>

                {/* ── 1. Header ── */}
                <PageBanner
                    size="large"
                    icon={LayoutDashboard}
                    title={
                        <>
                            {hasRole("admin")      && "Tableau de bord — Administration"}
                            {hasRole("medecin")    && `Bonjour Dr. ${user?.nom || ""} 👋 - ${user?.service_nom || ""}`}
                            {hasRole("infirmier")  && `Bonjour ${user?.prenom || ""} 👋`}
                            {hasRole("secretaire") && "Accueil & Secrétariat"}
                            {hasRole("laborantin") && "Espace Laboratoire"}
                        </>
                    }
                    subtitle={sousTitreHeader}
                    decorIcons={[Stethoscope, BedDouble]}
                    actions={
                        <>
                            {isAdmin && (
                                <button onClick={() => navigate("/admissions/nouvelle")} className="btn btn-primary">
                                    <Plus size={16} /> Nouveau patient
                                </button>
                            )}
                            {isSecretaire && (
                                <button onClick={() => navigate("/rendez_vous")} className="btn btn-secondary">
                                    <Calendar size={16} /> Gérer les rendez-vous
                                </button>
                            )}
                            {isNurse && (
                                <button onClick={() => navigate("/patients")} className="btn btn-primary">
                                    <Search size={16} /> Rechercher un patient
                                </button>
                            )}
                            {canSeeUrgences && (
                                <button onClick={() => navigate("/urgences")} className="btn btn-danger">
                                    <ShieldAlert size={16} /> Voir les urgences
                                </button>
                            )}
                            {canSeePatients && (
                                <button onClick={() => navigate("/patients")} className="btn btn-success">
                                    Voir tous les patients
                                </button>
                            )}
                        </>
                    }
                />

                {/* ── Continuer mon travail ── */}
                <section className="space-y-4">
                    <h2 className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5" style={{ color: "var(--ht-text-muted)" }}>
                        <Sparkles size={13} /> Reprendre
                    </h2>
                    <ContinuerMonTravailCard
                        items={travailItems}
                        rappelsDetail={rappelsEnAttente.map((r) => r.texte)}
                    />
                </section>

                {/* ── 2. Aujourd'hui ── */}
                <section className="space-y-4">
                    <h2 className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5" style={{ color: "var(--ht-text-muted)" }}>
                        <Sunrise size={13} /> Aujourd'hui
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {canSeeConsult && (
                            <FocusCard
                                label="Prochaine consultation"
                                icon={Stethoscope}
                                value={prochaineConsultation ? formatHeure(prochaineConsultation.start_time) : "Aucune"}
                                sub={prochaineConsultation?.patient?.nom_complet ?? "Rien de prévu"}
                                onClick={() => navigate("/calendrier")}
                            />
                        )}
                        {canSeeBloc && (
                            <FocusCard
                                label="Prochaine intervention"
                                icon={Scissors}
                                value={prochaineIntervention ? formatHeure(prochaineIntervention.start_time) : "Aucune"}
                                sub={prochaineIntervention?.patient?.nom_complet ?? "Rien de prévu au bloc"}
                                onClick={() => navigate("/calendrier")}
                            />
                        )}
                        {canSeeUrgences && (
                            <FocusCard
                                label="Patients prioritaires"
                                icon={ShieldAlert}
                                tone={patientsPrioritairesCount > 0 ? "danger" : "default"}
                                value={String(patientsPrioritairesCount)}
                                sub="Cas critiques ou longue durée"
                            />
                        )}
                        <FocusCard
                            label="Alertes critiques"
                            icon={ShieldAlert}
                            tone={alertesCritiquesCount > 0 ? "danger" : "default"}
                            value={String(alertesCritiquesCount)}
                            sub={alertesCritiquesCount > 0 ? "Non lues" : "Rien à signaler"}
                        />
                    </div>
                </section>

                {/* ── 3. Timeline de la journée ── */}
                {(canSeeRdv || canSeeConsult) && (
                    <section>
                        <DayTimeline evenements={planningJour?.evenements ?? null} />
                    </section>
                )}

                {/* ── 4. Patients prioritaires · 5. Bloc opératoire ── */}
                {(canSeeUrgences || canSeeBloc) && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {canSeeUrgences && <PriorityPatientsCard urgences={urgences} hospitalisations={hospitalisations} />}
                        {canSeeBloc && <BlocOperatoireCard operations={blocJour?.operations} loading={blocLoading} />}
                    </div>
                )}

                {/* ── Widgets complémentaires (fonctionnalités existantes conservées) ── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                    {canSeeUrgences && (
                        <WidgetCard
                            title="File d'attente aux urgences"
                            count={urgences?.length}
                            loading={urgences === null}
                            empty={(urgences?.length ?? 0) === 0}
                            emptyLabel="Aucun patient actuellement aux urgences"
                            linkLabel="Voir tout"
                            onLink={() => navigate("/urgences")}
                        >
                            <div className="divide-y divide-[var(--ht-border)]">
                                {urgencesTriees.map(u => (
                                    <div key={u.id} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0 gap-3">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <span className={`badge ${u.niveau_tri ? TRI_BADGE[u.niveau_tri] : "badge-muted"}`} style={{ width: "0.625rem", height: "0.625rem", padding: 0 }} />
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold text-[var(--ht-text)] truncate">{u.patient_prenom ? `${u.patient_prenom} ${u.patient_nom}` : (u.patient_nom || `Patient #${u.patient}`)}</p>
                                                <p className="text-xs text-[var(--ht-text-muted)] truncate mt-0.5">{u.niveau_tri_label || "Non trié"} · {u.motif}</p>
                                            </div>
                                        </div>
                                        <span className="badge badge-muted uppercase">
                                            {u.statut_label || u.statut}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </WidgetCard>
                    )}

                    <WidgetCard
                        title="Activité récente"
                        loading={activitesRecentes === null}
                        empty={(activitesRecentes?.length ?? 0) === 0}
                        emptyLabel="Aucune activité récente dans votre service"
                        linkLabel="Voir tout"
                        onLink={() => navigate("/activites")}
                    >
                        <div className="divide-y divide-[var(--ht-border)]">
                            {(activitesRecentes ?? []).map(a => (
                                <div key={a.id} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0 gap-3">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="ht-kpi-icon" style={{ width: '2rem', height: '2rem', flexShrink: 0 }}>
                                            <History size={14} style={{ color: "var(--ht-primary)" }} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-[var(--ht-text)] truncate">{a.description}</p>
                                            <p className="text-xs text-[var(--ht-text-muted)] truncate mt-0.5">
                                                {a.employe_prenom ? `${a.employe_prenom} ${a.employe_nom}` : "Système"} · {tempsEcoule(a.date_creation)}
                                            </p>
                                        </div>
                                    </div>
                                    <span className="badge badge-muted flex-shrink-0">{a.type_objet_label}</span>
                                </div>
                            ))}
                        </div>
                    </WidgetCard>

                    <RappelsPanel />

                </div>

                {/* ── Module Laboratoire dédié pour les Laborantins ── */}
                {hasRole("laborantin") && (
                    <div className="ht-card ht-card-padded-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="ht-kpi-icon" style={{ backgroundColor: "var(--ht-primary-light)" }}>
                                <FlaskConical size={22} style={{ color: "var(--ht-primary)" }} />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-[var(--ht-text)]">
                                    {demandesEnAttente === null
                                        ? "Chargement des demandes…"
                                        : demandesEnAttente === 0
                                            ? "Aucune demande en attente"
                                            : `${demandesEnAttente} demande${demandesEnAttente > 1 ? "s" : ""} en attente de traitement`}
                                </p>
                                <p className="text-xs text-[var(--ht-text-muted)] mt-0.5">Retrouvez toutes les demandes d'analyses biologiques assignées à votre labo</p>
                            </div>
                        </div>
                        <button onClick={() => navigate("/laboratoire")} className="btn btn-primary w-full sm:w-auto">
                            Ouvrir le laboratoire →
                        </button>
                    </div>
                )}
            </main>
        </div>
    );
}