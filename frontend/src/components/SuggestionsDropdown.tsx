// frontend/src/components/documents/SuggestionsDropdown.tsx
export function SuggestionsDropdown<T>({ items, ouvert, renderItem, onPick, getKey }: {
    items: T[]
    ouvert: boolean
    getKey: (item: T) => string | number
    renderItem: (item: T) => React.ReactNode
    onPick: (item: T) => void
}) {
    if (!ouvert || items.length === 0) return null
    return (
        <div className="absolute z-10 top-full left-0 right-0 mt-1 rounded-lg border shadow-lg max-h-40 overflow-y-auto"
             style={{ backgroundColor: 'var(--ht-card-bg)', borderColor: 'var(--ht-border)' }}>
            {items.map(item => (
                <button key={getKey(item)} type="button" onMouseDown={() => onPick(item)}
                        className="w-full text-left px-3 py-1.5 text-sm hover:bg-[var(--ht-bg)]">
                    {renderItem(item)}
                </button>
            ))}
        </div>
    )
}
