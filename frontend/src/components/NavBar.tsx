import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

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
        <nav className="bg-white border-b border-gray-100 sticky top-0 z-20">
            <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">

                {/* ── Logo ── */}
                <button
                    onClick={() => navigate('/dashboard')}
                    className="flex items-center gap-2.5"
                >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                         style={{ backgroundColor: '#003152' }}>
                        <HTLogo />
                    </div>
                    <span className="font-semibold text-gray-900 text-sm">HealthTracker</span>
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

                    {hasRole('admin', 'medecin', 'infirmier') && (
                        <NavLink
                            label="🚨 Urgences"
                            active={isActive('/urgences')}
                            onClick={() => navigate('/urgences')}
                            danger
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
                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold text-white"
                                 style={{ backgroundColor: '#003152' }}>
                                {user.prenom?.[0]}{user.nom?.[0]}
                            </div>
                            <div className="hidden sm:block text-right">
                                <p className="text-xs font-medium text-gray-900 leading-tight">
                                    {user.prenom} {user.nom}
                                </p>
                                <p className="text-xs text-gray-400 leading-tight">{user.role_label}</p>
                            </div>
                        </div>
                    )}
                    <button
                        onClick={logout}
                        className="text-xs text-gray-400 hover:text-gray-700 px-2.5 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                        Déconnexion
                    </button>
                </div>
            </div>
        </nav>
    )
}

function NavLink({ label, active, onClick, danger }: {
    label: string
    active: boolean
    onClick: () => void
    danger?: boolean
}) {
    if (active) {
        return (
            <button
                onClick={onClick}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                style={danger
                    ? { color: '#b91c1c', backgroundColor: '#fee2e2' }
                    : { color: '#003152', backgroundColor: '#f0f7ff' }
                }
            >
                {label}
            </button>
        )
    }
    return (
        <button
            onClick={onClick}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors"
        >
            {label}
        </button>
    )
}
