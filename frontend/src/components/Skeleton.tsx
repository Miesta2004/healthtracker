/**
 * Primitives de "skeleton loading" (type YouTube/LinkedIn) : blocs gris
 * pulsés qui reprennent la forme du contenu final, à afficher pendant le
 * chargement à la place du texte "Chargement...".
 */

// ─── Bloc de base ───────────────────────────────────────────────────────────
export function SkeletonBlock({ className = '' }: { className?: string }) {
    return <div className={`bg-[var(--ht-border-input)] rounded animate-pulse ${className}`} />
}

export function SkeletonCircle({ size = 36 }:{ size?: number }) {
    return (
        <div
            className="bg-[var(--ht-border-input)] rounded-full animate-pulse flex-shrink-0"
            style={{ width: size, height: size }}
        />
    )
}

export function SkeletonText({ width = '100%', height = 12 }: {width?: string |number; height?: number }) {
    return <div className="bg-[var(--ht-border-input)] rounded animate-pulse" style={{ width, height }} />
}

// ─── Carte KPI (dashboard) ──────────────────────────────────────────────────
export function SkeletonKpiCard() {
    return (
        <div className="rounded-xl border border-[var(--ht-border)] p-5 flex items-start gap-4 bg-[var(--ht-card-bg)]">
            <SkeletonCircle size={40} />
            <div className="flex-1 space-y-2">
                <SkeletonText width="60%" height={10} />
                <SkeletonText width="40%" height={20} />
                <SkeletonText width="70%" height={10} />
            </div>
        </div>
    )
}

export function SkeletonKpiGrid({ count = 4 }: { count?: number }) {
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: count }).map((_, i) => <SkeletonKpiCard key={i} />)}
        </div>
    )
}

// ─── Petit graphique (donut / barres) ───────────────────────────────────────
export function SkeletonChartCard() {
    return (
        <div className="ht-card p-6">
            <SkeletonText width="50%" height={14} />
            <div className="flex items-center justify-center py-6">
                <SkeletonCircle size={100} />
            </div>
        </div>
    )
}

// ─── Ligne de tableau (liste patients / employés) ───────────────────────────
export function SkeletonRow({ columns = 6 }: { columns?: number }) {
    return (
        <div className="px-6 py-3.5 grid grid-cols-12 gap-4 items-center">
            <div className="col-span-4 flex items-center gap-3">
                <SkeletonCircle size={36} />
                <div className="flex-1 space-y-1.5">
                    <SkeletonText width="70%" height={12} />
                    <SkeletonText width="40%" height={10} />
                </div>
            </div>
            {Array.from({ length: Math.max(columns - 1, 0) }).map((_, i) => (
                <div key={i} className="col-span-1 flex justify-center">
                    <SkeletonText width="60%" height={12} />
                </div>
            ))}
        </div>
    )
}

export function SkeletonTable({ rows = 5, columns = 6 }: { rows?: number; columns?: number }) {
    return (
        <div>
            {Array.from({ length: rows }).map((_, i) => <SkeletonRow key={i} columns={columns} />)}
        </div>
    )
}

// ─── Liste simple (recherche infirmier, urgences, services...) ─────────────
export function SkeletonSimpleList({ rows = 4 }: { rows?: number }) {
    return (
        <div>
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="px-6 py-3.5 flex items-center gap-3">
                    <SkeletonCircle size={36} />
                    <div className="flex-1 space-y-1.5">
                        <SkeletonText width="45%" height={12} />
                        <SkeletonText width="30%" height={10} />
                    </div>
                    <SkeletonText width={60} height={20} />
                </div>
            ))}
        </div>
    )
}

// ─── Page de détail (fiche patient, consultation...) ────────────────────────
export function SkeletonDetailPage() {
    return (
        <div className="max-w-5xl mx-auto px-6 py-8 w-full space-y-6">
            <div className="flex items-center gap-4">
                <SkeletonCircle size={64} />
                <div className="space-y-2">
                    <SkeletonText width={220} height={20} />
                    <SkeletonText width={140} height={12} />
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-4">
                    <div className="ht-card p-6 space-y-3">
                        <SkeletonText width="30%" height={12} />
                        <SkeletonText width="90%" height={12} />
                        <SkeletonText width="80%" height={12} />
                        <SkeletonText width="60%" height={12} />
                    </div>
                    <div className="ht-card p-6 space-y-3">
                        <SkeletonText width="35%" height={12} />
                        <SkeletonText width="95%" height={12} />
                        <SkeletonText width="70%" height={12} />
                    </div>
                </div>
                <div className="space-y-4">
                    <div className="ht-card p-6 space-y-3">
                        <SkeletonText width="50%" height={12} />
                        <SkeletonText width="100%" height={12} />
                        <SkeletonText width="80%" height={12} />
                    </div>
                </div>
            </div>
        </div>
    )
}

// ─── Grille de cartes (services...) ─────────────────────────────────────────
export function SkeletonCard() {
    return (
        <div className="ht-card p-5 space-y-3">
            <div className="flex items-center gap-3">
                <SkeletonCircle size={40} />
                <div className="flex-1 space-y-2">
                    <SkeletonText width="70%" height={12} />
                    <SkeletonText width="40%" height={10} />
                </div>
            </div>
            <SkeletonText width="100%" height={10} />
            <SkeletonText width="60%" height={10} />
        </div>
    )
}

export function SkeletonCardGrid({ count = 6, cols = 'md:grid-cols-2 lg:grid-cols-3' }: { count?: number; cols?: string }) {
    return (
        <div className={`grid grid-cols-1 ${cols} gap-4`}>
            {Array.from({ length: count }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
    )
}


// ─── Page entière (chargement du profil / auth) ─────────────────────────────
export function SkeletonFullPage() {
    return (
        <div className="ht-page">
            <div className="h-16 bg-[var(--ht-card-bg)] border-b border-[var(--ht-border)] px-6 flex items-center gap-4">
                <SkeletonCircle size={32} />
                <SkeletonText width={140} height={14} />
            </div>
            <div className="ht-page-content space-y-6">
                <SkeletonText width={260} height={22} />
                <SkeletonKpiGrid />
            </div>
        </div>
    )
}