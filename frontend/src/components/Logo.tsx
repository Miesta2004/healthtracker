export default function Logo() {
    return (
        <div className="relative z-10 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                 style={{
                     backgroundColor: 'var(--ht-brand-bg)',
                     border: '1.5px solid var(--ht-primary-tint)'
                 }}
            >
                <svg viewBox="0 0 120 120" width="26" height="26" xmlns="http://www.w3.org/2000/svg">
                    {/* Utilisation de var(--ht-primary) ou d'une couleur adaptative pour les mailles du logo */}
                    <g fill="var(--ht-primary, #3B82F6)">
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
                    <g fill="var(--ht-body-bg, #ffffff)" opacity="0.6">
                        <rect x="25" y="36" width="12" height="12" rx="2"/>
                        <rect x="11" y="50" width="12" height="12" rx="2"/>
                        <rect x="25" y="50" width="12" height="12" rx="2"/>
                    </g>
                </svg>
            </div>
            <span className="text-sm font-bold tracking-wide" style={{ color: 'var(--ht-text)' }}>
                HealthTracker
            </span>
        </div>
    )
}