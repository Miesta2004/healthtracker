// ─── Source unique de données pour tout le présentateur ──────────────────────
// Avant, ces infos étaient dupliquées (et parfois contradictoires : "5 apps"
// ici, "9 apps" là) entre HealthTrackerDoc, GuideTechnique et
// HealthTrackerJourney. Un seul endroit maintenant, avec les vrais chiffres
// du projet (comptés dans le repo / vus dans seed.py, pas inventés).

export type RoleId = 'admin' | 'medecin' | 'infirmier' | 'secretaire' | 'laborantin'

export const ROLES: { id: RoleId; label: string; color: string }[] = [
    { id: 'admin',      label: 'Chef de service (admin)', color: '#6fd7c4' },
    { id: 'medecin',    label: 'Médecin',                 color: '#6fb4d7' },
    { id: 'infirmier',  label: 'Infirmier(ère)',           color: '#8fd76f' },
    { id: 'secretaire', label: 'Secrétaire',               color: '#a78bd6' },
    { id: 'laborantin', label: 'Laborantin',               color: '#e8a33d' },
]

export const MODULES = [
    { icon: '👤', title: 'Patients', desc: 'Dossiers médicaux complets avec historique.', roles: ['admin', 'medecin', 'secretaire'] as RoleId[] },
    { icon: '🩺', title: 'Consultations', desc: 'Motif, diagnostic, ordonnance, statut planifiée → terminée.', roles: ['admin', 'medecin'] as RoleId[] },
    { icon: '📊', title: 'Signes vitaux', desc: 'Tension, glycémie, température — alerte si hors norme.', roles: ['admin', 'medecin', 'infirmier'] as RoleId[] },
    { icon: '🧪', title: 'Laboratoire', desc: "12 types d'analyses, workflow attente → en cours → terminée.", roles: ['admin', 'medecin', 'laborantin'] as RoleId[] },
    { icon: '🚨', title: 'Urgences', desc: '5 niveaux de triage (CTAS), passages en temps réel.', roles: ['admin', 'medecin', 'infirmier'] as RoleId[] },
    { icon: '🏥', title: 'Hospitalisations', desc: 'Chambre, lit, service, médecin traitant, statut de séjour.', roles: ['admin', 'medecin', 'secretaire'] as RoleId[] },
    { icon: '📅', title: 'Rendez-vous', desc: 'Planification par médecin, créneaux, statuts de suivi.', roles: ['admin', 'medecin', 'infirmier', 'secretaire'] as RoleId[] },
    { icon: '🗓️', title: 'Disponibilités', desc: 'Planning hebdo par employé + congés/absences validés par le chef de service.', roles: ['admin', 'medecin', 'infirmier', 'secretaire', 'laborantin'] as RoleId[] },
    { icon: '👥', title: 'Équipe & rôles', desc: 'Un chef de service gère son service ; le superuser gère tout l\u2019hôpital.', roles: ['admin'] as RoleId[] },
    { icon: '🏗️', title: 'Services', desc: "Organisation de l'établissement, stats par service en temps réel.", roles: ['admin'] as RoleId[] },
]

export const STACK = [
    { cat: 'Backend',  color: '#6fd7c4', items: ['Python 3.14 + Django 6', 'Django REST Framework', 'JWT (SimpleJWT)', 'Swagger (drf-yasg)', '11 apps métier'] },
    { cat: 'Frontend', color: '#6fb4d7', items: ['React 18 + TypeScript', 'Vite', 'Axios + intercepteurs', 'React Router v6', 'Lucide React'] },
    { cat: 'Données',  color: '#a78bd6', items: ['PostgreSQL', 'Migrations Django', 'Seed réaliste', 'Photos via Storage'] },
    { cat: 'Fiabilité',color: '#8fd76f', items: ['92 tests unitaires', 'TestCase + APIClient', 'Tests permissions par rôle', 'CI-ready'] },
]

// Vrais chiffres — comptés dans le repo (apps, pages) ou lus depuis un seed
// réel (python manage.py seed_db), pas des placeholders.
export const STATS = [
    { value: '11',   label: 'Apps Django',        color: '#6fd7c4' },
    { value: '19',   label: 'Pages React',        color: '#6fb4d7' },
    { value: '92',   label: 'Tests unitaires',    color: '#8fd76f' },
    { value: '5',    label: 'Rôles métier',       color: '#a78bd6' },
    { value: '80',   label: 'Patients (seed)',    color: '#e8a33d' },
    { value: '45',   label: 'Employés (seed)',    color: '#e8836b' },
    { value: '12',   label: 'Services (seed)',    color: '#6fd7c4' },
    { value: '1223', label: 'Signes vitaux (seed)', color: '#6fb4d7' },
    { value: '343',  label: 'Consultations (seed)', color: '#8fd76f' },
    { value: '150',  label: 'Passages urgences (seed)', color: '#a78bd6' },
]

export const ROADMAP = [
    'App mobile React Native pour les patients',
    'Module facturation / comptabilité',
    'Déploiement (backend + frontend)',
    'Module IA — prédiction de risques patients',
    'Notifications push en temps réel',
]

// Parcours de dev — volontairement compact : le détail technique (JWT,
// permissions, tests, routes) est déjà couvert en profondeur plus haut dans
// le présentateur, donc chaque étape ne montre que ce qui est VRAIMENT
// unique à cette phase (pas de re-explication).
export interface JourneyStep {
    phase: string
    title: string
    emoji: string
    color: string
    detail: string
    code?: string
}

export const JOURNEY: JourneyStep[] = [
    {
        phase: 'Phase 1', title: 'Setup Django', emoji: '⚙️', color: '#6fd7c4',
        detail: "Environnement virtuel Python, Django, DRF, SimpleJWT et drf-yasg pour la doc Swagger automatique.",
        code: `python3 -m venv venv && source venv/bin/activate
pip install django djangorestframework
pip install djangorestframework-simplejwt drf-yasg
django-admin startproject healthtracker .`,
    },
    {
        phase: 'Phase 1', title: 'Modèles & migrations', emoji: '🗃️', color: '#6fb4d7',
        detail: "11 apps métier, chacune avec son models.py — voir la section Architecture ci-dessus pour le détail.",
    },
    {
        phase: 'Phase 1', title: 'Auth JWT', emoji: '🔐', color: '#e8a33d',
        detail: "Login → token access/refresh — voir la section Authentification JWT ci-dessus pour le détail complet.",
    },
    {
        phase: 'Phase 2', title: 'API REST + Swagger', emoji: '📚', color: '#8fd76f',
        detail: "drf-yasg génère une interface interactive à partir du code, sans rien documenter à la main.",
        code: `path('api/docs/', schema_view.with_ui('swagger'))
# → http://127.0.0.1:8000/api/docs/`,
    },
    {
        phase: 'Phase 2', title: '92 tests unitaires', emoji: '🧪', color: '#e8836b',
        detail: "Un test par comportement — voir la section Tests ci-dessus pour un run en direct.",
    },
    {
        phase: 'Phase 3', title: 'Frontend React connecté', emoji: '⚛️', color: '#a78bd6',
        detail: "Le token JWT est stocké et joint automatiquement à chaque requête via un intercepteur Axios.",
        code: `api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = \`Bearer \${token}\`
  return config
})`,
    },
]