import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import type { Alerte } from '../types'
import { useEffect, useState } from 'react'
import { getAlertes, marquerAlerteLue } from '../api/alertes.ts'

// ─── Logo SVG ─────────────────────────────────────────────────────────────────
const HTLogo = () => (
    <svg viewBox="0 0 120 120" width="20" height="20" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
        <g fill="#ADDFF1">
            <rect x="25" y="22" width="12" height="12" rx="2"/><rect x="39" y="22" width="12" height="12" rx="2"/>
            <rect x="67" y="22" width="12" height="12" rx="2"/><rect x="81" y="22" width="12" height="12" rx="2"/>
            <rect x="11" y="36" width="12" height="12" rx="2"/><rect x="25" y="36" width="12" height="12" rx="2"/>
            <rect x="39" y="36" width="12" height="12" rx="2"/><rect x="53" y="36" width="12" height="12" rx="2"/>
            <rect x="67" y="36" width="12" height="12" rx="2"/><rect x="81" y="36" width="12" height="12" rx="2"/>
            <rect x="95" y="36" width="12" height="12" rx="2"/><rect x="11" y="50" width="12" height="12" rx="2"/>
            <rect x="25" y="50" width="12" height="12" rx="2"/><rect x="39" y="50" width="12" height="12" rx="2"/>
            <rect x="53" y="50" width="12" height="12" rx="2"/><rect x="67" y="50" width="12" height="12" rx="2"/>
            <rect x="81" y="50" width="12" height="12" rx="2"/><rect x="95" y="50" width="12" height="12" rx="2"/>
            <rect x="25" y="64" width="12" height="12" rx="2"/><rect x="39" y="64" width="12" height="12" rx="2"/>
            <rect x="53" y="64" width="12" height="12" rx="2"/><rect x="67" y="64" width="12" height="12" rx="2"/>
            <rect x="81" y="64" width="12" height="12" rx="2"/><rect x="39" y="78" width="12" height="12" rx="2"/>
            <rect x="53" y="78" width="12" height="12" rx="2"/><rect x="67" y="78" width="12" height="12" rx="2"/>
            <rect x="53" y="92" width="12" height="12" rx="2"/>
        </g>
    </svg>
)

// ─── Contexte compact partagé ─────────────────────────────────────────────────
// On stocke l'état compact dans localStorage pour persister entre les pages
const STORAGE_KEY = 'ht_sidebar_compact'

function useCompact() {
    const [compact, setCompact] = useState(() => {
        return localStorage.getItem(STORAGE_KEY) === 'true'
    })
    const toggle = () => {
        setCompact(prev => {
            const next = !prev
            localStorage.setItem(STORAGE_KEY, String(next))
            return next
        })
    }
    return { compact, toggle }
}

// ─── NavLink ──────────────────────────────────────────────────────────────────
function NavLink({ label, icon, active, onClick, danger, badge }: {
    label: string
    icon: string
    active: boolean
    onClick: () => void
    danger?: boolean
    badge?: number
}) {
    return (
        <button
            onClick={onClick}
            data-label={label}
            className={`ht-nav-link ${active ? (danger ? 'active-danger' : 'active') : ''}`}
        >
            <span className="ht-nav-link-icon">{icon}</span>
            <span className="ht-nav-link-label">{label}</span>
            {badge && badge > 0 && (
                <span
                    className="ht-nav-link-label ml-auto min-w-[18px] h-4 px-1 rounded-full text-white text-[10px] font-semibold flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: danger ? 'var(--ht-danger)' : 'var(--ht-primary)' }}
                >
                    {badge > 9 ? '9+' : badge}
                </span>
            )}
        </button>
    )
}

// ─── NotificationBell ─────────────────────────────────────────────────────────
function NotificationBell({ compact }: { compact: boolean }) {
    const navigate = useNavigate()
    const [alertes, setAlertes] = useState<Alerte[]>([])
    const [open, setOpen] = useState(false)

    useEffect(() => {
        const charger = () => getAlertes().then(setAlertes).catch(() => {})
        charger()
        const t = setInterval(charger, 60000)
        return () => clearInterval(t)
    }, [])

    const nonLues = alertes.filter(a => a.statut === 'non_lue')

    const handleMarquerLue = async (a: Alerte) => {
        try {
            const updated = await marquerAlerteLue(a.id)
            setAlertes(prev => prev.map(x => x.id === a.id ? updated : x))
        } catch { /* silencieux */ }
    }

    return (
        <div className="relative">
            <button
                onClick={() => setOpen(o => !o)}
                data-label="Notifications"
                className={`ht-nav-link ${open ? 'active' : ''}`}
            >
                <span className="ht-nav-link-icon">🔔</span>
                <span className="ht-nav-link-label">Notifications</span>
                {nonLues.length > 0 && (
                    <span
                        className="ht-nav-link-label ml-auto min-w-[18px] h-4 px-1 rounded-full text-white text-[10px] font-semibold flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: 'var(--ht-danger)' }}
                    >
                        {nonLues.length > 9 ? '9+' : nonLues.length}
                    </span>
                )}
                {/* Badge compact */}
                {compact && nonLues.length > 0 && (
                    <span
                        className="absolute top-1 right-1 w-2 h-2 rounded-full"
                        style={{ backgroundColor: 'var(--ht-danger)' }}
                    />
                )}
            </button>

            {open && (
                <>
                    <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
                    <div
                        className="ht-card absolute bottom-0 shadow-lg z-40 max-h-96 overflow-y-auto"
                        style={{ left: 'calc(100% + 0.5rem)', width: '20rem', marginBottom: 0 }}
                    >
                        <div className="ht-card-header justify-between">
                            <p>Notifications</p>
                            {nonLues.length > 0 && (
                                <span className="badge badge-danger">{nonLues.length} non lues</span>
                            )}
                        </div>
                        {alertes.length === 0 ? (
                            <div className="ht-empty">Aucune notification</div>
                        ) : (
                            <div>
                                {alertes.slice(0, 15).map(a => (
                                    <div
                                        key={a.id}
                                        onClick={() => { handleMarquerLue(a); navigate(`/patients/${a.patient}`); setOpen(false) }}
                                        className="ht-table-row"
                                        style={{ gridTemplateColumns: '1fr' }}
                                    >
                                        <div className="flex items-start gap-2.5">
                                            {a.statut === 'non_lue' && (
                                                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5"
                                                      style={{ backgroundColor: 'var(--ht-danger)' }} />
                                            )}
                                            <div className={`min-w-0 flex-1 ${a.statut !== 'non_lue' ? 'opacity-50' : ''}`}>
                                                <p className="text-xs font-medium" style={{ color: 'var(--ht-text)' }}>
                                                    {a.patient_nom || 'Patient'}
                                                </p>
                                                <p className="text-xs mt-0.5" style={{ color: 'var(--ht-text-secondary)' }}>
                                                    {a.message}
                                                </p>
                                                <p className="text-xs mt-0.5" style={{ color: 'var(--ht-text-muted)' }}>
                                                    {new Date(a.date_creation).toLocaleString('fr-FR', {
                                                        day: '2-digit', month: '2-digit',
                                                        hour: '2-digit', minute: '2-digit'
                                                    })}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    )
}

// ─── Sidebar principale ───────────────────────────────────────────────────────
export default function Navbar() {
    const navigate = useNavigate()
    const location = useLocation()
    const { user, hasRole, logout } = useAuth()
    const { compact, toggle } = useCompact()

    const isActive = (path: string) => location.pathname.startsWith(path)

    // Sync classe .compact sur .ht-page pour décaler le contenu
    useEffect(() => {
        const page = document.querySelector('.ht-page')
        if (page) {
            page.classList.toggle('compact', compact)
        }
    }, [compact])

    return (
        <aside className={`ht-sidebar ${compact ? 'compact' : ''}`}>

            {/* ── Logo ── */}
            <button className="ht-sidebar-logo" onClick={() => navigate('/dashboard')}>
                <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: 'var(--ht-primary)' }}
                >
                    <HTLogo />
                </div>
                <span className="ht-sidebar-logo-label">HealthTracker</span>
            </button>

            {/* ── Navigation ── */}
            <nav className="ht-sidebar-nav">

                <span className="ht-sidebar-section-label">Navigation</span>

                <NavLink
                    label="Tableau de bord" icon="🏠"
                    active={location.pathname === '/dashboard'}
                    onClick={() => navigate('/dashboard')}
                />

                {hasRole('admin', 'medecin', 'infirmier', 'secretaire') && (
                    <NavLink
                        label="Patients" icon="👥"
                        active={isActive('/patients')}
                        onClick={() => navigate('/patients')}
                    />
                )}

                {hasRole('admin', 'medecin', 'secretaire') && (
                    <NavLink
                        label="Rendez-vous" icon="📅"
                        active={isActive('/rendez_vous')}
                        onClick={() => navigate('/rendez_vous')}
                    />
                )}

                {hasRole('admin', 'medecin', 'infirmier') && (
                    <NavLink
                        label="Urgences" icon="🚨"
                        active={isActive('/urgences')}
                        onClick={() => navigate('/urgences')}
                        danger
                    />
                )}

                {hasRole('admin', 'laborantin') && (
                    <NavLink
                        label="Laboratoire" icon="🧪"
                        active={isActive('/laboratoire')}
                        onClick={() => navigate('/laboratoire')}
                    />
                )}

                {hasRole('admin') && (
                    <>
                        <span className="ht-sidebar-section-label">Administration</span>
                        <NavLink
                            label="Employés" icon="🧑‍⚕️"
                            active={isActive('/employes')}
                            onClick={() => navigate('/employes')}
                        />
                        <NavLink
                            label="Services" icon="🏥"
                            active={isActive('/services')}
                            onClick={() => navigate('/services')}
                        />
                    </>
                )}
            </nav>

            {/* ── Footer ── */}
            <div className="ht-sidebar-footer">

                <NotificationBell compact={compact} />

                <NavLink
                    label="Paramètres" icon="⚙️"
                    active={isActive('/settings')}
                    onClick={() => navigate('/settings')}
                />

                {/* Profil */}
                {user && (
                    <div className="ht-sidebar-user mt-1">
                        <div className="ht-avatar ht-avatar-sm flex-shrink-0">
                            {user.prenom?.[0]}{user.nom?.[0]}
                        </div>
                        <div className="ht-sidebar-user-info">
                            <p className="text-xs font-medium truncate" style={{ color: 'var(--ht-text)' }}>
                                {user.prenom} {user.nom}
                            </p>
                            <p className="text-xs truncate" style={{ color: 'var(--ht-text-muted)' }}>
                                {user.role_label}
                            </p>
                        </div>
                    </div>
                )}

                {/* Déconnexion */}
                <button
                    data-label="Déconnexion"
                    onClick={logout}
                    className="ht-nav-link"
                    style={{ color: 'var(--ht-danger)' }}
                >
                    <span className="ht-nav-link-icon">↩</span>
                    <span className="ht-nav-link-label">Déconnexion</span>
                </button>

                {/* Toggle compact */}
                <button className="ht-sidebar-toggle" onClick={toggle}>
                    <span className="ht-sidebar-toggle-icon">◀</span>
                    <span className="ht-sidebar-toggle-label">Réduire</span>
                </button>
            </div>
        </aside>
    )
}