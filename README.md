# 🏥 HealthTracker

Plateforme de gestion hospitalière — API REST Django sécurisée par JWT, couplée à un dashboard React/TypeScript avec accès par rôle.

Projet développé dans le cadre du Master IA & Big Data (Baobab Sénégal) pour mettre en pratique une architecture full-stack professionnelle : authentification, gestion des rôles, module urgences, hospitalisation, et interface utilisateur connectée.

---

## ✨ Fonctionnalités

- 🔐 **Authentification JWT** — login sécurisé avec access token / refresh token, rôles embarqués dans le token
- 👥 **Gestion des patients** — dossiers complets (état civil, groupe sanguin, allergies, antécédents, photo)
- 🏢 **Gestion des services** — 10 services hospitaliers, chef de service par service
- 👩‍⚕️ **Gestion des employés** — médecins, infirmiers, secrétaires, laborantins, administrateurs
- 🩺 **Consultations** — historique médical par patient, diagnostic, traitement
- 📊 **Signes vitaux** — suivi tension, température, poids, glycémie, fréquence cardiaque
- 🏨 **Hospitalisations** — suivi des admissions et sorties
- 🚨 **Module urgences** — passages aux urgences avec niveau de tri (1–5), mode d'arrivée, décision de sortie
- 🔬 **Analyses biologiques** — résultats de laboratoire par patient
- 🔔 **Alertes** — notifications automatiques liées aux patients
- 🔒 **Accès par rôle** — chaque profil (admin, médecin, infirmier, secrétaire, laborantin) a une vue filtrée
- 📚 **Documentation API interactive** — Swagger UI générée automatiquement

---

## 🛠️ Stack technique

**Backend**
- Python 3.12+ / Django 5
- Django REST Framework
- SimpleJWT (authentification)
- drf-yasg (documentation Swagger)
- PostgreSQL via Supabase (prod) / SQLite (dev)

**Frontend**
- React 18 + TypeScript
- Vite
- TailwindCSS
- Axios (avec intercepteur JWT automatique)
- React Router v6

**Outils**
- Git / GitHub
- Supabase (base de données PostgreSQL cloud)
- Variables d'environnement `.env`

---

## 🏗️ Architecture

```
Navigateur (React + TypeScript)
          ↓
    Axios + Bearer Token
          ↓
    Django urls.py
          ↓
    JWT Middleware
          ↓
    ViewSet (CRUD + filtres par rôle)
          ↓
    Serializer (JSON)
          ↓
    Model → PostgreSQL (Supabase)
```

**10 apps Django indépendantes :**
`patients` · `consultations` · `signes_vitaux` · `alertes` · `antecedents` · `analyses` · `hospitalisations` · `urgences` · `services` · `comptes`

---

## 📁 Structure du projet

```
healthtracker/
├── healthtracker/          # Config Django (settings, urls, api_urls)
├── comptes/                # Employés, rôles, authentification JWT
├── services/               # Services hospitaliers + chef de service
├── patients/               # Dossiers patients (accès filtré par rôle)
├── consultations/          # Consultations médicales
├── signes_vitaux/          # Suivi des constantes
├── antecedents/            # Antécédents médicaux
├── analyses/               # Résultats d'analyses biologiques
├── hospitalisations/       # Admissions et sorties
├── urgences/               # Passages aux urgences
├── alertes/                # Alertes automatiques
├── seed.py                 # Données de démonstration (60 patients, 34 employés)
└── frontend/
    └── src/
        ├── api/            # Clients Axios (auth, patients, comptes…)
        ├── components/     # NavBar, ProtectedRoute, Skeleton…
        ├── contexts/       # AuthContext (JWT + rôle)
        ├── pages/          # Login, Dashboard, PatientDetail, Urgences…
        └── types/          # Types TypeScript
```

---

## 🚀 Installation

### Prérequis

- Python 3.12+
- Node.js 18+
- Un projet Supabase (ou SQLite pour le dev local)

### Backend

```bash
git clone https://github.com/Miesta2004/healthtracker.git
cd healthtracker

python3 -m venv venv
source venv/bin/activate

pip install -r requirements.txt
```

Créer un fichier `.env` à la racine :

```env
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=your_password
DB_HOST=your_supabase_host
DB_PORT=5432
SECRET_KEY=your_django_secret_key
```

```bash
python3 manage.py migrate
python3 seed.py          # Données de démonstration
python3 manage.py runserver
```

API disponible sur `http://127.0.0.1:8000/`
Documentation Swagger sur `http://127.0.0.1:8000/api/docs/`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Application disponible sur `http://localhost:5173/`

---

## 🔑 Comptes de démonstration (après seed)

| Rôle | Exemple username | Mot de passe |
|---|---|---|
| Admin | `admin.kane` | `admin123` |
| Médecin | `dr.diop` · `dr.sow` · `dr.faye` … | `medecin123` |
| Infirmier(e) | `inf.ba` · `inf.sarr` · `inf.ndour` … | `infirmier123` |
| Secrétaire | `sec.diallo` · `sec.mbaye` … | `secretaire123` |
| Laborantin | `lab.thiam` · `lab.tall` · `lab.badji` | `labo123` |

---

## 🔗 Endpoints principaux

| Méthode | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/login/` | Connexion (obtenir les tokens) |
| POST | `/api/auth/refresh/` | Rafraîchir le token |
| GET | `/api/employes/me/` | Profil de l'employé connecté |
| GET / POST | `/api/patients/` | Liste / créer un patient |
| GET / PUT / DELETE | `/api/patients/{id}/` | Détail / modifier / supprimer |
| GET / POST | `/api/consultations/` | Gestion des consultations |
| GET / POST | `/api/signes_vitaux/` | Suivi des constantes |
| GET / POST | `/api/urgences/` | Passages aux urgences |
| GET / POST | `/api/hospitalisations/` | Hospitalisations |
| GET / POST | `/api/analyses/` | Analyses biologiques |
| GET / POST | `/api/services/` | Services hospitaliers |
| GET / POST | `/api/employes/` | Gestion des employés |

Toutes les routes (sauf `/api/auth/`) nécessitent un token JWT :
```
Authorization: Bearer <access_token>
```

---

## 🔒 Accès par rôle

| Fonctionnalité | Admin | Médecin | Infirmier | Secrétaire | Laborantin |
|---|:---:|:---:|:---:|:---:|:---:|
| Liste complète patients | ✅ | ✅ | ❌ | ✅ | ❌ |
| Recherche patients (son service) | ✅ | ✅ | ✅ | ✅ | ❌ |
| Créer / modifier un patient | ✅ | ✅ | ❌ | ✅ | ❌ |
| Consultations | ✅ | ✅ | 👁️ | ❌ | ❌ |
| Signes vitaux | ✅ | ✅ | ✅ | ❌ | ❌ |
| Hospitalisations | ✅ | ✅ | ❌ | ❌ | ❌ |
| Urgences | ✅ | ✅ | ✅ | ❌ | ❌ |
| Gestion employés / services | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## 📌 Roadmap

- [x] API REST complète avec authentification JWT
- [x] Gestion des rôles et accès filtrés
- [x] 10 services hospitaliers avec chef de service
- [x] Module urgences (niveaux de tri, modes d'arrivée, décisions de sortie)
- [x] Hospitalisations, analyses biologiques, antécédents
- [x] Dashboard React connecté en temps réel
- [x] Fiche patient détaillée
- [x] Seed complet (60 patients, 34 employés, tous les cas d'urgence)
- [x] Données hébergées sur Supabase (PostgreSQL)
- [ ] Graphiques d'évolution des signes vitaux
- [ ] Module de prédiction (scikit-learn)
- [ ] Déploiement (Railway / Render)
- [ ] Tests unitaires étendus

---

## 👤 Auteure

**Marietou Fall**
Étudiante en Master IA & Big Data — Baobab Sénégal, Dakar
