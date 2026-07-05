import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import type {Alerte} from "../types";
import {useEffect, useState} from "react";
import {getAlertes, marquerAlerteLue} from "../api/alertes.ts";

const HTLogo = () => (
    <svg viewBox="0 0 120 120" width="22" height="22" xmlns="http://www.w3.org/2000/svg">
        <g fill="#ADDFF1">
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
    </svg>
)

export default function Navbar() {
    const navigate = useNavigate()
    const location = useLocation()
    const { user, hasRole, logout } = useAuth()

    const isActive = (path: string) => location.pathname.startsWith(path)

    return (
        <nav className="ht-navbar">
            <div className="ht-navbar-inner">

                {/* ── Logo ── */}
                <button
                    onClick={() => navigate('/dashboard')}
                    className="flex items-center gap-2.5"
                >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                         style={{ backgroundColor: 'var(--ht-primary)' }}>
                        <HTLogo />
                    </div>
                    <span className="font-semibold text-sm" style={{ color: 'var(--ht-text)' }}>HealthTracker</span>
                </button>

                {/* ── Navigation centrale ── */}
                <div className="flex items-center gap-1">
                    <NavLink
                        label="Tableau de bord"
                        active={location.pathname === '/dashboard'}
                        onClick={() => navigate('/dashboard')}
                    />

                    {hasRole('admin', 'medecin', 'infirmier', 'secretaire') && (
                        <NavLink
                            label="Patients"
                            active={isActive('/patients')}
                            onClick={() => navigate('/patients')}
                        />
                    )}

                    {hasRole('admin', 'medecin', 'secretaire') && (
                        <NavLink
                            label="📅 Rendez-vous"
                            active={isActive('/rendez_vous')}
                            onClick={() => navigate('/rendez_vous')}
                        />
                    )}

                    {hasRole('admin', 'medecin', 'infirmier') && (
                        <NavLink
                            label="🚨 Urgences"
                            active={isActive('/urgences')}
                            onClick={() => navigate('/urgences')}
                            danger
                        />
                    )}

                    {hasRole('admin', 'laborantin') && (
                        <NavLink
                            label="🧪 Laboratoire"
                            active={isActive('/laboratoire')}
                            onClick={() => navigate('/laboratoire')}
                        />
                    )}

                    {hasRole('admin') && (
                        <>
                            <NavLink
                                label="Employés"
                                active={isActive('/employes')}
                                onClick={() => navigate('/employes')}
                            />
                            <NavLink
                                label="Services"
                                active={isActive('/services')}
                                onClick={() => navigate('/services')}
                            />
                        </>
                    )}
                </div>

                {/* ── Utilisateur + déconnexion ── */}
                <div className="flex items-center gap-3">
                    {user && (
                        <div className="flex items-center gap-2.5">
                            <div className="ht-avatar ht-avatar-sm">
                                {user.prenom?.[0]}{user.nom?.[0]}
                            </div>
                            <div className="hidden sm:block text-right">
                                <p className="text-xs font-medium leading-tight" style={{ color: 'var(--ht-text)' }}>
                                    {user.prenom} {user.nom}
                                </p>
                                <p className="text-xs leading-tight" style={{ color: 'var(--ht-text-muted)' }}>
                                    {user.role_label}
                                    {user.specialite && ` · ${user.specialite}`}
                                    {user.service_nom && ` · ${user.service_nom}`}
                                </p>
                            </div>
                        </div>
                    )}
                    <div className="flex items-center gap-3">
                        <NotificationBell />
                        <button
                            onClick={logout}
                            className="ht-nav-link"
                        >
                            Déconnexion
                        </button>
                    </div>
                </div>
            </div>
        </nav>
    )
}

function NotificationBell() {
    const navigate = useNavigate()
    const [alertes, setAlertes] = useState<Alerte[]>([])
    const [open, setOpen] = useState(false)

    const charger = () => {
        getAlertes().then(setAlertes).catch(() => {})
    }

    useEffect(() => {
        charger()
        const interval = setInterval(charger, 60000) // rafraîchi toutes les minutes
        return () => clearInterval(interval)
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
                className="ht-nav-link relative w-8 h-8 !p-0 flex items-center justify-center"
                title="Notifications"
            >
                🔔
                {nonLues.length > 0 && (
                    <span
                        className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full text-white text-[10px] font-semibold flex items-center justify-center"
                        style={{ backgroundColor: 'var(--ht-danger)' }}
                    >
                        {nonLues.length > 9 ? '9+' : nonLues.length}
                    </span>
                )}
            </button>

            {open && (
                <>
                    <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
                    <div className="ht-card absolute right-0 mt-2 w-80 shadow-lg z-40 max-h-96 overflow-y-auto">
                        <div className="ht-card-header">
                            <p>Notifications</p>
                        </div>
                        {alertes.length === 0 ? (
                            <div className="ht-empty">Aucune notification</div>
                        ) : (
                            <div>
                                {alertes.slice(0, 15).map(a => (
                                    <div key={a.id}
                                         onClick={() => { handleMarquerLue(a); navigate(`/patients/${a.patient}`); setOpen(false) }}
                                         className="ht-table-row" style={{ gridTemplateColumns: '1fr' }}>
                                        <div className="flex items-start gap-2.5">
                                            {a.statut === 'non_lue' && (
                                                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5" style={{ backgroundColor: 'var(--ht-danger)' }} />
                                            )}
                                            <div className={`min-w-0 flex-1 ${a.statut !== 'non_lue' ? 'opacity-50' : ''}`}>
                                                <p className="text-xs font-medium" style={{ color: 'var(--ht-text)' }}>{a.patient_nom || 'Patient'}</p>
                                                <p className="text-xs mt-0.5" style={{ color: 'var(--ht-text-secondary)' }}>{a.message}</p>
                                                <p className="text-xs mt-0.5" style={{ color: 'var(--ht-text-muted)' }}>
                                                    {new Date(a.date_creation).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
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

function NavLink({ label, active, onClick, danger }: {
    label: string
    active: boolean
    onClick: () => void
    danger?: boolean
}) {
    return (
        <button
            onClick={onClick}
            className={`ht-nav-link ${active ? (danger ? 'active-danger' : 'active') : ''}`}
        >
            {label}
        </button>
    )
}