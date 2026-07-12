import { useState } from 'react'
import {
    Sparkles, Boxes, ShieldCheck, Layers, KeyRound, Database,
    TestTube, MonitorSmartphone, Route as RouteIcon, BarChart3, Rocket,
    ArrowRight,
} from 'lucide-react'
import { C, FONT_MONO, FONT_SANS } from '../utils/theme.ts'
import { SectionTitle, P, Callout, InlineCode, CodeBlock, Badge, Panel, StatCard } from '../components/ui.tsx'
import { JwtDecoder, PermissionMatrix, TestRunner } from '../components/widgets.tsx'
import { ROLES, MODULES, STACK, STATS, ROADMAP, JOURNEY } from '../types/data.ts'
import HealthTrackerDashboard from './HealthTrackerDashboard'

const DJANGO_APPS = ['patients', 'comptes', 'services', 'consultations', 'urgences', 'hospitalisations', 'analyses', 'disponibilites', 'antecedents', 'alertes', 'signes_vitaux']

// ── 1. Vue d'ensemble ──────────────────────────────────────────────────────
function SectionApercu() {
    return (
        <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
                <div style={{ fontSize: 40 }}>🏥</div>
                <div>
                    <div style={{ fontFamily: FONT_MONO, fontSize: 28, fontWeight: 700, color: C.text }}>HealthTracker</div>
                    <div style={{ fontFamily: FONT_SANS, fontSize: 13, color: C.textDim }}>Plateforme de gestion hospitalière — Django REST + React TypeScript</div>
                </div>
            </div>

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '16px 0 20px' }}>
                {ROLES.map(r => <Badge key={r.id} label={r.label} color={r.color} />)}
            </div>

            <P>
                Une appli complète de dossier patient électronique : suivi médical, urgences, laboratoire,
                hospitalisations, rendez-vous et gestion d'équipe — avec des droits d'accès qui changent vraiment
                selon qui est connecté, pas juste en apparence. Chaque chef de service ne gère que <i>son</i> service ;
                un compte superuser (direction) voit tout l'hôpital.
            </P>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, margin: '20px 0' }}>
                <StatCard value="11" label="Apps Django" color={C.mint} />
                <StatCard value="19" label="Pages React" color={C.blue} />
                <StatCard value="92" label="Tests unitaires" color={C.violet} />
                <StatCard value="5" label="Rôles métier" color={C.amber} />
            </div>

            <Callout>
                Navigue avec le menu à gauche : les sections suivent l'ordre le plus logique pour comprendre le
                projet — d'abord ce qu'il fait, puis comment il est construit, puis à quoi ça ressemble en vrai.
            </Callout>
        </>
    )
}

// ── 2. Modules & fonctionnalités ──────────────────────────────────────────
function SectionModules() {
    const [filterRole, setFilterRole] = useState<string | null>(null)
    const visible = filterRole ? MODULES.filter(m => m.roles.includes(filterRole as any)) : MODULES

    return (
        <>
            <SectionTitle eyebrow="Fonctionnel">Modules & fonctionnalités</SectionTitle>
            <P>10 modules métier, chacun avec ses propres droits d'accès. Filtre par rôle pour voir ce qu'une personne voit vraiment en se connectant :</P>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
                <button onClick={() => setFilterRole(null)} style={{
                    fontFamily: FONT_SANS, fontSize: 12.5, fontWeight: 600, padding: '6px 13px', borderRadius: 20, cursor: 'pointer',
                    border: `1px solid ${!filterRole ? C.mint : C.border}`,
                    backgroundColor: !filterRole ? C.mint : 'transparent',
                    color: !filterRole ? '#0a1512' : C.textDim,
                }}>Tous</button>
                {ROLES.map(r => (
                    <button key={r.id} onClick={() => setFilterRole(r.id)} style={{
                        fontFamily: FONT_SANS, fontSize: 12.5, fontWeight: 600, padding: '6px 13px', borderRadius: 20, cursor: 'pointer',
                        border: `1px solid ${filterRole === r.id ? r.color : C.border}`,
                        backgroundColor: filterRole === r.id ? r.color : 'transparent',
                        color: filterRole === r.id ? '#0a1512' : C.textDim,
                    }}>{r.label}</button>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
                {visible.map(m => (
                    <div key={m.title} style={{
                        border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, backgroundColor: C.panel,
                    }}>
                        <div style={{ fontSize: 22, marginBottom: 8 }}>{m.icon}</div>
                        <div style={{ fontFamily: FONT_SANS, fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 4 }}>{m.title}</div>
                        <div style={{ fontFamily: FONT_SANS, fontSize: 12.5, color: C.textDim, lineHeight: 1.5 }}>{m.desc}</div>
                    </div>
                ))}
            </div>
        </>
    )
}

// ── 3. Rôles & permissions ────────────────────────────────────────────────
function SectionRoles() {
    return (
        <>
            <SectionTitle eyebrow="Sécurité">Rôles & permissions</SectionTitle>
            <P>
                Cinq rôles, chacun avec des droits différents. Le rôle <InlineCode>admin</InlineCode> est en réalité
                un <b>chef de service</b>, scopé à son service — pas un admin hospitalier global (ça, c'est le
                superuser Django).
            </P>
            <PermissionMatrix />
        </>
    )
}

// ── 4. Architecture & stack ───────────────────────────────────────────────
function SectionArchitecture() {
    return (
        <>
            <SectionTitle eyebrow="Technique">Architecture & stack</SectionTitle>
            <P>
                Deux projets séparés qui se parlent uniquement en HTTP/JSON : un backend{' '}
                <InlineCode>Django + DRF</InlineCode> qui gère la base et les règles métier, un frontend{' '}
                <InlineCode>React + Vite + TypeScript</InlineCode> qui affiche tout ça. Le frontend ne touche jamais
                la base directement.
            </P>

            <div style={{ display: 'flex', alignItems: 'stretch', gap: 0, margin: '20px 0', fontFamily: FONT_MONO, fontSize: 12.5 }}>
                {['React (frontend)', 'API REST (Django + DRF)', 'PostgreSQL'].map((box, i) => (
                    <div key={box} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                        <div style={{ flex: 1, textAlign: 'center', padding: '16px 10px', borderRadius: 10, border: `1px solid ${C.border}`, backgroundColor: C.panel, color: C.text }}>
                            {box}
                        </div>
                        {i < 2 && <ArrowRight size={16} color={C.textFaint} style={{ flexShrink: 0, margin: '0 6px' }} />}
                    </div>
                ))}
            </div>

            <P>Le backend est découpé en 11 apps Django, chacune responsable d'un seul domaine métier :</P>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '14px 0 22px' }}>
                {DJANGO_APPS.map(app => (
                    <span key={app} style={{ fontFamily: FONT_MONO, fontSize: 12, padding: '5px 10px', borderRadius: 6, backgroundColor: C.panelAlt, border: `1px solid ${C.border}`, color: C.mint }}>{app}</span>
                ))}
            </div>

            <Callout>
                Chaque app suit le même schéma de 4 fichiers — <InlineCode>models.py</InlineCode> (tables),{' '}
                <InlineCode>serializers.py</InlineCode> (JSON ↔ objet Python), <InlineCode>views.py</InlineCode>{' '}
                (logique/permissions), <InlineCode>urls.py</InlineCode> (routes). Une fois ce schéma connu,
                n'importe quelle app du projet se lit pareil.
            </Callout>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginTop: 20 }}>
                {STACK.map(s => (
                    <div key={s.cat} style={{ border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, backgroundColor: C.panel }}>
                        <div style={{ fontFamily: FONT_MONO, fontSize: 11, fontWeight: 700, color: s.color, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>{s.cat}</div>
                        {s.items.map(item => (
                            <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, fontSize: 12, fontFamily: FONT_SANS, color: '#c3ddd5' }}>
                                <span style={{ color: s.color, fontSize: 8 }}>●</span> {item}
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </>
    )
}

// ── 5. Authentification JWT ───────────────────────────────────────────────
function SectionJwt() {
    return (
        <>
            <SectionTitle eyebrow="Sécurité">L'authentification par JWT</SectionTitle>
            <P>
                JWT (<i>JSON Web Token</i>) prouve « qui est connecté » sans que le serveur garde une session en
                mémoire — le token contient déjà l'info, sa signature garantit que personne ne l'a modifiée. Trois
                parties séparées par des points : <InlineCode>header.payload.signature</InlineCode>.
            </P>

            <JwtDecoder />

            <P>Le trajet complet, du clic « Se connecter » à la première requête protégée :</P>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0, margin: '18px 0' }}>
                {[
                    'Le formulaire envoie POST /api/auth/login/ avec username + password',
                    'CustomTokenView vérifie les identifiants et génère 2 tokens : access (court) et refresh (long)',
                    'Le frontend stocke les deux dans localStorage',
                    'Chaque requête suivante ajoute Authorization: Bearer <access_token> (intercepteur Axios)',
                    "Côté serveur, DRF vérifie la signature à chaque requête — pas de session à chercher en base",
                ].map((text, i, arr) => (
                    <div key={i} style={{ display: 'flex', gap: 14 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div style={{ width: 26, height: 26, borderRadius: '50%', backgroundColor: C.panelAlt, border: `1px solid ${C.mint}`, color: C.mint, fontFamily: FONT_MONO, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</div>
                            {i < arr.length - 1 && <div style={{ width: 1, flex: 1, backgroundColor: C.border, minHeight: 18 }} />}
                        </div>
                        <div style={{ fontFamily: FONT_SANS, fontSize: 13.5, color: '#c3ddd5', paddingBottom: 18, lineHeight: 1.6 }}>{text}</div>
                    </div>
                ))}
            </div>

            <CodeBlock label="comptes/views.py — claims personnalisés ajoutés au token" code={`class CustomTokenSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        try:
            e = user.employe
            token['role']       = e.role
            token['role_label'] = e.get_role_display()
            token['service_id'] = e.service_id or None
        except Exception:
            token['role'] = 'admin'   # utilisateur sans profil Employe
        return token`} />

            <Callout tone="amber">
                Le frontend décode le token juste pour <i>adapter l'affichage</i> — jamais une vérification de
                sécurité. La vraie vérification se fait toujours côté serveur, dans les classes de permission Django.
            </Callout>
        </>
    )
}

// ── 6. Modèles & API ──────────────────────────────────────────────────────
function SectionModelsApi() {
    return (
        <>
            <SectionTitle eyebrow="Base de données & API">Modèles Django & routes REST</SectionTitle>
            <P>Un modèle Django est une classe Python qui correspond à une table SQL :</P>
            <CodeBlock label="patients/models.py" code={`class Personne(models.Model):
    """Modèle de base abstrait partagé par Patient et Employe"""
    nom            = models.CharField(max_length=100)
    prenom         = models.CharField(max_length=100)
    date_naissance = models.DateField()

    class Meta:
        abstract = True

    @property
    def age(self):
        from datetime import date
        today = date.today()
        d = self.date_naissance
        return today.year - d.year - ((today.month, today.day) < (d.month, d.day))`} />

            <Callout>
                Après un changement de modèle : <InlineCode>python manage.py makemigrations</InlineCode> puis{' '}
                <InlineCode>python manage.py migrate</InlineCode>.
            </Callout>

            <P style={{ marginTop: 20 }}>
                Plutôt qu'une fonction par route, un <InlineCode>DefaultRouter</InlineCode> génère les 6 routes CRUD
                à partir d'un seul <InlineCode>ViewSet</InlineCode> :
            </P>
            <CodeBlock label="services/urls.py" code={`router = DefaultRouter()
router.register(r'services', ServiceViewSet, basename='service')
# GET/POST /services/  ·  GET/PUT/PATCH/DELETE /services/{id}/`} />

            <P>Pour une action métier précise (« admettre un patient », « valider un congé ») : <InlineCode>@action</InlineCode>.</P>
            <CodeBlock label="services/views.py — route personnalisée" code={`@action(detail=True, methods=['get'], url_path='stats')
def stats(self, request, pk=None):
    service = self.get_object()
    return Response({'patients': ..., 'employes': ...})`} />
        </>
    )
}

// ── 7. Tests ───────────────────────────────────────────────────────────────
function SectionTests() {
    return (
        <>
            <SectionTitle eyebrow="Fiabilité">Écrire et lancer les tests</SectionTitle>
            <P>
                Chaque classe de test hérite de <InlineCode>TestCase</InlineCode> ; <InlineCode>setUp()</InlineCode>{' '}
                tourne avant <i>chaque</i> test pour préparer des données fraîches, annulées ensuite automatiquement.
            </P>
            <CodeBlock label="disponibilites/tests_service_scoping.py — un vrai test de scoping" code={`def test_chef_ne_peut_pas_valider_conge_autre_service(self):
    exception_b = ExceptionDisponibilite.objects.create(employe=self.emp_b, type="conge", ...)
    self.client.force_authenticate(user=self.admin_a_user)
    response = self.client.post(f'/api/exceptions/{exception_b.id}/valider/')
    self.assertIn(response.status_code, [403, 404])`} />
            <TestRunner />
        </>
    )
}

// ── 8. Démo live du dashboard ─────────────────────────────────────────────
function SectionDashboardDemo() {
    return (
        <div style={{ maxWidth:"max-content" }}>
            <SectionTitle eyebrow="En vrai">Le dashboard, tel que vu par un(e) infirmier(ère)</SectionTitle>
            <P>
                Capture interactive du vrai poste de contrôle infirmier de l'app — données de démonstration, même
                composants React que la version connectée à l'API.
            </P>
            <div style={{
                border: `1px solid ${C.borderStrong}`, borderRadius: 14, overflow: 'hidden',
                boxShadow: '0 20px 60px rgba(0,0,0,0.45)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', backgroundColor: '#1a1a1a', borderBottom: '1px solid #262626' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                        {['#FF5F57', '#FEBC2E', '#28C840'].map(c => <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />)}
                    </div>
                    <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: '#777', marginLeft: 6 }}>healthtracker.app/dashboard</span>
                </div>
                <div style={{ maxHeight: 640, overflowY: 'auto' }}>
                    <HealthTrackerDashboard />
                </div>
            </div>
        </div>
    )
}

// ── 9. Parcours de développement ──────────────────────────────────────────
function SectionJourney() {
    return (
        <>
            <SectionTitle eyebrow="Chronologie">Parcours de développement</SectionTitle>
            <P>Les explications détaillées (JWT, tests, routes...) sont dans les sections dédiées ci-dessus — ici, juste la chronologie.</P>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {JOURNEY.map((step, i, arr) => (
                    <div key={step.title} style={{ display: 'flex', gap: 16 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div style={{ width: 34, height: 34, borderRadius: '50%', backgroundColor: C.panelAlt, border: `1px solid ${step.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>{step.emoji}</div>
                            {i < arr.length - 1 && <div style={{ width: 1, flex: 1, backgroundColor: C.border, minHeight: 24 }} />}
                        </div>
                        <div style={{ paddingBottom: 24, flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                <span style={{ fontFamily: FONT_MONO, fontSize: 10, padding: '2px 8px', borderRadius: 20, backgroundColor: step.color + '22', color: step.color, border: `1px solid ${step.color}44` }}>{step.phase}</span>
                                <span style={{ fontFamily: FONT_SANS, fontSize: 14.5, fontWeight: 700, color: C.text }}>{step.title}</span>
                            </div>
                            <div style={{ fontFamily: FONT_SANS, fontSize: 13, color: C.textDim, lineHeight: 1.6, marginBottom: step.code ? 8 : 0 }}>{step.detail}</div>
                            {step.code && <CodeBlock code={step.code} />}
                        </div>
                    </div>
                ))}
            </div>
        </>
    )
}

// ── 10. Chiffres clés ─────────────────────────────────────────────────────
function SectionStats() {
    return (
        <>
            <SectionTitle eyebrow="Chiffres">Le projet en chiffres</SectionTitle>
            <P>Chiffres réels du dépôt (apps, pages, tests) et de la base de démonstration (seed) — pas d'estimation.</P>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
                {STATS.map(s => <StatCard key={s.label} value={s.value} label={s.label} color={s.color} />)}
            </div>
        </>
    )
}

// ── 11. Roadmap ────────────────────────────────────────────────────────────
function SectionRoadmap() {
    return (
        <>
            <SectionTitle eyebrow="Et après">Prochaines étapes</SectionTitle>
            <Panel style={{ backgroundColor: C.panelAlt }}>
                {ROADMAP.map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: i < ROADMAP.length - 1 ? 10 : 0, fontFamily: FONT_SANS, fontSize: 13.5, color: '#dff5ef' }}>
                        <span style={{ color: C.mint }}>→</span> {item}
                    </div>
                ))}
            </Panel>
        </>
    )
}

// ── Composant principal ─────────────────────────────────────────────────────
const SECTIONS = [
    { id: 'apercu',       label: 'Vue d\u2019ensemble',       icon: Sparkles,          Render: SectionApercu },
    { id: 'modules',      label: 'Modules',                icon: Boxes,             Render: SectionModules },
    { id: 'roles',        label: 'Rôles & permissions',    icon: ShieldCheck,       Render: SectionRoles },
    { id: 'archi',        label: 'Architecture & stack',   icon: Layers,            Render: SectionArchitecture },
    { id: 'jwt',          label: 'Authentification JWT',   icon: KeyRound,          Render: SectionJwt },
    { id: 'models',       label: 'Modèles & API',          icon: Database,          Render: SectionModelsApi },
    { id: 'tests',        label: 'Tests',                  icon: TestTube,          Render: SectionTests },
    { id: 'demo',         label: 'Démo — dashboard',       icon: MonitorSmartphone, Render: SectionDashboardDemo },
    { id: 'journey',      label: 'Parcours de dev',        icon: RouteIcon,         Render: SectionJourney },
    { id: 'stats',        label: 'Chiffres clés',          icon: BarChart3,         Render: SectionStats },
    { id: 'roadmap',      label: 'Roadmap',                icon: Rocket,            Render: SectionRoadmap },
]

export default function SuperPresentation() {
    const [active, setActive] = useState(SECTIONS[0].id)
    const current = SECTIONS.find(s => s.id === active)!

    return (
        <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: C.bg }}>
            {/* Sidebar */}
            <nav style={{
                width: 236, flexShrink: 0, borderRight: `1px solid ${C.border}`,
                backgroundColor: C.panelAlt, position: 'sticky', top: 0, height: '100vh',
                overflowY: 'auto', padding: '18px 10px',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 10px 18px' }}>
                    <span style={{ fontSize: 18 }}>🏥</span>
                    <span style={{ fontFamily: FONT_MONO, fontSize: 13, fontWeight: 700, color: C.text }}>HealthTracker</span>
                </div>
                {SECTIONS.map(s => {
                    const isActive = s.id === active
                    return (
                        <button
                            key={s.id}
                            onClick={() => setActive(s.id)}
                            style={{
                                width: '100%', display: 'flex', alignItems: 'center', gap: 9,
                                padding: '9px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                                marginBottom: 2, fontFamily: FONT_SANS, fontSize: 13, fontWeight: isActive ? 600 : 400,
                                backgroundColor: isActive ? C.mint : 'transparent',
                                color: isActive ? '#0a1512' : C.textDim,
                                textAlign: 'left', transition: 'background .12s, color .12s',
                            }}
                        >
                            <s.icon size={15} />
                            {s.label}
                        </button>
                    )
                })}
            </nav>

            {/* Contenu */}
            <main style={{ flex: 1, padding: '40px 44px', maxWidth: 980 }}>
                <current.Render />
            </main>
        </div>
    )
}