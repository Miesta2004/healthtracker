import { useState } from 'react'
import { Lock, Unlock, CheckCircle2, XCircle, Play, RotateCcw } from 'lucide-react'
import { C, FONT_MONO, FONT_SANS } from '../utils/theme.ts'
import { Callout, InlineCode, Panel } from './ui.tsx'
import { ROLES, type RoleId } from '../types/data.ts'

// ── Widget 1 — Décodeur de JWT ────────────────────────────────────────────
export function JwtDecoder() {
    const [revealed, setRevealed] = useState(false)

    const header = { alg: 'HS256', typ: 'JWT' }
    const payload = {
        token_type: 'access', exp: 1752345678, user_id: 7,
        role: 'medecin', role_label: 'Médecin', nom: 'Fall', prenom: 'Aïssatou',
        service_id: 3, service_nom: 'Cardiologie',
    }
    const headerB64 = 'eyJhbGciOiJIUzI1NiIs'
    const payloadB64 = 'eyJ1c2VyX2lkIjo3LCJyb2xlIjoibWVkZWNpbiI'
    const sigB64 = 'k3fT7vHqR2mN8pL1xYwZ'

    return (
        <Panel>
            <div style={{ fontFamily: FONT_SANS, fontSize: 12, color: C.textDim, marginBottom: 12 }}>
                Un vrai token émis par <InlineCode>CustomTokenView</InlineCode> ressemble à ça — clique pour le décoder :
            </div>

            <div style={{
                fontFamily: FONT_MONO, fontSize: 12.5, lineHeight: 1.9, wordBreak: 'break-all',
                padding: '12px 14px', backgroundColor: '#0a1512', borderRadius: 8, border: `1px solid ${C.border}`,
            }}>
                <span style={{ color: C.coral }}>{headerB64}</span>
                <span style={{ color: C.textFaint }}>.</span>
                <span style={{ color: C.mint }}>{payloadB64}</span>
                <span style={{ color: C.textFaint }}>.</span>
                <span style={{ color: C.amber }}>{sigB64}</span>
            </div>

            <div style={{ display: 'flex', gap: 16, marginTop: 10, fontFamily: FONT_SANS, fontSize: 11.5 }}>
                <span style={{ color: C.coral }}>■ header</span>
                <span style={{ color: C.mint }}>■ payload</span>
                <span style={{ color: C.amber }}>■ signature</span>
            </div>

            <button
                onClick={() => setRevealed(!revealed)}
                style={{
                    marginTop: 14, display: 'flex', alignItems: 'center', gap: 6,
                    backgroundColor: revealed ? 'transparent' : C.mint,
                    color: revealed ? C.mint : '#0a1512',
                    border: `1px solid ${C.mint}`, borderRadius: 8, padding: '8px 14px',
                    fontFamily: FONT_SANS, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}
            >
                {revealed ? <Lock size={14} /> : <Unlock size={14} />}
                {revealed ? 'Recacher le contenu décodé' : 'Décoder le token'}
            </button>

            {revealed && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 14 }}>
                    <div style={{ border: `1px solid ${C.coral}55`, borderRadius: 8, padding: 12 }}>
                        <div style={{ fontFamily: FONT_MONO, fontSize: 10.5, color: C.coral, marginBottom: 6 }}>HEADER</div>
                        <pre style={{ margin: 0, fontFamily: FONT_MONO, fontSize: 11.5, color: '#e9c9bd', lineHeight: 1.6 }}>
{JSON.stringify(header, null, 2)}
                        </pre>
                    </div>
                    <div style={{ border: `1px solid ${C.mint}55`, borderRadius: 8, padding: 12 }}>
                        <div style={{ fontFamily: FONT_MONO, fontSize: 10.5, color: C.mint, marginBottom: 6 }}>PAYLOAD (claims)</div>
                        <pre style={{ margin: 0, fontFamily: FONT_MONO, fontSize: 11.5, color: '#cdeee5', lineHeight: 1.6 }}>
{JSON.stringify(payload, null, 2)}
                        </pre>
                    </div>
                </div>
            )}

            {revealed && (
                <Callout tone="amber">
                    Le <InlineCode>role</InlineCode>, le <InlineCode>service_id</InlineCode> etc. sont ajoutés « à la main »
                    dans <InlineCode>CustomTokenSerializer.get_token()</InlineCode>. Le frontend les lit directement dans
                    le token, sans jamais rappeler l'API pour savoir « qui je suis ».
                </Callout>
            )}
        </Panel>
    )
}

// ── Widget 2 — Matrice des permissions par rôle ───────────────────────────
interface EndpointRule { name: string; permission: string; allowed: RoleId[] }
const ENDPOINTS: EndpointRule[] = [
    { name: 'GET /services/', permission: 'IsAuthenticated', allowed: ['admin', 'medecin', 'infirmier', 'secretaire', 'laborantin'] },
    { name: 'POST /services/', permission: 'IsSuperUser', allowed: [] },
    { name: 'PATCH /employes/{id}/ (même service)', permission: 'IsAdminRole (scopé service)', allowed: ['admin'] },
    { name: 'GET /urgences/', permission: 'IsLectureAutorisee', allowed: ['admin', 'medecin', 'infirmier', 'laborantin'] },
    { name: 'POST /urgences/', permission: 'IsMedecinOuInfirmier', allowed: ['admin', 'medecin', 'infirmier'] },
    { name: 'GET /rendez_vous/', permission: 'PeutVoirRendezVous', allowed: ['admin', 'medecin', 'infirmier', 'secretaire'] },
    { name: 'DELETE /rendez_vous/{id}/', permission: 'IsAdminRole', allowed: ['admin'] },
    { name: 'POST /analyses/ (créer)', permission: 'IsMedecinOuAdmin', allowed: ['admin', 'medecin'] },
    { name: 'POST /analyses/{id}/prendre-en-charge/', permission: 'rôle == laborantin (custom)', allowed: ['laborantin'] },
    { name: 'POST /exceptions/{id}/valider/ (congé)', permission: 'IsAdminRole (scopé service)', allowed: ['admin'] },
]

export function PermissionMatrix() {
    const [role, setRole] = useState<RoleId>('secretaire')

    return (
        <Panel>
            <div style={{ fontFamily: FONT_SANS, fontSize: 12, color: C.textDim, marginBottom: 12 }}>
                Choisis un rôle et regarde ce que <InlineCode>get_permissions()</InlineCode> autorise réellement,
                endpoint par endpoint (logique tirée telle quelle des fichiers <InlineCode>permissions.py</InlineCode>) :
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                {ROLES.map(r => (
                    <button
                        key={r.id}
                        onClick={() => setRole(r.id)}
                        style={{
                            fontFamily: FONT_SANS, fontSize: 13, fontWeight: 600, padding: '7px 14px',
                            borderRadius: 20, cursor: 'pointer',
                            border: `1px solid ${role === r.id ? C.mint : C.border}`,
                            backgroundColor: role === r.id ? C.mint : 'transparent',
                            color: role === r.id ? '#0a1512' : C.textDim,
                        }}
                    >
                        {r.label}
                    </button>
                ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {ENDPOINTS.map(ep => {
                    const ok = ep.allowed.includes(role)
                    return (
                        <div key={ep.name} style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '9px 12px', borderRadius: 8,
                            backgroundColor: ok ? C.mintDim + '2a' : C.coralDim + '2a',
                            border: `1px solid ${ok ? C.mint + '40' : C.coral + '40'}`,
                        }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <span style={{ fontFamily: FONT_MONO, fontSize: 12.5, color: C.text }}>{ep.name}</span>
                                <span style={{ fontFamily: FONT_MONO, fontSize: 10.5, color: C.textFaint }}>{ep.permission}</span>
                            </div>
                            {ok
                                ? <CheckCircle2 size={18} color={C.mint} />
                                : <XCircle size={18} color={C.coral} />}
                        </div>
                    )
                })}
            </div>

            <Callout>
                Le rôle <InlineCode>admin</InlineCode> est un <b>chef de service</b> : ses droits sont limités à son
                propre service (superuser = admin général, sans restriction).
            </Callout>
        </Panel>
    )
}

// ── Widget 3 — Simulation d'exécution des tests ───────────────────────────
const TEST_SUITES = [
    { app: 'patients', tests: ['test_patient_creation', 'test_patient_str', 'test_creer_patient', 'test_lister_patients', 'test_acces_sans_token'] },
    { app: 'services', tests: ['test_creer_service_admin', 'test_creer_service_non_admin_refuse', 'test_chef_ne_voit_que_son_service_dans_la_liste'] },
    { app: 'comptes', tests: ['test_employe_matricule_auto', 'test_creer_employe_admin', 'test_chef_ne_peut_pas_modifier_employe_autre_service'] },
    { app: 'disponibilites', tests: ['test_chef_peut_valider_conge_meme_service', 'test_chef_ne_peut_pas_valider_conge_autre_service'] },
    { app: 'urgences', tests: ['test_creer_passage_infirmier', 'test_lister_passages_secretaire_refuse_lecture'] },
    { app: 'consultations', tests: ['test_creer_rdv_secretaire', 'test_supprimer_rdv_admin'] },
]

export function TestRunner() {
    const [running, setRunning] = useState(false)
    const [doneCount, setDoneCount] = useState(0)
    const flat = TEST_SUITES.flatMap(s => s.tests.map(t => `${s.app}.tests.${t}`))

    const run = () => {
        setRunning(true)
        setDoneCount(0)
        let i = 0
        const tick = () => {
            i += 1
            setDoneCount(i)
            if (i < flat.length) setTimeout(tick, 90)
            else setRunning(false)
        }
        setTimeout(tick, 90)
    }

    return (
        <Panel>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontFamily: FONT_MONO, fontSize: 12, color: C.textDim }}>
                    $ python manage.py test
                </span>
                <button
                    onClick={run}
                    disabled={running}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 6, fontFamily: FONT_SANS, fontSize: 12.5, fontWeight: 600,
                        backgroundColor: running ? 'transparent' : C.mint, color: running ? C.textFaint : '#0a1512',
                        border: `1px solid ${running ? C.border : C.mint}`, borderRadius: 8, padding: '6px 12px',
                        cursor: running ? 'default' : 'pointer',
                    }}
                >
                    {doneCount === flat.length && doneCount > 0
                        ? <><RotateCcw size={13} /> Relancer</>
                        : <><Play size={13} /> Lancer</>}
                </button>
            </div>

            <div style={{
                backgroundColor: '#0a1512', borderRadius: 8, border: `1px solid ${C.border}`,
                padding: '12px 14px', fontFamily: FONT_MONO, fontSize: 11.5, lineHeight: 1.8,
                maxHeight: 220, overflowY: 'auto',
            }}>
                {doneCount === 0 && !running && (
                    <span style={{ color: C.textFaint }}>En attente — clique sur « Lancer ».</span>
                )}
                {flat.slice(0, doneCount).map((name, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: 8, color: '#cdeee5' }}>
                        <span style={{ color: C.mint }}>ok</span>
                        <span>{name}</span>
                    </div>
                ))}
                {doneCount === flat.length && doneCount > 0 && (
                    <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${C.border}`, color: C.mint }}>
                        Ran {flat.length} tests — OK (échantillon — 92 au total dans le projet)
                    </div>
                )}
            </div>

            <Callout tone="mint">
                Chaque test tourne dans sa propre transaction, annulée à la fin (<InlineCode>TestCase</InlineCode> de
                Django) : la base ne garde jamais les patients ou employés créés pour les besoins d'un test.
            </Callout>
        </Panel>
    )
}