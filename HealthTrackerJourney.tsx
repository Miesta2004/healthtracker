import { useState, useEffect, useRef } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────
interface Step {
  id: string;
  phase: string;
  title: string;
  emoji: string;
  color: string;
  detail: string;
  code?: string;
  result?: string;
}

// ─── Data ────────────────────────────────────────────────────────────────────
const steps: Step[] = [
  {
    id: "setup",
    phase: "Phase 1",
    title: "Setup Django",
    emoji: "⚙️",
    color: "#3B82F6",
    detail: "On a créé un environnement virtuel Python (venv), installé Django 6, Django REST Framework, SimpleJWT pour l'authentification et drf-yasg pour la documentation Swagger automatique.",
    code: `python3 -m venv venv
source venv/bin/activate
pip install django djangorestframework
pip install djangorestframework-simplejwt drf-yasg
django-admin startproject healthtracker .
python3 manage.py runserver`,
    result: "✅ Projet Django initialisé"
  },
  {
    id: "models",
    phase: "Phase 1",
    title: "Les Modèles",
    emoji: "🗃️",
    color: "#8B5CF6",
    detail: "Chaque modèle Django = une table PostgreSQL/SQLite. On a créé 5 apps : patients, consultations, signes_vitaux, alertes, rendez_vous. Les migrations traduisent automatiquement le Python en SQL.",
    code: `class Patient(models.Model):
    nom = models.CharField(max_length=100)
    prenom = models.CharField(max_length=100)
    date_naissance = models.DateField()
    sexe = models.CharField(max_length=1)
    groupe_sanguin = models.CharField(max_length=3)
    actif = models.BooleanField(default=True)

python3 manage.py makemigrations
python3 manage.py migrate`,
    result: "✅ 6 tables créées en base"
  },
  {
    id: "jwt",
    phase: "Phase 1",
    title: "Auth JWT",
    emoji: "🔐",
    color: "#F59E0B",
    detail: "JWT fonctionne comme un badge numérique. Après le login, le serveur renvoie un access_token (30 min) et un refresh_token (7 jours). Chaque requête API joint ce token dans le header Authorization.",
    code: `POST /api/auth/login/
{ "username": "marietou", "password": "..." }

# Réponse du serveur
{
  "access": "eyJhbGciOiJIUzI1...",
  "refresh": "eyJhbGciOiJIUzI1..."
}

# Utiliser l'API avec le token
GET /api/patients/
Authorization: Bearer eyJhbGciOiJIUzI1...`,
    result: "✅ Auth sécurisée sans session"
  },
  {
    id: "api",
    phase: "Phase 2",
    title: "API REST CRUD",
    emoji: "🚀",
    color: "#10B981",
    detail: "Django REST Framework génère les 5 actions CRUD en 3 lignes de code grâce à ModelViewSet. Le Serializer convertit les objets Python en JSON. Le Router crée toutes les URLs automatiquement.",
    code: `class PatientViewSet(viewsets.ModelViewSet):
    queryset = Patient.objects.all()
    serializer_class = PatientSerializer
    permission_classes = [IsAuthenticated]

# Génère automatiquement :
GET    /api/patients/     → liste tous
POST   /api/patients/     → créer
GET    /api/patients/1/   → détail
PUT    /api/patients/1/   → modifier
DELETE /api/patients/1/   → supprimer`,
    result: "✅ API complète en 3 lignes"
  },
  {
    id: "swagger",
    phase: "Phase 2",
    title: "Doc Swagger",
    emoji: "📚",
    color: "#06B6D4",
    detail: "drf-yasg génère une interface Swagger UI complète à partir de ton code Django. Tous les endpoints sont documentés automatiquement et testables directement depuis le navigateur sur /api/docs/.",
    code: `schema_view = get_schema_view(
    openapi.Info(
        title="HealthTracker API",
        default_version='v1',
    ),
    public=True,
)

path('api/docs/', schema_view.with_ui('swagger'))

# → interface interactive sur
# http://127.0.0.1:8000/api/docs/`,
    result: "✅ 7 modules documentés"
  },
  {
    id: "tests",
    phase: "Phase 2",
    title: "9 Tests Unitaires",
    emoji: "🧪",
    color: "#EF4444",
    detail: "Les tests vérifient que chaque partie du code fait exactement ce qu'elle doit faire. Django crée une base de données temporaire en mémoire pour chaque run de tests. 9/9 tests passent en vert.",
    code: `class PatientAPITest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(...)
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_creer_patient(self):
        response = self.client.post('/api/patients/', data)
        self.assertEqual(response.status_code, 201)

    def test_acces_sans_token(self):
        response = APIClient().get('/api/patients/')
        self.assertIn(response.status_code, [401, 403])

# Ran 9 tests in 1.365s — OK ✅`,
    result: "✅ 9/9 tests passent"
  },
  {
    id: "react",
    phase: "Phase 3",
    title: "Frontend React",
    emoji: "⚛️",
    color: "#3B82F6",
    detail: "Le frontend React/TypeScript communique avec le backend Django via Axios. Le token JWT est stocké dans localStorage et joint automatiquement à chaque requête via un intercepteur Axios.",
    code: `// src/api/client.ts
const api = axios.create({
  baseURL: 'http://127.0.0.1:8000/api',
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = \`Bearer \${token}\`
  }
  return config
})

// src/pages/Dashboard.tsx
const [patients, setPatients] = useState<Patient[]>([])
useEffect(() => {
  getPatients().then(setPatients)
}, [])`,
    result: "✅ Dashboard en temps réel"
  },
  {
    id: "result",
    phase: "Résultat",
    title: "App Complète 🎉",
    emoji: "🏥",
    color: "#10B981",
    detail: "En moins de 2 semaines, tu as construit une application fullstack complète avec authentification JWT, API REST documentée, 9 tests unitaires, et un dashboard React connecté en temps réel. C'est exactement ce qu'un dev junior construit en première semaine de stage.",
    code: `Stack technique final :
──────────────────────────────────
Backend  : Python 3.14 + Django 6
API      : Django REST Framework
Auth     : JWT (SimpleJWT)
Doc API  : Swagger (drf-yasg)
Tests    : Django TestCase (9/9)
Frontend : React 18 + TypeScript
Styles   : TailwindCSS
HTTP     : Axios + intercepteurs
Build    : Vite 8
DB       : SQLite (dev) → PostgreSQL
──────────────────────────────────
Endpoints : 35+ routes REST
Apps      : 5 modules métier
Tests     : 9/9 unitaires ✅`,
    result: "🚀 Projet GitHub-ready"
  }
];

const architecture = [
  { label: "Navigateur / React", color: "#3B82F6" },
  { label: "Axios + JWT Token", color: "#8B5CF6" },
  { label: "Django urls.py", color: "#10B981" },
  { label: "JWT Middleware", color: "#F59E0B" },
  { label: "ViewSet (CRUD)", color: "#EF4444" },
  { label: "Serializer (JSON)", color: "#06B6D4" },
  { label: "Model → SQLite", color: "#6B7280" },
];

// ─── Main Component ───────────────────────────────────────────────────────────
export default function HealthTrackerJourney() {
  const [activeStep, setActiveStep] = useState<string>("setup");
  const [tab, setTab] = useState<"parcours" | "architecture" | "stack">("parcours");
  const [animating, setAnimating] = useState(false);
  const [flowActive, setFlowActive] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const current = steps.find(s => s.id === activeStep)!;

  const handleStep = (id: string) => {
    if (id === activeStep) return;
    setAnimating(true);
    setTimeout(() => {
      setActiveStep(id);
      setAnimating(false);
    }, 180);
  };

  useEffect(() => {
    if (tab === "architecture") {
      intervalRef.current = setInterval(() => {
        setFlowActive(n => (n + 1) % architecture.length);
      }, 700);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [tab]);

  const phases = ["Phase 1", "Phase 2", "Phase 3", "Résultat"];
  const phaseColors: Record<string, string> = {
    "Phase 1": "#8B5CF6",
    "Phase 2": "#3B82F6",
    "Phase 3": "#10B981",
    "Résultat": "#F59E0B"
  };

  const currentIdx = steps.findIndex(s => s.id === activeStep);

  return (
    <div style={{
      fontFamily: "'DM Mono', 'Fira Code', 'Courier New', monospace",
      background: "#0F0F0F",
      minHeight: "100vh",
      color: "#E5E5E5",
    }}>

      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
        padding: "2rem 2rem 1.5rem",
        borderBottom: "1px solid #222",
        position: "relative",
        overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
          backgroundImage: "radial-gradient(circle at 20% 50%, rgba(59,130,246,0.15) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(139,92,246,0.1) 0%, transparent 50%)",
          pointerEvents: "none",
        }} />
        <div style={{ position: "relative", display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: "28px" }}>🏥</span>
          <div>
            <h1 style={{ margin: 0, fontSize: "20px", fontWeight: 700, color: "#fff" }}>
              HealthTracker — Journal de bord
            </h1>
            <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#60A5FA", letterSpacing: "2px", textTransform: "uppercase" }}>
              Django REST + React TypeScript + JWT + Tests · Marietou Fall
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid #222", background: "#0F0F0F" }}>
        {(["parcours", "architecture", "stack"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: "11px 20px",
            background: "none",
            border: "none",
            borderBottom: tab === t ? "2px solid #3B82F6" : "2px solid transparent",
            color: tab === t ? "#3B82F6" : "#555",
            fontSize: "11px",
            fontFamily: "inherit",
            cursor: "pointer",
            letterSpacing: "1px",
            textTransform: "uppercase",
            transition: "all 0.2s",
          }}>
            {t === "parcours" ? "📖 Parcours" : t === "architecture" ? "🏗️ Architecture" : "⚡ Stack"}
          </button>
        ))}
      </div>

      {/* ── TAB: PARCOURS ── */}
      {tab === "parcours" && (
        <div style={{ display: "flex", minHeight: "calc(100vh - 130px)" }}>

          {/* Sidebar */}
          <div style={{
            width: "210px", flexShrink: 0,
            borderRight: "1px solid #1a1a1a",
            background: "#0A0A0A",
            overflowY: "auto",
          }}>
            {phases.map(phase => (
              <div key={phase}>
                <div style={{
                  padding: "10px 14px 4px",
                  fontSize: "9px",
                  color: phaseColors[phase],
                  letterSpacing: "2px",
                  textTransform: "uppercase",
                  fontWeight: 700,
                }}>
                  {phase}
                </div>
                {steps.filter(s => s.phase === phase).map(step => (
                  <button key={step.id} onClick={() => handleStep(step.id)} style={{
                    width: "100%",
                    padding: "9px 14px",
                    background: activeStep === step.id ? `${step.color}18` : "transparent",
                    border: "none",
                    borderLeft: activeStep === step.id ? `2px solid ${step.color}` : "2px solid transparent",
                    color: activeStep === step.id ? "#fff" : "#555",
                    fontSize: "11px",
                    fontFamily: "inherit",
                    cursor: "pointer",
                    textAlign: "left",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    transition: "all 0.2s",
                  }}>
                    <span style={{ fontSize: "14px" }}>{step.emoji}</span>
                    {step.title}
                  </button>
                ))}
              </div>
            ))}
          </div>

          {/* Content */}
          <div style={{
            flex: 1, padding: "2rem", overflowY: "auto",
            opacity: animating ? 0 : 1,
            transform: animating ? "translateY(6px)" : "translateY(0)",
            transition: "all 0.18s ease",
          }}>

            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "1.25rem" }}>
              <span style={{
                fontSize: "9px", padding: "3px 10px", borderRadius: "20px",
                background: `${current.color}22`, color: current.color,
                border: `1px solid ${current.color}44`,
                letterSpacing: "1px", textTransform: "uppercase",
              }}>
                {current.phase}
              </span>
              <span style={{ fontSize: "22px" }}>{current.emoji}</span>
              <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#fff" }}>
                {current.title}
              </h2>
            </div>

            <p style={{
              fontSize: "13px", color: "#94A3B8", lineHeight: 1.8,
              marginBottom: "1.25rem", padding: "14px 16px",
              background: "#141414", borderRadius: "6px",
              borderLeft: `3px solid ${current.color}`,
            }}>
              {current.detail}
            </p>

            {current.code && (
              <div style={{ marginBottom: "1.25rem" }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: "8px",
                  padding: "7px 14px",
                  background: "#1a1a1a",
                  borderRadius: "6px 6px 0 0",
                  borderBottom: "1px solid #222",
                }}>
                  <div style={{ display: "flex", gap: "5px" }}>
                    {["#FF5F57","#FEBC2E","#28C840"].map(c => (
                      <div key={c} style={{ width: 9, height: 9, borderRadius: "50%", background: c }} />
                    ))}
                  </div>
                  <span style={{ fontSize: "10px", color: "#444", marginLeft: "4px" }}>
                    {current.id}.py
                  </span>
                </div>
                <pre style={{
                  margin: 0, padding: "18px",
                  background: "#0A0A0A",
                  borderRadius: "0 0 6px 6px",
                  border: "1px solid #1a1a1a",
                  borderTop: "none",
                  fontSize: "11px", lineHeight: 1.9,
                  color: "#A3E635",
                  overflowX: "auto", whiteSpace: "pre-wrap",
                }}>
                  {current.code}
                </pre>
              </div>
            )}

            <div style={{
              padding: "11px 16px",
              background: "#0D2818", border: "1px solid #166534",
              borderRadius: "6px", fontSize: "12px", color: "#4ADE80",
              display: "flex", alignItems: "center", gap: "8px",
              marginBottom: "1.5rem",
            }}>
              {current.result}
            </div>

            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              {currentIdx > 0 && (
                <button onClick={() => handleStep(steps[currentIdx - 1].id)} style={{
                  padding: "7px 14px", background: "#1a1a1a",
                  border: "1px solid #333", borderRadius: "5px",
                  color: "#666", fontSize: "11px", fontFamily: "inherit", cursor: "pointer",
                }}>← Précédent</button>
              )}
              {currentIdx < steps.length - 1 && (
                <button onClick={() => handleStep(steps[currentIdx + 1].id)} style={{
                  padding: "7px 14px", background: current.color,
                  border: "none", borderRadius: "5px",
                  color: "#fff", fontSize: "11px", fontFamily: "inherit",
                  cursor: "pointer", fontWeight: 600,
                }}>Suivant →</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: ARCHITECTURE ── */}
      {tab === "architecture" && (
        <div style={{ padding: "2rem", maxWidth: "700px" }}>
          <h2 style={{ fontSize: "15px", color: "#fff", marginBottom: "0.5rem" }}>
            Flux d'une requête API
          </h2>
          <p style={{ fontSize: "11px", color: "#555", marginBottom: "2rem" }}>
            Chaque requête traverse ces couches dans l'ordre — animation en direct
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
            {architecture.map((layer, i) => (
              <div key={i} style={{ display: "flex", alignItems: "stretch" }}>
                <div style={{
                  display: "flex", flexDirection: "column", alignItems: "center",
                  width: "24px", marginRight: "14px",
                }}>
                  <div style={{
                    width: "12px", height: "12px", borderRadius: "50%",
                    background: flowActive >= i ? layer.color : "#222",
                    border: `2px solid ${flowActive >= i ? layer.color : "#333"}`,
                    boxShadow: flowActive === i ? `0 0 14px ${layer.color}` : "none",
                    transition: "all 0.3s",
                    flexShrink: 0, marginTop: "18px",
                  }} />
                  {i < architecture.length - 1 && (
                    <div style={{
                      width: "2px", flex: 1, minHeight: "28px",
                      background: flowActive > i
                        ? `linear-gradient(${layer.color}, ${architecture[i+1].color})`
                        : "#1a1a1a",
                      transition: "all 0.4s",
                    }} />
                  )}
                </div>
                <div style={{
                  flex: 1, padding: "12px 18px", marginBottom: "4px",
                  background: flowActive === i ? `${layer.color}12` : "#111",
                  border: `1px solid ${flowActive === i ? layer.color + "44" : "#1a1a1a"}`,
                  borderRadius: "7px", transition: "all 0.3s", marginTop: "8px",
                }}>
                  <span style={{
                    fontSize: "12px", fontWeight: 600,
                    color: flowActive >= i ? layer.color : "#333",
                    transition: "all 0.3s",
                  }}>
                    {layer.label}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: "2rem", padding: "18px", background: "#111", borderRadius: "8px", border: "1px solid #1a1a1a" }}>
            <h3 style={{ fontSize: "12px", color: "#fff", margin: "0 0 14px", letterSpacing: "1px", textTransform: "uppercase" }}>
              Relations entre modèles (ForeignKey)
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              {[
                { from: "Patient", to: "Consultation", color: "#3B82F6" },
                { from: "Patient", to: "SignesVitaux", color: "#8B5CF6" },
                { from: "Patient", to: "Alerte", color: "#EF4444" },
                { from: "Patient", to: "RendezVous", color: "#10B981" },
              ].map(rel => (
                <div key={rel.to} style={{
                  padding: "9px 12px", background: "#0A0A0A",
                  borderRadius: "5px", border: `1px solid ${rel.color}33`,
                  display: "flex", alignItems: "center", gap: "8px", fontSize: "11px",
                }}>
                  <span style={{ color: "#3B82F6", fontWeight: 700 }}>{rel.from}</span>
                  <span style={{ color: rel.color }}>1 → N</span>
                  <span style={{ color: rel.color, fontWeight: 700 }}>{rel.to}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: STACK ── */}
      {tab === "stack" && (
        <div style={{ padding: "2rem" }}>
          <h2 style={{ fontSize: "15px", color: "#fff", marginBottom: "1.5rem" }}>Stack technique complète</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}>
            {[
              { category: "Backend", icon: "🐍", color: "#10B981", items: ["Python 3.14", "Django 6.0", "Django REST Framework", "SimpleJWT", "drf-yasg (Swagger)", "SQLite → PostgreSQL"] },
              { category: "Frontend", icon: "⚛️", color: "#3B82F6", items: ["React 18", "TypeScript (TSX)", "Vite 8", "TailwindCSS", "Axios + intercepteurs", "React Router v6"] },
              { category: "Tests", icon: "🧪", color: "#EF4444", items: ["Django TestCase", "APIClient (DRF)", "9/9 tests passent", "Tests modèles", "Tests API CRUD", "Test auth 401/403"] },
              { category: "Outils", icon: "⚙️", color: "#F59E0B", items: ["Git + GitHub", "IntelliJ IDEA", "Swagger UI", "Django Admin", "venv Python", "npm + Node.js"] },
            ].map(cat => (
              <div key={cat.category} style={{
                padding: "18px", background: "#111",
                borderRadius: "8px", border: `1px solid ${cat.color}33`,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                  <span style={{ fontSize: "16px" }}>{cat.icon}</span>
                  <h3 style={{ margin: 0, fontSize: "11px", fontWeight: 700, color: cat.color, letterSpacing: "1px", textTransform: "uppercase" }}>
                    {cat.category}
                  </h3>
                </div>
                {cat.items.map(item => (
                  <div key={item} style={{ fontSize: "11px", color: "#777", display: "flex", alignItems: "center", gap: "8px", marginBottom: "5px" }}>
                    <span style={{ color: cat.color, fontSize: "7px" }}>▶</span>
                    {item}
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px", marginBottom: "14px" }}>
            {[
              { label: "Apps Django", value: "5", color: "#10B981" },
              { label: "Endpoints", value: "35+", color: "#3B82F6" },
              { label: "Tests", value: "9/9", color: "#EF4444" },
              { label: "Pages React", value: "3", color: "#8B5CF6" },
            ].map(stat => (
              <div key={stat.label} style={{
                padding: "14px", background: "#111",
                borderRadius: "7px", border: `1px solid ${stat.color}33`, textAlign: "center",
              }}>
                <div style={{ fontSize: "26px", fontWeight: 700, color: stat.color }}>{stat.value}</div>
                <div style={{ fontSize: "10px", color: "#555", marginTop: "3px" }}>{stat.label}</div>
              </div>
            ))}
          </div>

          <div style={{
            padding: "16px 18px", background: "#0D2818",
            border: "1px solid #166534", borderRadius: "7px",
          }}>
            <p style={{ margin: "0 0 6px", fontSize: "10px", color: "#4ADE80", letterSpacing: "1px", textTransform: "uppercase" }}>
              💼 À mettre sur ton CV
            </p>
            <p style={{ margin: 0, fontSize: "12px", color: "#86EFAC", lineHeight: 1.7 }}>
              "Développement d'une plateforme healthtech fullstack — API REST Django (JWT, Swagger, 9 tests unitaires)
              + dashboard React/TypeScript connecté en temps réel, 5 modules métier (patients, consultations,
              signes vitaux, alertes, rendez-vous), déployé sur Railway"
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
