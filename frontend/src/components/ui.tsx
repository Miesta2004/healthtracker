import { useState, type ReactNode, type CSSProperties } from 'react'
import { Copy, Check } from 'lucide-react'
import { C, FONT_MONO, FONT_SANS } from '../utils/theme.ts'

export function CodeBlock({ code, label }: { code: string; label?: string }) {
    const [copied, setCopied] = useState(false)
    return (
        <div style={{ borderRadius: 10, overflow: 'hidden', border: `1px solid ${C.border}`, margin: '14px 0' }}>
            {label && (
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 14px', backgroundColor: C.panelAlt, borderBottom: `1px solid ${C.border}`,
                }}>
                    <span style={{ fontFamily: FONT_MONO, fontSize: 12, color: C.textDim }}>{label}</span>
                    <button
                        onClick={() => { navigator.clipboard?.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textFaint, display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontFamily: FONT_SANS }}
                    >
                        {copied ? <Check size={12} color={C.mint} /> : <Copy size={12} />}
                        {copied ? 'Copié' : 'Copier'}
                    </button>
                </div>
            )}
            <pre style={{
                margin: 0, padding: '14px 16px', backgroundColor: '#0a1512',
                overflowX: 'auto', fontSize: 12.5, lineHeight: 1.65, fontFamily: FONT_MONO, color: '#cdeee5',
            }}>
                <code>{code}</code>
            </pre>
        </div>
    )
}

export function SectionTitle({ children, eyebrow }: { children: ReactNode; eyebrow: string }) {
    return (
        <div style={{ marginBottom: 20 }}>
            <div style={{ fontFamily: FONT_MONO, fontSize: 11, letterSpacing: 1.5, color: C.mint, marginBottom: 6 }}>
                {eyebrow}
            </div>
            <h2 style={{ fontFamily: FONT_MONO, fontSize: 24, fontWeight: 700, color: C.text, margin: 0 }}>
                {children}
            </h2>
        </div>
    )
}

export function P({ children, style = {} }: { children: ReactNode; style?: CSSProperties }) {
    return <p style={{ fontFamily: FONT_SANS, fontSize: 14.5, lineHeight: 1.75, color: '#c3ddd5', margin: '0 0 14px', ...style }}>{children}</p>
}

export function Callout({ children, tone = 'mint' }: { children: ReactNode; tone?: 'mint' | 'amber' | 'coral' }) {
    const colors = { mint: [C.mint, C.mintDim], amber: [C.amber, C.amberDim], coral: [C.coral, C.coralDim] }[tone]
    return (
        <div style={{
            borderLeft: `3px solid ${colors[0]}`, backgroundColor: colors[1] + '33',
            padding: '10px 16px', borderRadius: '0 8px 8px 0', margin: '14px 0',
            fontFamily: FONT_SANS, fontSize: 13.5, lineHeight: 1.65, color: '#dff5ef',
        }}>
            {children}
        </div>
    )
}

export function InlineCode({ children }: { children: ReactNode }) {
    return (
        <code style={{
            fontFamily: FONT_MONO, fontSize: '0.9em', backgroundColor: '#0a1512',
            color: C.mint, padding: '1px 6px', borderRadius: 4, border: `1px solid ${C.border}`,
        }}>{children}</code>
    )
}

export function Badge({ label, color }: { label: string; color: string }) {
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center',
            padding: '3px 11px', borderRadius: 20,
            fontSize: 11.5, fontWeight: 600, fontFamily: FONT_SANS,
            color, backgroundColor: color + '1e',
            border: `1px solid ${color}44`,
        }}>{label}</span>
    )
}

export function Panel({ children, style = {} }: { children: ReactNode; style?: CSSProperties }) {
    return (
        <div style={{
            border: `1px solid ${C.border}`, borderRadius: 12, padding: 20,
            backgroundColor: C.panel, margin: '18px 0',
            ...style,
        }}>
            {children}
        </div>
    )
}

export function StatCard({ value, label, color }: { value: string | number; label: string; color: string }) {
    return (
        <div style={{
            border: `1px solid ${C.border}`, borderRadius: 12, padding: '16px 18px',
            backgroundColor: C.panel, textAlign: 'center',
        }}>
            <div style={{ fontFamily: FONT_MONO, fontSize: 26, fontWeight: 700, color }}>{value}</div>
            <div style={{ fontFamily: FONT_SANS, fontSize: 11.5, color: C.textDim, marginTop: 4 }}>{label}</div>
        </div>
    )
}