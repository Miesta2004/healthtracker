// Tracé ECG décoratif qui « respire » en continu — le signe le plus vivant du dossier patient.
export default function EKGTrace({
                                     color = 'var(--ht-primary)', height = 26, className = '',
                                 }: { color?: string; height?: number; className?: string }) {
    const path =
        'M0,13 L28,13 L34,13 L39,3 L45,23 L51,13 L60,13 L65,6 L70,13 L280,13 ' +
        'L286,13 L291,3 L297,23 L303,13 L312,13 L317,6 L322,13 L532,13'

    return (
        <svg
            viewBox="0 0 532 26"
            preserveAspectRatio="none"
            className={className}
            style={{ width: '100%', height, display: 'block' }}
        >
            <path
                d={path}
                fill="none"
                stroke={color}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="ht-ekg-path"
                opacity={0.8}
            />
        </svg>
    )
}
