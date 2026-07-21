import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getPatients } from "../api/patients";
import { getFileAttente } from "../api/urgences";
import { getHospitalisationsEnCours } from "../api/hospitalisations";
import { getConsultations } from "../api/consultations";
import { getRendezVous } from "../api/rendezvous";
import { getEmployes } from "../api/comptes";
import { getServices } from "../api/services";
import { getDemandesEnAttente } from "../api/analyses";
import type { Patient, PassageUrgence, Hospitalisation, Consultation, RendezVous, NiveauTri } from "../types";
import Sidebar from "../components/Sidebar.tsx";
import PageBanner from "../components/PageBanner.tsx";
import { useAuth } from "../contexts/AuthContext";
import { SkeletonKpiCard, SkeletonSimpleList } from "../components/Skeleton";
import MedecinPlanning from "../components/planning/MedecinPlanning";
import {
    Users,
    BedDouble,
    Stethoscope,
    Calendar,
    CalendarCheck,
    CalendarClock,
    UserPlus,
    ShieldAlert,
    FlaskConical,
    Plus,
    Search,
    ChevronRight,
    LayoutDashboard,
} from "lucide-react";

// ─── CONFIGURATION DES BADGES DE TRIAGE (déjà définis dans index.css) ─────────
const TRI_BADGE: Record<NiveauTri, string> = {
    1: "badge-tri-1",
    2: "badge-tri-2",
    3: "badge-tri-3",
    4: "badge-tri-4",
    5: "badge-tri-5",
};

// ─── COMPOSANT STATCARD (KPI) ─────────────────────────────────────────────────
interface StatCardProps {
    label: string;
    value: string | number;
    sub?: string;
    icon: any;
    accent?: boolean;
    onClick?: () => void;
}

function StatCard({ label, value, sub, icon: Icon, accent, onClick }: StatCardProps) {
    return (
        <div
            onClick={onClick}
            className={`ht-kpi ${accent ? "accent" : ""} ${onClick ? "cursor-pointer hover:shadow-md transition-shadow" : ""}`}
        >
            <div className="ht-kpi-icon">
                <Icon size={20} style={{ color: accent ? "var(--ht-primary-tint)" : "var(--ht-primary)" }} />
            </div>
            <div className="min-w-0">
                <p className="ht-kpi-label truncate">{label}</p>
                <p className="ht-kpi-value">{value}</p>
                {sub && <p className="ht-kpi-sub truncate">{sub}</p>}
            </div>
        </div>
    );
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

// ─── PAGE COMPOSANTE DASHBOARD ────────────────────────────────────────────────
export default function Dashboard() {
    const navigate = useNavigate();
    const { user, hasRole } = useAuth();

    const canSeePatients = hasRole("admin", "medecin", "secretaire");
    const canSeeUrgences = hasRole("admin", "medecin", "infirmier");
    const canSeeHospit   = hasRole("admin", "medecin");
    const canSeeConsult  = hasRole("admin", "medecin", "infirmier");
    const canSeeRdv      = hasRole("admin", "medecin", "secretaire");
    const isAdmin        = hasRole("admin");
    const isNurse         = hasRole("infirmier");
    const isSecretaire   = hasRole("secretaire");
    const isMedecin      = hasRole("medecin");

    // Le médecin a déjà ses propres KPI (Interventions / Consultations / Patients
    // suivis) affichés dans PlanningKpiCards, intégrés au calendrier ci-dessous
    // — cf. maquette. On masque ici les cartes génériques équivalentes pour
    // éviter une double rangée de KPI redondante. Urgences et Hospitalisations
    // restent affichées : ce sont des informations que le calendrier ne couvre pas.
    const showPatientsKpi = canSeePatients && !isMedecin;
    const showRdvKpi      = canSeeRdv && !isMedecin;
    const showConsultKpi  = canSeeConsult && !isMedecin;

    const [patients, setPatients] = useState<Patient[] | null>(null);
    const [urgences, setUrgences] = useState<PassageUrgence[] | null>(null);
    const [hospitalisations, setHospitalisations] = useState<Hospitalisation[] | null>(null);
    const [consultations, setConsultations] = useState<Consultation[] | null>(null);
    const [rendezVous, setRendezVous] = useState<RendezVous[] | null>(null);
    const [, setEffectif] = useState<{ employes: number; services: number } | null>(null);
    const [demandesEnAttente, setDemandesEnAttente] = useState<number | null>(null);

    useEffect(() => {
        if (canSeePatients) getPatients().then(setPatients).catch(() => setPatients([]));
        if (canSeeUrgences) getFileAttente().then(setUrgences).catch(() => setUrgences([]));
        if (canSeeHospit) getHospitalisationsEnCours().then(setHospitalisations).catch(() => setHospitalisations([]));
        if (canSeeConsult) getConsultations().then(setConsultations).catch(() => setConsultations([]));
        if (canSeeRdv) getRendezVous().then(setRendezVous).catch(() => setRendezVous([]));
        if (hasRole("laborantin")) getDemandesEnAttente().then((d) => setDemandesEnAttente(d.length)).catch(() => setDemandesEnAttente(0));
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

    const patientsRecents = patients
        ? [...patients]
            .sort((a, b) => new Date(b.date_creation).getTime() - new Date(a.date_creation).getTime())
            .slice(0, 5)
        : [];

    const nouveauCeMois = patients?.filter((p) => {
        const d = new Date(p.date_creation);
        const now = new Date();
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length ?? 0;

    const nouveauCetteSemaine = patients?.filter((p) => {
        const d = new Date(p.date_creation);
        const now = new Date();
        const sept = new Date(now);
        sept.setDate(now.getDate() - 7);
        return d >= sept && d <= now;
    }).length ?? 0;

    const urgencesTriees = urgences
        ? [...urgences].sort((a, b) => (a.niveau_tri ?? 5) - (b.niveau_tri ?? 5)).slice(0, 5)
        : [];

    const consultationsAujourdhui = consultations?.filter((c) => {
        const d = new Date(c.date);
        const now = new Date();
        return d.toDateString() === now.toDateString();
    }) ?? [];

    const rdvAujourdhui = (rendezVous ?? [])
        .filter((r) => {
            const d = new Date(r.date_heure);
            const now = new Date();
            return d.toDateString() === now.toDateString() && r.statut !== "annule";
        })
        .sort((a, b) => new Date(a.date_heure).getTime() - new Date(b.date_heure).getTime());

    const rdvAConfirmer = (rendezVous ?? []).filter((r) => r.statut === "planifie");

    const rdvCetteSemaine = (rendezVous ?? [])
        .filter((r) => {
            const d = new Date(r.date_heure);
            const now = new Date();
            const dansSeptJours = new Date(now);
            dansSeptJours.setDate(now.getDate() + 7);
            return d > now && d <= dansSeptJours && d.toDateString() !== now.toDateString() && r.statut !== "annule";
        })
        .sort((a, b) => new Date(a.date_heure).getTime() - new Date(b.date_heure).getTime());

    return (
        <div className="ht-page">
            <Sidebar />

            <main className="ht-page-content space-y-8">

                {/* ── Entête ── */}
                <PageBanner
                    size="large"
                    icon={LayoutDashboard}
                    title={
                        <>
                            {hasRole("admin")      && "Tableau de bord — Administration"}
                            {hasRole("medecin")    && `Bonjour Dr. ${user?.nom || ""} 👋`}
                            {hasRole("infirmier")  && `Bonjour ${user?.prenom || ""} 👋`}
                            {hasRole("secretaire") && "Accueil & Secrétariat"}
                            {hasRole("laborantin") && "Espace Laboratoire"}
                        </>
                    }
                    subtitle={
                        (hasRole("admin")      && "Vue globale et gestion de l'établissement") ||
                        (hasRole("medecin")    && "Vos patients et consultations du jour") ||
                        (hasRole("infirmier")  && "Suivi des patients et constantes vitales") ||
                        (hasRole("secretaire") && "Gestion des rendez-vous et admissions") ||
                        (hasRole("laborantin") && "Analyses et résultats biologiques") || ""
                    }
                    decorIcons={[Stethoscope, BedDouble]}
                    actions={
                        <>
                            {hasRole("admin", "medecin", "secretaire") && (
                                <button onClick={() => navigate("/patients/newPatient")} className="btn btn-primary">
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

                {/* ── Section KPIs ── */}
                {/* Pour le médecin, cette rangée se limite à Urgences / Hospitalisations :
                    les KPI patients / RDV / consultations vivent déjà dans PlanningKpiCards
                    juste en dessous, au plus près du calendrier — cf. maquette. */}
                {(showPatientsKpi || canSeeUrgences || canSeeHospit || showRdvKpi || isAdmin) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {showPatientsKpi && (
                            patients === null ? <SkeletonKpiCard /> : (
                                <StatCard label="Total patients" value={patients.length} icon={Users} accent
                                          sub={`${nouveauCeMois} ajouté${nouveauCeMois > 1 ? "s" : ""} ce mois`}
                                          onClick={() => navigate("/patients")} />
                            )
                        )}
                        {showPatientsKpi && (
                            patients === null ? <SkeletonKpiCard /> : (
                                <StatCard label="Nouveaux patients (semaine)" value={nouveauCetteSemaine} icon={UserPlus}
                                          sub={nouveauCetteSemaine > 0 ? "Sur les 7 derniers jours" : "Aucun cette semaine"}
                                          onClick={() => navigate("/patients")} />
                            )
                        )}
                        {showRdvKpi && (
                            rendezVous === null ? <SkeletonKpiCard /> : (
                                <StatCard label="Rendez-vous aujourd'hui" value={rdvAujourdhui.length} icon={CalendarCheck}
                                          sub={rdvAujourdhui.length > 0 ? "Programmés aujourd'hui" : "Aucun aujourd'hui"}
                                          onClick={() => navigate("/rendez_vous")} />
                            )
                        )}
                        {showRdvKpi && (
                            rendezVous === null ? <SkeletonKpiCard /> : (
                                <StatCard label="À confirmer" value={rdvAConfirmer.length} icon={CalendarClock}
                                          sub={rdvAConfirmer.length > 0 ? "En attente de confirmation" : "Tout est confirmé"}
                                          onClick={() => navigate("/rendez_vous")} />
                            )
                        )}
                        {canSeeUrgences && (
                            urgences === null ? <SkeletonKpiCard /> : (
                                <StatCard label="Aux urgences" value={urgences.length} icon={ShieldAlert}
                                          sub={urgences.length > 0 ? "En attente / en cours" : "Aucun patient"}
                                          onClick={() => navigate("/urgences")} />
                            )
                        )}
                        {canSeeHospit && (
                            hospitalisations === null ? <SkeletonKpiCard /> : (
                                <StatCard label="Hospitalisations" value={hospitalisations.length} icon={BedDouble}
                                          sub={hospitalisations.length > 0 ? `${hospitalisations.length} lits occupés` : "Aucune"} />
                            )
                        )}
                        {showConsultKpi && (
                            consultations === null ? <SkeletonKpiCard /> : (
                                <StatCard label="Consultations (Jour)" value={consultationsAujourdhui.length} icon={Stethoscope}
                                          sub={consultationsAujourdhui.length > 0 ? "Programmées ou faites" : "Aucune prévue"} />
                            )
                        )}
                    </div>
                )}

                {/* ── Calendrier interactif (médecin uniquement — remplace les widgets RDV en liste) ── */}
                {isMedecin && (
                    <MedecinPlanning />
                )}

                {/* ── Section Widgets ── */}
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
                                                <p className="text-sm font-semibold text-[var(--ht-text)] truncate">{u.patient_prenom ? `${u.patient_prenom} ${u.patient_nom}` : (u.patient_nom || `Patient #${u.patient}`)}</p>                                                <p className="text-xs text-[var(--ht-text-muted)] truncate mt-0.5">{u.niveau_tri_label || "Non trié"} · {u.motif}</p>
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

                    {canSeeHospit && (
                        <WidgetCard
                            title="Hospitalisations en cours"
                            count={hospitalisations?.length}
                            loading={hospitalisations === null}
                            empty={(hospitalisations?.length ?? 0) === 0}
                            emptyLabel="Aucune hospitalisation en cours"
                        >
                            <div className="divide-y divide-[var(--ht-border)]">
                                {(hospitalisations ?? []).slice(0, 5).map(h => (
                                    <div key={h.id} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0 gap-3">
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-[var(--ht-text)] truncate">{h.patient_prenom ? `${h.patient_prenom} ${h.patient_nom}` : (h.patient_nom || `Patient #${h.patient}`)}</p>
                                            <p className="text-xs text-[var(--ht-text-muted)] truncate mt-0.5">
                                                {h.chambre ? `Chambre ${h.chambre}` : "Sans chambre"} {h.lit ? `· Lit ${h.lit}` : ""}
                                            </p>
                                        </div>
                                        <span className="badge badge-muted">{h.duree_jours ?? 0} j</span>
                                    </div>
                                ))}
                            </div>
                        </WidgetCard>
                    )}

                    {canSeePatients && (
                        <WidgetCard
                            title="Derniers patients ajoutés"
                            loading={patients === null}
                            empty={patientsRecents.length === 0}
                            emptyLabel="Aucun patient pour le moment"
                            linkLabel="Voir tous les patients"
                            onLink={() => navigate("/patients")}
                        >
                            <div className="space-y-2.5">
                                {patientsRecents.map(p => (
                                    <div key={p.id} onClick={() => navigate(`/patients/${p.id}`)} className="flex items-center gap-3 p-2 hover:bg-[var(--ht-bg)] border border-transparent hover:border-[var(--ht-border)] rounded-xl cursor-pointer transition-all">
                                        <div className="ht-avatar ht-avatar-sm" style={{ backgroundColor: "var(--ht-primary-light)", color: "var(--ht-primary)" }}>
                                            {p.prenom?.[0] || ""}{p.nom?.[0] || ""}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-semibold text-[var(--ht-text)] truncate">{p.prenom} {p.nom}</p>
                                            <p className="text-xs text-[var(--ht-text-muted)] mt-0.5">{p.age ?? '—'} ans</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </WidgetCard>
                    )}

                    {canSeeRdv && !isMedecin && (
                        <WidgetCard
                            title="Rendez-vous du jour"
                            count={rdvAujourdhui.length}
                            loading={rendezVous === null}
                            empty={rdvAujourdhui.length === 0}
                            emptyLabel="Aucun rendez-vous prévu aujourd'hui"
                            linkLabel="Voir tous les rendez-vous"
                            onLink={() => navigate("/rendez_vous")}
                        >
                            <div className="divide-y divide-[var(--ht-border)]">
                                {rdvAujourdhui.slice(0, 5).map(r => (
                                    <div key={r.id} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0 gap-3">
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-semibold text-[var(--ht-text)] truncate">{r.patient_prenom} {r.patient_nom}</p>
                                            <p className="text-xs text-[var(--ht-text-muted)] truncate mt-0.5">{r.motif}</p>
                                        </div>
                                        <span className="badge badge-tint">
                                            {new Date(r.date_heure).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </WidgetCard>
                    )}

                    {canSeeRdv && !isMedecin && (
                        <WidgetCard
                            title="Cette semaine"
                            count={rdvCetteSemaine.length}
                            loading={rendezVous === null}
                            empty={rdvCetteSemaine.length === 0}
                            emptyLabel="Aucun rendez-vous prévu dans les 7 prochains jours"
                            linkLabel="Voir tous les rendez-vous"
                            onLink={() => navigate("/rendez_vous")}
                        >
                            <div className="divide-y divide-[var(--ht-border)]">
                                {rdvCetteSemaine.slice(0, 5).map(r => (
                                    <div key={r.id} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0 gap-3">
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-semibold text-[var(--ht-text)] truncate">{r.patient_prenom} {r.patient_nom}</p>
                                            <p className="text-xs text-[var(--ht-text-muted)] truncate mt-0.5">{r.motif}</p>
                                        </div>
                                        <span className="badge badge-muted">
                                            {new Date(r.date_heure).toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "2-digit" })}
                                            {" · "}
                                            {new Date(r.date_heure).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </WidgetCard>
                    )}
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