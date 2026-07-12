import { Lock } from 'lucide-react'

interface RestrictedAccessProps {
    message?: string
}

/**
 * À afficher à la place d'un contenu (liste, panneau...) quand le rôle de
 * l'utilisateur ne lui permet pas de le consulter — pour éviter de laisser
 * croire à une absence de données (ex: "Aucun antécédent") alors qu'il
 * s'agit en réalité d'un accès non autorisé.
 */
export default function RestrictedAccess({
                                             message = "Votre rôle ne vous permet pas de consulter cette information.",
                                         }: RestrictedAccessProps) {
    return (
        <div
            className="flex flex-col items-center justify-center text-center py-8 px-4 rounded-xl"
            style={{ backgroundColor: 'var(--ht-muted-bg)' }}
        >
            <div
                className="w-10 h-10 rounded-full flex items-center justify-center mb-3"
                style={{ backgroundColor: 'var(--ht-body-bg, #ffffff)' }}
            >
                <Lock size={18} style={{ color: 'var(--ht-text-muted)' }} />
            </div>
            <p className="text-sm font-semibold" style={{ color: 'var(--ht-text-secondary)' }}>
                Accès restreint
            </p>
            <p className="text-xs mt-1 max-w-xs leading-relaxed" style={{ color: 'var(--ht-text-muted)' }}>
                {message}
            </p>
        </div>
    )
}