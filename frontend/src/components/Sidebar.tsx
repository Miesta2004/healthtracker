import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.tsx";
import { useTheme } from "../contexts/ThemeContext.tsx";
import { getAlertes, marquerAlerteLue } from "../api/alertes.ts";
import type { Alerte } from "../types";
import EKGTrace from "./EKGTrace.tsx";
import {
    Home,
    Users,
    Calendar,
    Settings,
    LogOut,
    Menu,
    X,
    FlaskConical,
    TriangleAlert,
    Building2,
    UserCog,
    Bell,
    ChevronLeft,
    ChevronRight,
    Sun,
    Moon,
} from "lucide-react";

// ─── Logo SVG ─────────────────────────────────────────────────────────────────
const HTLogo = () => (
    <div className="relative z-10 flex items-center gap-3">
        <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{backgroundColor: 'var(--ht-brand-bg)', border: '1.5px solid var(--ht-brand-tint)'}}
        >
            <svg viewBox="0 0 120 120" width="26" height="26" xmlns="http://www.w3.org/2000/svg">
                <g fill="#6fd7c4">
                    <rect x="25" y="22" width="12" height="12" rx="2"/>
                    <rect x="39" y="22" width="12" height="12" rx="2"/>
                    <rect x="67" y="22" width="12" height="12" rx="2"/>
                    <rect x="81" y="22" width="12" height="12" rx="2"/>
                    <rect x="11" y="36" width="12" height="12" rx="2"/>
                    <rect x="25" y="36" width="12" height="12" rx="2"/>
                    <rect x="39" y="36" width="12" height="12" rx="2"/>
                    <rect x="53" y="36" width="12" height="12" rx="2"/>
                    <rect x="67" y="36" width="12" height="12" rx="2"/>
                    <rect x="81" y="36" width="12" height="12" rx="2"/>
                    <rect x="95" y="36" width="12" height="12" rx="2"/>
                    <rect x="11" y="50" width="12" height="12" rx="2"/>
                    <rect x="25" y="50" width="12" height="12" rx="2"/>
                    <rect x="39" y="50" width="12" height="12" rx="2"/>
                    <rect x="53" y="50" width="12" height="12" rx="2"/>
                    <rect x="67" y="50" width="12" height="12" rx="2"/>
                    <rect x="81" y="50" width="12" height="12" rx="2"/>
                    <rect x="95" y="50" width="12" height="12" rx="2"/>
                    <rect x="25" y="64" width="12" height="12" rx="2"/>
                    <rect x="39" y="64" width="12" height="12" rx="2"/>
                    <rect x="53" y="64" width="12" height="12" rx="2"/>
                    <rect x="67" y="64" width="12" height="12" rx="2"/>
                    <rect x="81" y="64" width="12" height="12" rx="2"/>
                    <rect x="39" y="78" width="12" height="12" rx="2"/>
                    <rect x="53" y="78" width="12" height="12" rx="2"/>
                    <rect x="67" y="78" width="12" height="12" rx="2"/>
                    <rect x="53" y="92" width="12" height="12" rx="2"/>
                </g>
                <g fill="#eafbf6" opacity="0.5">
                    <rect x="25" y="36" width="12" height="12" rx="2"/>
                    <rect x="11" y="50" width="12" height="12" rx="2"/>
                    <rect x="25" y="50" width="12" height="12" rx="2"/>
                </g>
            </svg>
        </div>
    </div>
)

const STORAGE_KEY = "ht_sidebar_compact";

function useSidebarState() {
    const [collapsed, setCollapsed] = useState(() => {
        return localStorage.getItem(STORAGE_KEY) === "true";
    });

    const toggle = () => {
        setCollapsed((prev) => {
            const next = !prev;
            localStorage.setItem(STORAGE_KEY, String(next));
            return next;
        });
    };

    return { collapsed, toggle };
}

interface SidebarItemProps {
    icon: any;
    label: string;
    active?: boolean;
    onClick: () => void;
    collapsed: boolean;
    danger?: boolean;
    badge?: number;
}

function SidebarItem({
                         icon: Icon,
                         label,
                         active,
                         onClick,
                         collapsed,
                         danger,
                         badge,
                     }: SidebarItemProps) {
    return (
        <button
            onClick={onClick}
            title={collapsed ? label : ""}
            className={`
                group flex items-center w-full rounded-xl p-3 text-sm font-medium
                transition-all duration-200 relative gap-3
                ${
                active
                    ? danger
                        ? "bg-[rgba(185,28,28,0.15)] text-[var(--ht-danger)]"
                        : "bg-[rgba(255,255,255,0.08)] text-[var(--ht-brand-tint)]"
                    : "text-[rgba(255,255,255,0.55)] hover:bg-[rgba(255,255,255,0.06)] hover:text-white"
            }
            `}
        >
            <Icon size={18} className="flex-shrink-0" />

            {!collapsed && <span className="truncate flex-1 text-left">{label}</span>}

            {badge !== undefined && badge > 0 && (
                <>
                    {!collapsed ? (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold min-w-[18px] text-center ${
                            danger
                                ? "bg-[var(--ht-danger)] text-white"
                                : "bg-[var(--ht-brand-tint-bg)] text-[var(--ht-brand-tint)]"
                        }`}>
                            {badge > 9 ? "9+" : badge}
                        </span>
                    ) : (
                        <span className={`absolute top-2 right-2 w-2 h-2 rounded-full ${
                            danger ? "bg-[var(--ht-danger)]" : "bg-[var(--ht-brand-tint-bg)]"
                        }`} />
                    )}
                </>
            )}
        </button>
    );
}

function NotificationBell({ collapsed }: { collapsed: boolean }) {
    const navigate = useNavigate();
    const [alertes, setAlertes] = useState<Alerte[]>([]);
    const [open, setOpen] = useState(false);

    useEffect(() => {
        const charger = () => getAlertes().then(setAlertes).catch(() => {});
        charger();
        const t = setInterval(charger, 60000);
        return () => clearInterval(t);
    }, []);

    const nonLues = alertes.filter((a) => a.statut === "non_lue");

    const handleMarquerLue = async (a: Alerte) => {
        try {
            const updated = await marquerAlerteLue(a.id);
            setAlertes((prev) => prev.map((x) => (x.id === a.id ? updated : x)));
        } catch { /* Silencieux */ }
    };

    return (
        <div className="relative">
            <SidebarItem
                icon={Bell}
                label="Notifications"
                onClick={() => setOpen((o) => !o)}
                collapsed={collapsed}
                active={open}
                badge={nonLues.length}
            />

            {open && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                    <div
                        className={`
                            fixed md:absolute bg-[var(--ht-card-bg)] border border-[var(--ht-border)]
                            rounded-xl shadow-2xl z-50 max-h-96 overflow-y-auto w-80
                            bottom-4 left-4 right-4 md:right-auto
                            ${collapsed ? "md:left-18 md:bottom-12" : "md:left-full md:ml-2 md:bottom-12"}
                        `}
                    >
                        <div className="flex items-center justify-between p-3 border-b border-[var(--ht-border)] sticky top-0 bg-[var(--ht-card-bg)] z-10">
                            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--ht-text-muted)]">Notifications</span>
                            {nonLues.length > 0 && (
                                <span className="text-[10px] bg-[var(--ht-danger-bg)] text-[var(--ht-danger)] px-2 py-0.5 rounded-md font-medium">
                                    {nonLues.length} non lues
                                </span>
                            )}
                        </div>
                        {alertes.length === 0 ? (
                            <div className="p-6 text-center text-xs text-[var(--ht-text-muted)]">Aucune notification</div>
                        ) : (
                            <div className="divide-y divide-[var(--ht-border)]">
                                {alertes.slice(0, 15).map((a) => (
                                    <div
                                        key={a.id}
                                        onClick={() => {
                                            handleMarquerLue(a);
                                            navigate(`/patients/${a.patient}`);
                                            setOpen(false);
                                        }}
                                        className="p-3 hover:bg-[var(--ht-bg)] cursor-pointer transition-colors flex gap-2.5 items-start"
                                    >
                                        {a.statut === "non_lue" && (
                                            <span className="w-2 h-2 rounded-full bg-[var(--ht-danger)] mt-1.5 flex-shrink-0" />
                                        )}
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs font-semibold text-[var(--ht-text)]">{a.patient_nom || "Patient"}</p>
                                            <p className="text-xs text-[var(--ht-text-secondary)] mt-0.5 line-clamp-2">{a.message}</p>
                                            <p className="text-[10px] text-[var(--ht-text-muted)] mt-1">
                                                {new Date(a.date_creation).toLocaleString("fr-FR", {
                                                    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit"
                                                })}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

export default function Sidebar() {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, hasRole, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const { collapsed, toggle } = useSidebarState();
    const [mobileOpen, setMobileOpen] = useState(false);

    useEffect(() => {
        const page = document.querySelector(".ht-page");
        if (page) {
            page.classList.toggle("compact", collapsed);
        }
    }, [collapsed]);

    useEffect(() => {
        setMobileOpen(false);
    }, [location.pathname]);

    const isActive = (path: string) => location.pathname.startsWith(path);

    const SidebarContent = () => (
        <div className="flex flex-col h-full bg-[var(--ht-brand-bg)] text-white select-none">
            <div className="flex items-center justify-between p-4 border-b border-[rgba(255,255,255,0.08)] min-h-[65px]">
                <button onClick={() => navigate("/dashboard")} className="flex items-center gap-3 active:scale-95 transition-transform">
                    <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: 'var(--ht-brand-bg)' }}
                    >
                        <HTLogo />
                    </div>
                    {!collapsed && (
                        <span className="font-bold text-base tracking-tight text-white">
                            HealthTracker
                        </span>
                    )}
                </button>

                <button onClick={toggle} className="hidden md:flex p-1.5 rounded-lg text-[rgba(255,255,255,0.55)] hover:bg-[rgba(255,255,255,0.08)] hover:text-white transition-colors">
                    {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                </button>
            </div>

            {!collapsed && (
                <div className="px-4 pt-2.5 pb-1 border-b border-[rgba(255,255,255,0.08)]">
                    <EKGTrace color="rgba(111,215,196,0.75)" height={16} />
                </div>
            )}

            <div className="flex-1 overflow-y-auto p-3 space-y-1 scrollbar-none">
                <SidebarItem
                    icon={Home}
                    label="Dashboard"
                    active={location.pathname === "/dashboard"}
                    onClick={() => navigate("/dashboard")}
                    collapsed={collapsed}
                />

                {hasRole("admin", "medecin", "infirmier", "secretaire") && (
                    <SidebarItem
                        icon={Users}
                        label="Patients"
                        active={isActive("/patients")}
                        onClick={() => navigate("/patients")}
                        collapsed={collapsed}
                    />
                )}

                {hasRole("admin", "medecin", "secretaire") && (
                    <SidebarItem
                        icon={Calendar}
                        label="Rendez-vous"
                        active={isActive("/rendez_vous")}
                        onClick={() => navigate("/rendez_vous")}
                        collapsed={collapsed}
                    />
                )}

                {hasRole("admin", "medecin", "infirmier") && (
                    <SidebarItem
                        icon={TriangleAlert}
                        label="Urgences"
                        active={isActive("/urgences")}
                        onClick={() => navigate("/urgences")}
                        collapsed={collapsed}
                        danger
                    />
                )}

                {hasRole("admin", "laborantin") && (
                    <SidebarItem
                        icon={FlaskConical}
                        label="Laboratoire"
                        active={isActive("/laboratoire")}
                        onClick={() => navigate("/laboratoire")}
                        collapsed={collapsed}
                    />
                )}

                {hasRole("admin") && (
                    <>
                        <div className={`pt-4 pb-1 pl-3 text-[10px] font-bold tracking-widest uppercase text-[rgba(255,255,255,0.35)] ${collapsed ? "hidden" : "block"}`}>
                            Administration
                        </div>
                        <SidebarItem
                            icon={UserCog}
                            label="Employés"
                            active={isActive("/employes")}
                            onClick={() => navigate("/employes")}
                            collapsed={collapsed}
                        />
                        <SidebarItem
                            icon={Building2}
                            label="Services"
                            active={isActive("/services")}
                            onClick={() => navigate("/services")}
                            collapsed={collapsed}
                        />
                    </>
                )}
            </div>

            <div className="border-t border-[rgba(255,255,255,0.08)] p-3 space-y-1.5">
                <NotificationBell collapsed={collapsed} />

                <SidebarItem
                    icon={theme === "dark" ? Sun : Moon}
                    label={theme === "dark" ? "Mode clair" : "Mode sombre"}
                    onClick={toggleTheme}
                    collapsed={collapsed}
                />

                <SidebarItem
                    icon={Settings}
                    label="Paramètres"
                    active={isActive("/settings")}
                    onClick={() => navigate("/settings")}
                    collapsed={collapsed}
                />

                {user && (
                    <div className={`flex items-center gap-3 p-2 rounded-xl bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)] ${collapsed ? "justify-center" : ""}`}>
                        <div className="w-8 h-8 rounded-full bg-[var(--ht-brand-tint-bg)] text-[var(--ht-brand-tint)] border border-[rgba(111,215,196,0.25)] flex items-center justify-center font-bold text-xs flex-shrink-0">
                            {user.prenom?.[0]}{user.nom?.[0]}
                        </div>
                        {!collapsed && (
                            <div className="min-w-0 flex-1">
                                <p className="text-xs font-semibold text-white truncate">{user.prenom} {user.nom}</p>
                                <p className="text-[10px] text-[rgba(255,255,255,0.5)] truncate mt-0.5">{user.role_label}</p>
                            </div>
                        )}
                    </div>
                )}

                <SidebarItem
                    icon={LogOut}
                    label="Déconnexion"
                    onClick={logout}
                    collapsed={collapsed}
                    danger
                />
            </div>
        </div>
    );

    return (
        <>
            <button
                onClick={() => setMobileOpen(true)}
                className="md:hidden fixed top-3 left-3 z-40 p-2.5 rounded-xl bg-[var(--ht-brand-bg)] border border-[rgba(255,255,255,0.1)] text-white shadow-xl active:scale-95 transition-transform"
            >
                <Menu size={18} />
            </button>

            {mobileOpen && (
                <>
                    <div
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
                        onClick={() => setMobileOpen(false)}
                    />
                    <aside className="fixed left-0 top-0 bottom-0 w-72 bg-[var(--ht-brand-bg)] z-50 md:hidden flex flex-col border-r border-[rgba(255,255,255,0.08)]">
                        <div className="flex justify-end p-3 absolute right-2 top-2 z-10">
                            <button
                                onClick={() => setMobileOpen(false)}
                                className="p-1.5 rounded-lg text-[rgba(255,255,255,0.6)] hover:bg-[rgba(255,255,255,0.08)] hover:text-white transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <SidebarContent />
                    </aside>
                </>
            )}

            <aside
                className={`
                    hidden md:flex fixed left-0 top-0 bottom-0 bg-[var(--ht-brand-bg)] text-white flex-col
                    transition-all duration-300 ease-in-out z-30 border-r border-[rgba(255,255,255,0.08)]
                    ${collapsed ? "w-16" : "w-64"}
                `}
            >
                <SidebarContent />
            </aside>
        </>
    );
}