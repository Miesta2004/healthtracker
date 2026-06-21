# 🏥 HealthTracker

Plateforme de suivi des patients — API REST Django sécurisée par JWT, couplée à un dashboard React/TypeScript en temps réel.

Projet personnel développé pour appliquer une architecture full-stack professionnelle : authentification, tests automatisés, documentation API et interface utilisateur connectée.

---

## ✨ Fonctionnalités

- 🔐 **Authentification JWT** — login sécurisé avec access token / refresh token
- 👥 **Gestion des patients** — dossiers complets (état civil, groupe sanguin, allergies, antécédents)
- 🩺 **Consultations & rendez-vous** — historique médical par patient
- 📊 **Signes vitaux** — suivi tension, température, poids, glycémie, fréquence cardiaque
- 🔔 **Alertes** — notifications automatiques liées aux patients
- 📚 **Documentation API interactive** — Swagger UI générée automatiquement
- 🧪 **Tests unitaires** — suite de tests Django (modèles + API + authentification)
- ⚛️ **Dashboard React** — liste des patients, fiche détaillée, statistiques en direct

---

## 🛠️ Stack technique

**Backend**
- Python 3.14 + Django 6
- Django REST Framework
- SimpleJWT (authentification)
- drf-yasg (documentation Swagger)
- SQLite (dev) → PostgreSQL (prod)

**Frontend**
- React 18 + TypeScript
- Vite 8
- TailwindCSS
- Axios (avec intercepteur JWT automatique)
- React Router v6

**Outils**
- Git / GitHub
- Tests : Django TestCase + APIClient

---

## 🏗️ Architecture

```
Navigateur (React)
      ↓
  Axios + JWT Token
      ↓
  Django urls.py
      ↓
  JWT Middleware
      ↓
  ViewSet (CRUD)
      ↓
  Serializer (JSON)
      ↓
  Model → Base de données
```

5 apps Django indépendantes : `patients`, `consultations`, `signes_vitaux`, `alertes`, et leurs relations via `ForeignKey` (1 patient → N consultations / signes vitaux / alertes / rendez-vous).

---

## 📁 Structure du projet

```
healthtracker/
├── healthtracker/        # config Django (settings, urls)
├── patients/              # app patients (models, views, serializers, tests)
├── consultations/         # app consultations + rendez-vous
├── signes_vitaux/         # app signes vitaux
├── alertes/                # app alertes
├── frontend/               # app React/TypeScript
│   └── src/
│       ├── api/            # clients Axios (auth, patients)
│       ├── pages/           # Login, Dashboard, PatientDetail
│       └── types/            # types TypeScript
└── manage.py
```

---

## 🚀 Installation

### Backend

```bash
git clone https://github.com/Miesta2004/healthtracker.git
cd healthtracker

python3 -m venv venv
source venv/bin/activate

pip install -r requirements.txt

python3 manage.py migrate
python3 manage.py createsuperuser
python3 manage.py runserver
```

L'API est disponible sur `http://127.0.0.1:8000/`
La documentation Swagger sur `http://127.0.0.1:8000/api/docs/`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

L'application est disponible sur `http://localhost:5173/`

---

## 🔑 Endpoints principaux

| Méthode | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/login/` | Connexion (obtenir les tokens) |
| POST | `/api/auth/refresh/` | Rafraîchir le token |
| GET / POST | `/api/patients/` | Liste / créer un patient |
| GET / PUT / DELETE | `/api/patients/{id}/` | Détail / modifier / supprimer |
| GET / POST | `/api/consultations/` | Gestion des consultations |
| GET / POST | `/api/signes-vitaux/` | Gestion des signes vitaux |
| GET / POST | `/api/alertes/` | Gestion des alertes |
| GET / POST | `/api/rendez_vous/` | Gestion des rendez-vous |

Toutes les routes (sauf `/api/auth/`) nécessitent un token JWT valide dans le header :
```
Authorization: Bearer <access_token>
```

---

## 🧪 Tests

```bash
python3 manage.py test patients --verbosity=2
```

9 tests unitaires couvrant :
- Création et validation des modèles
- CRUD complet via l'API (create, list, retrieve, update, delete)
- Protection des routes par authentification JWT (401/403 sans token)

---

## 📌 Roadmap

- [x] API REST complète avec authentification JWT
- [x] Documentation Swagger
- [x] Tests unitaires
- [x] Dashboard React connecté en temps réel
- [x] Fiche patient détaillée
- [ ] Formulaire de création de patient depuis le frontend
- [ ] Graphiques d'évolution des signes vitaux
- [ ] Module de prédiction (scikit-learn)
- [ ] Déploiement (Railway / Render)

---

## 👤 Auteur

**Marietou Fall**
Développeuse Web Full-Stack Junior — Master IA & Big Data, Groupe ISM Dakar
