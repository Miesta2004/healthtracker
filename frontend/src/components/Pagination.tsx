import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationProps {
    page: number
    totalPages: number
    onPageChange: (page: number) => void
    totalItems?: number
    pageSize?: number
}

export default function Pagination({
                                       page,
                                       totalPages,
                                       onPageChange,
                                       totalItems,
                                       pageSize,
                                   }: PaginationProps) {
    if (totalPages <= 1) return null

    const neighbors = 1
    const pages: (number | 'ellipsis')[] = []

    for (let p = 1; p <= totalPages; p++) {
        if (
            p === 1 ||
            p === totalPages ||
            (p >= page - neighbors && p <= page + neighbors)
        ) {
            pages.push(p)
        } else if (pages[pages.length - 1] !== 'ellipsis') {
            pages.push('ellipsis')
        }
    }

    const btnBase = "min-w-[32px] h-8 px-2 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center border"

    const showRange = typeof totalItems === 'number' && typeof pageSize === 'number'
    const from = showRange ? (totalItems === 0 ? 0 : (page - 1) * pageSize! + 1) : 0
    const to = showRange ? Math.min(page * pageSize!, totalItems!) : 0

    return (
        <div className="flex items-center justify-between gap-3 mt-6 flex-wrap">
            {showRange ? (
                <p className="text-xs" style={{ color: 'var(--ht-text-muted)' }}>
                    Affichage de {from} à {to} sur {totalItems}
                </p>
            ) : <span />}

            <div className="flex items-center justify-center gap-1.5">
                <button
                    onClick={() => onPageChange(page - 1)}
                    disabled={page === 1}
                    className={btnBase}
                    style={{
                        borderColor: 'var(--ht-border)',
                        color: 'var(--ht-text-muted)',
                        opacity: page === 1 ? 0.4 : 1
                    }}
                    title="Précédent"
                >
                    <ChevronLeft size={16} />
                </button>

                {pages.map((p, i) =>
                    p === 'ellipsis' ? (
                        <span key={`ellipsis-${i}`} className="px-1 text-sm" style={{ color: 'var(--ht-border)' }}>…</span>
                    ) : (
                        <button
                            key={p}
                            onClick={() => onPageChange(p)}
                            className={btnBase}
                            style={p === page
                                ? { backgroundColor: 'var(--ht-primary)', color: 'white', borderColor: 'var(--ht-primary)' }
                                : { color: 'var(--ht-text)', borderColor: 'var(--ht-border)', backgroundColor: 'transparent' }
                            }
                        >
                            {p}
                        </button>
                    )
                )}

                <button
                    onClick={() => onPageChange(page + 1)}
                    disabled={page === totalPages}
                    className={btnBase}
                    style={{
                        borderColor: 'var(--ht-border)',
                        color: 'var(--ht-text-muted)',
                        opacity: page === totalPages ? 0.4 : 1
                    }}
                    title="Suivant"
                >
                    <ChevronRight size={16} />
                </button>
            </div>
        </div>
    )
}
