"""
seed.py — Données de démonstration HealthTracker (Supabase)
Génère un dataset complet : employés, patients sénégalais réalistes,
consultations, signes vitaux et alertes cohérents.
Usage : python3 seed.py
"""

import django, os, random
from decimal import Decimal

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'healthtracker.settings')
django.setup()

from django.utils import timezone
from django.contrib.auth.models import User
from datetime import timedelta, date
from patients.models import Patient
from consultations.models import Consultation, RendezVous
from signes_vitaux.models import SignesVitaux
from alertes.models import Alerte
from services.models import Service
from hospitalisations.models import Hospitalisation, StatutHospitalisation
from urgences.models import PassageUrgence, NiveauTri, ModeArrivee, StatutUrgence, DecisionSortie
from comptes.models import Employe

random.seed(42)

# ─── CONFIG ──────────────────────────────────────────────────────────────────
JOURS_HISTORIQUE = 90   # 3 mois de données
NB_PATIENTS      = 60
NB_MESURES_MIN   = 5    # mesures par patient (pas tous les jours, plus réaliste)
NB_MESURES_MAX   = 20

# ─── NETTOYAGE ───────────────────────────────────────────────────────────────
print("🗑️  Nettoyage des anciennes données...")

for Model, label in [
    (PassageUrgence, "passage(s) aux urgences"),
    (Hospitalisation, "hospitalisation(s)"),
    (Alerte,      "alerte(s)"),
    (RendezVous,  "rendez-vous"),
    (Consultation,"consultation(s)"),
    (SignesVitaux,"mesure(s) de signes vitaux"),
    (Patient,     "patient(s)"),
    (Employe,     "employé(s)"),
    (Service,     "service(s)"),
]:
    nb = Model.objects.count()
    if nb:
        Model.objects.all().delete()
        print(f"   - {nb} {label} supprimé(s)")

# Supprimer les users non-superuser créés par le seed précédent
users_suppr = User.objects.filter(is_superuser=False).delete()
print(f"   - {users_suppr[0]} user(s) Django supprimé(s)")
print("✅ Base nettoyée.\n")

# ─── DONNÉES SÉNÉGALAISES ────────────────────────────────────────────────────
# ─── SERVICES ────────────────────────────────────────────────────────────────
print("🏥 Création des services...")

SERVICES_DATA = [
    ("Cardiologie", "Prise en charge des pathologies cardiovasculaires"),
    ("Médecine générale", "Consultations de premier recours"),
    ("Pédiatrie", "Suivi médical des enfants et nourrissons"),
    ("Diabétologie", "Suivi des patients diabétiques et endocriniens"),
    ("Urgences", "Accueil et tri des urgences médicales"),
    ("Chirurgie générale", "Interventions chirurgicales et suivi post-opératoire"),
    ("Gynécologie-Obstétrique", "Suivi de grossesse et santé de la femme"),
    ("Neurologie", "Pathologies du système nerveux"),
    ("ORL", "Oto-rhino-laryngologie"),
    ("Laboratoire", "Analyses biologiques et examens de laboratoire"),
]

services_crees = {}
for nom, description in SERVICES_DATA:
    service = Service.objects.create(nom=nom, description=description, actif=True)
    services_crees[nom] = service

print(f"✅ {len(services_crees)} services créés.\n")

PRENOMS_F = [
    "Fatou", "Aïssatou", "Mariama", "Rokhaya", "Khady", "Ndèye",
    "Aminata", "Sokhna", "Coumba", "Astou", "Dieynaba", "Yaye",
    "Mame", "Binta", "Awa", "Soda", "Rama", "Seynabou", "Ndeye",
    "Oumou", "Adja", "Kiné", "Nabou", "Penda", "Salimata"
]
PRENOMS_M = [
    "Moussa", "Ibrahima", "Abdoulaye", "Cheikh", "Mamadou", "Oumar",
    "Modou", "Babacar", "Pape", "Serigne", "Aliou", "Seydou",
    "Lamine", "Assane", "Saliou", "Boubacar", "Idrissa", "Malick",
    "Tapha", "Djibril", "Issa", "Mame Diarra", "Fallou", "Demba"
]
NOMS = [
    "Diop", "Fall", "Ndiaye", "Sow", "Mbaye", "Sarr", "Faye",
    "Diallo", "Gueye", "Ndour", "Thiam", "Ba", "Diouf", "Kane",
    "Cissé", "Sy", "Tall", "Thiongane", "Badji", "Mendy",
    "Toure", "Camara", "Beye", "Lo", "Dème"
]
QUARTIERS = [
    "Plateau", "Médina", "Yoff", "Parcelles Assainies", "Grand Dakar",
    "Ouakam", "Liberté 6", "HLM", "Point E", "Mermoz", "Fann",
    "Sicap Baobab", "Guédiawaye", "Pikine", "Rufisque",
    "Thiès", "Saint-Louis", "Ziguinchor", "Touba", "Kaolack"
]
GROUPES_SANGUINS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
POIDS_GROUPES    = [0.45, 0.05, 0.10, 0.02, 0.03, 0.01, 0.30, 0.04]

ALLERGIES_POOL = [
    "Pénicilline", "Amoxicilline", "Aspirine", "Ibuprofène",
    "Sulfamides", "Codéine", "Latex", "Arachides",
    "Fruits de mer", "Pollen", "Acariens", "Iode"
]
ANTECEDENTS_POOL = [
    "Diabète type 2", "Hypertension artérielle", "Asthme",
    "Drépanocytose", "Paludisme chronique", "Hépatite B",
    "Insuffisance rénale chronique", "Epilepsie",
    "Coronaropathie", "Hypothyroïdie", "Tuberculose traitée",
    "Dépression", "VIH sous traitement", "Anémie chronique"
]
MOTIFS = [
    "Consultation de routine", "Fièvre et frissons", "Céphalées persistantes",
    "Douleurs abdominales", "Contrôle tension artérielle", "Suivi diabète",
    "Toux chronique", "Douleurs thoraciques", "Fatigue générale",
    "Contrôle glycémie", "Renouvellement ordonnance", "Douleurs articulaires",
    "Palpitations cardiaques", "Trouble du sommeil", "Perte de poids inexpliquée",
    "Suivi post-opératoire", "Vaccination adulte", "Bilan de santé annuel",
    "Douleurs lombaires", "Vertige et nausées"
]
MOTIFS_EXAMEN = [
    "Bilan sanguin de routine", "Échographie abdominale", "Radiographie thoracique",
    "Électrocardiogramme", "Glycémie à jeun", "Bilan lipidique",
    "Échographie cardiaque", "Scanner cérébral", "IRM lombaire",
    "Test d'effort cardiaque",
]
MOTIFS_OPERATION = [
    "Appendicectomie", "Cholécystectomie", "Hernie inguinale",
    "Césarienne", "Amygdalectomie", "Réduction de fracture",
    "Pose de plâtre", "Extraction dentaire chirurgicale",
]
SYMPTOMES_POOL = [
    "Fièvre, frissons et courbatures",
    "Douleur abdominale diffuse, sans vomissement",
    "Toux sèche persistante depuis plusieurs jours",
    "Céphalées frontales avec photophobie légère",
    "Fatigue généralisée et essoufflement à l'effort",
    "Douleurs articulaires migratrices",
    "Palpitations et sensation de malaise",
    "Aucun symptôme particulier — contrôle systématique",
]
EXAMENS_POOL = [
    "Bilan sanguin complet (NFS, ionogramme, glycémie)",
    "Échographie abdominale sans anomalie notable",
    "Radiographie pulmonaire — pas d'infiltrat visible",
    "Électrocardiogramme — rythme sinusal normal",
    "Tension artérielle et fréquence cardiaque mesurées",
    "Glycémie capillaire et bilan lipidique",
    "Aucun examen complémentaire réalisé",
]
DIAGNOSTICS = [
    "Paludisme simple — traitement Coartem prescrit",
    "Hypertension artérielle contrôlée — continuer traitement",
    "Gastro-entérite aiguë — réhydratation orale",
    "Infection urinaire — Amoxicilline 7 jours",
    "Anémie ferriprive — supplémentation en fer",
    "Diabète type 2 équilibré — continuer Metformine",
    "Bronchite aiguë — Azithromycine 5 jours",
    "Lombalgie mécanique — anti-inflammatoires et repos",
    "Rhinopharyngite virale — traitement symptomatique",
    "Crise d'asthme modérée — Salbutamol + corticoïdes",
    "Tension artérielle élevée — ajustement traitement",
    "Dermatose allergique — antihistaminiques",
    "Conjonctivite infectieuse — collyre antibiotique",
    "Entorse de cheville — bandage et RICE",
    "Bilan normal — aucune anomalie détectée"
]
ORDONNANCES = [
    "Coartem 20/120mg — 1 cp matin et soir pendant 3 jours",
    "Amlodipine 5mg — 1 cp/jour le matin",
    "SRO — 1 sachet dans 1L d'eau, boire régulièrement",
    "Amoxicilline 500mg — 1 cp 3x/jour pendant 7 jours",
    "Sulfate ferreux 200mg — 1 cp/jour pendant 3 mois",
    "Metformine 1000mg — 1 cp matin et soir",
    "Azithromycine 500mg — 1 cp/jour pendant 5 jours",
    "Ibuprofène 400mg — 1 cp 3x/jour avec repas",
    "Paracétamol 500mg — 2 cp toutes les 8h si fièvre",
    "Salbutamol 100μg — 2 bouffées en cas de crise",
    "Losartan 50mg — 1 cp/jour le soir",
    "Cétirizine 10mg — 1 cp/jour le soir",
    "Aucune ordonnance — conseil hygiéno-diététique"
]

# ─── PROFILS DE PATHOLOGIE ───────────────────────────────────────────────────
PROFILS = {
    "sain": {
        "ts": (115, 4), "td": (75, 3), "temp": (37.0, 0.3),
        "poids_min": 55, "poids_max": 80, "glyc": (5.0, 0.3), "fc": (68, 6),
        "alerte_chance": 0.02
    },
    "hypertendu": {
        "ts": (155, 8), "td": (95, 5), "temp": (37.0, 0.3),
        "poids_min": 70, "poids_max": 100, "glyc": (5.5, 0.4), "fc": (78, 8),
        "alerte_chance": 0.15
    },
    "diabetique": {
        "ts": (130, 6), "td": (82, 4), "temp": (37.1, 0.3),
        "poids_min": 65, "poids_max": 95, "glyc": (8.5, 1.2), "fc": (75, 7),
        "alerte_chance": 0.20
    },
    "drepanocytaire": {
        "ts": (110, 5), "td": (68, 4), "temp": (37.3, 0.5),
        "poids_min": 45, "poids_max": 65, "glyc": (4.8, 0.3), "fc": (88, 10),
        "alerte_chance": 0.25
    },
    "senior": {
        "ts": (145, 10), "td": (88, 6), "temp": (36.8, 0.3),
        "poids_min": 55, "poids_max": 85, "glyc": (6.2, 0.8), "fc": (72, 8),
        "alerte_chance": 0.12
    },
}

def choisir_profil(age, antecedents):
    if "Drépanocytose" in antecedents:
        return "drepanocytaire"
    if "Diabète" in antecedents and "Hypertension" in antecedents:
        return "diabetique" if random.random() > 0.5 else "hypertendu"
    if "Diabète" in antecedents:
        return "diabetique"
    if "Hypertension" in antecedents:
        return "hypertendu"
    if age > 60:
        return "senior"
    return "sain"

def varier(val, ecart, mini=None, maxi=None):
    result = val + random.gauss(0, ecart)
    if mini is not None: result = max(result, mini)
    if maxi is not None: result = min(result, maxi)
    return result

def tel():
    return f"+221 7{random.randint(0,9)} {random.randint(100,999)} {random.randint(10,99)} {random.randint(10,99)}"

now = timezone.now()

# ─── EMPLOYÉS ────────────────────────────────────────────────────────────────
print("👔 Création des employés...")

EMPLOYES_DATA = [
    # (prenom, nom, sexe, role, specialite, username, email, password, age, service_nom)
    ("Mamadou", "Kane", "M", "admin", "", "admin.kane", "kane@healthtracker.sn", "admin123", 45, None),

    # Cardiologie
    ("Aminata",   "Diop",   "F", "medecin",    "Cardiologie",          "dr.diop",       "diop@healthtracker.sn",       "medecin123", 42, "Cardiologie"),
    ("Modou",     "Sy",     "M", "medecin",    "Cardiologie",          "dr.sy",         "sy@healthtracker.sn",         "medecin123", 49, "Cardiologie"),
    ("Ndèye",     "Ba",     "F", "infirmier",  "",                     "inf.ba",        "ba@healthtracker.sn",         "infirmier123", 29, "Cardiologie"),
    ("Mariama",   "Mbaye",  "F", "secretaire", "",                     "sec.mbaye",     "mbaye@healthtracker.sn",      "secretaire123", 26, "Cardiologie"),

    # Médecine générale
    ("Ibrahima",  "Sow",    "M", "medecin",    "Médecine générale",    "dr.sow",        "sow@healthtracker.sn",        "medecin123", 38, "Médecine générale"),
    ("Khady",     "Faye",   "F", "medecin",    "Médecine générale",    "dr.faye",       "faye@healthtracker.sn",       "medecin123", 41, "Médecine générale"),
    ("Cheikh",    "Sarr",   "M", "infirmier",  "",                     "inf.sarr",      "sarr@healthtracker.sn",       "infirmier123", 33, "Médecine générale"),
    ("Abdoulaye", "Diallo", "M", "secretaire", "",                     "sec.diallo",    "diallo@healthtracker.sn",     "secretaire123", 31, "Médecine générale"),

    # Pédiatrie
    ("Fatou",     "Ndiaye", "F", "medecin",    "Pédiatrie",            "dr.ndiaye",     "ndiaye@healthtracker.sn",     "medecin123", 35, "Pédiatrie"),
    ("Babacar",   "Cissé",  "M", "medecin",    "Pédiatrie",            "dr.cisse",      "cisse@healthtracker.sn",      "medecin123", 39, "Pédiatrie"),
    ("Awa",       "Ndour",  "F", "infirmier",  "",                     "inf.ndour",     "ndour@healthtracker.sn",      "infirmier123", 28, "Pédiatrie"),
    ("Seydou",    "Kane",   "M", "secretaire", "",                     "sec.kane",      "skane@healthtracker.sn",      "secretaire123", 30, "Pédiatrie"),

    # Diabétologie
    ("Moussa",    "Fall",   "M", "medecin",    "Diabétologie",         "dr.fall",       "fall@healthtracker.sn",       "medecin123", 50, "Diabétologie"),
    ("Coumba",    "Thiam",  "F", "medecin",    "Diabétologie",         "dr.thiam",      "drthiam@healthtracker.sn",    "medecin123", 44, "Diabétologie"),
    ("Astou",     "Sarr",   "F", "infirmier",  "",                     "inf.asarr",     "asarr@healthtracker.sn",      "infirmier123", 31, "Diabétologie"),

    # Urgences
    ("Rokhaya",   "Gueye",  "F", "infirmier",  "",                     "inf.gueye",     "gueye@healthtracker.sn",      "infirmier123", 27, "Urgences"),
    ("Demba",     "Toure",  "M", "infirmier",  "",                     "inf.toure",     "toure@healthtracker.sn",      "infirmier123", 34, "Urgences"),
    ("Pape",      "Diouf",  "M", "medecin",    "Médecine d'urgence",   "dr.diouf",      "diouf@healthtracker.sn",      "medecin123", 40, "Urgences"),
    ("Adja",      "Camara", "F", "medecin",    "Médecine d'urgence",   "dr.camara",     "camara@healthtracker.sn",     "medecin123", 37, "Urgences"),
    ("Issa",      "Beye",   "M", "secretaire", "",                     "sec.beye",      "beye@healthtracker.sn",       "secretaire123", 25, "Urgences"),

    # Chirurgie générale
    ("Aliou",     "Mendy",  "M", "medecin",    "Chirurgie générale",   "dr.mendy",      "mendy@healthtracker.sn",      "medecin123", 47, "Chirurgie générale"),
    ("Soda",      "Lo",     "F", "medecin",    "Chirurgie générale",   "dr.lo",         "lo@healthtracker.sn",         "medecin123", 43, "Chirurgie générale"),
    ("Malick",    "Dème",   "M", "infirmier",  "",                     "inf.deme",      "deme@healthtracker.sn",       "infirmier123", 32, "Chirurgie générale"),

    # Gynécologie-Obstétrique
    ("Kiné",      "Ndiaye", "F", "medecin",    "Gynécologie-Obstétrique", "dr.kndiaye", "kndiaye@healthtracker.sn",    "medecin123", 46, "Gynécologie-Obstétrique"),
    ("Nabou",     "Diallo", "F", "infirmier",  "",                     "inf.nabou",     "nabou@healthtracker.sn",      "infirmier123", 30, "Gynécologie-Obstétrique"),
    ("Saliou",    "Ba",     "M", "secretaire", "",                     "sec.saliou",    "saliou@healthtracker.sn",     "secretaire123", 28, "Gynécologie-Obstétrique"),

    # Neurologie
    ("Idrissa",   "Sy",     "M", "medecin",    "Neurologie",           "dr.isy",        "isy@healthtracker.sn",        "medecin123", 48, "Neurologie"),
    ("Penda",     "Fall",   "F", "infirmier",  "",                     "inf.penda",     "penda@healthtracker.sn",      "infirmier123", 29, "Neurologie"),

    # ORL
    ("Lamine",    "Gueye",  "M", "medecin",    "ORL",                  "dr.lgueye",     "lgueye@healthtracker.sn",     "medecin123", 36, "ORL"),
    ("Salimata",  "Sow",    "F", "infirmier",  "",                     "inf.salimata",  "salimata@healthtracker.sn",   "infirmier123", 27, "ORL"),

    # Laboratoire
    ("Oumar",     "Thiam",  "M", "laborantin", "Biologie médicale",    "lab.thiam",     "thiam@healthtracker.sn",      "labo123", 36, "Laboratoire"),
    ("Djibril",   "Tall",   "M", "laborantin", "Biochimie",            "lab.tall",      "tall@healthtracker.sn",       "labo123", 34, "Laboratoire"),
    ("Oumou",     "Badji",  "F", "laborantin", "Hématologie",          "lab.badji",     "badji@healthtracker.sn",      "labo123", 32, "Laboratoire"),
]

employes_crees = []
for prenom, nom, sexe, role, specialite, username, email, password, age, service_nom in EMPLOYES_DATA:
    annee = date.today().year - age
    date_naiss = date(annee, random.randint(1,12), random.randint(1,28))

    if User.objects.filter(username=username).exists():
        print(f"   ⚠️  User '{username}' existe déjà — ignoré")
        continue

    user = User.objects.create_user(
        username=username,
        email=email,
        password=password,
        first_name=prenom,
        last_name=nom,
        is_staff=(role == 'admin'),
    )
    emp = Employe.objects.create(
        user=user,
        nom=nom,
        prenom=prenom,
        date_naissance=date_naiss,
        sexe=sexe,
        telephone=tel(),
        adresse=f"{random.choice(QUARTIERS)}, Dakar",
        role=role,
        specialite=specialite,
        service=services_crees.get(service_nom) if service_nom else None,
    )
    employes_crees.append(emp)

print(f"✅ {len(employes_crees)} employés créés.")
print()

# ─── CHEFS DE SERVICE ──────────────────────────────────────────────────────
print("🩺 Attribution des chefs de service...")
nb_chefs = 0
for nom_service, service_obj in services_crees.items():
    medecins_du_service = [e for e in employes_crees if e.role == 'medecin' and e.service_id == service_obj.id]
    if medecins_du_service:
        chef = medecins_du_service[0]  # le premier médecin du service devient chef
        service_obj.chef_de_service = chef
        service_obj.save()
        nb_chefs += 1
        print(f"   - {service_obj.nom} → Dr {chef.prenom} {chef.nom}")
print(f"✅ {nb_chefs} chef(s) de service attribué(s).\n")

# Afficher le tableau de connexion
print("┌─────────────────────────────────────────────────────────────────────┐")
print("│                  COMPTES DE DÉMONSTRATION                           │ ")
print("├──────────────────┬───────────────────────────┬──────────────────────┤")
print("│ Rôle             │ Username                  │ Mot de passe         │")
print("├──────────────────┼───────────────────────────┼──────────────────────┤")
credentials = [
    ("Admin",       "admin.kane",                    "admin123"),
    ("Médecin",     "dr.diop / dr.sow / dr.faye...",  "medecin123"),
    ("Infirmier(e)","inf.ba / inf.sarr / inf.ndour..","infirmier123"),
    ("Secrétaire",  "sec.diallo / sec.mbaye...",      "secretaire123"),
    ("Laborantin",  "lab.thiam / lab.tall / lab.badji","labo123"),
]
for role_label, username_str, pwd in credentials:
    print(f"│ {role_label:<16}│ {username_str:<20}        │ {pwd:<17}            │")
print("└──────────────────┴───────────────────────────┴──────────────────────┘")
print()

# ─── PATIENTS ────────────────────────────────────────────────────────────────
print(f"👤 Création de {NB_PATIENTS} patients...")
patients_crees = []

for i in range(NB_PATIENTS):
    sexe   = random.choice(['M', 'F'])
    prenom = random.choice(PRENOMS_M if sexe == 'M' else PRENOMS_F)
    nom    = random.choice(NOMS)
    age    = random.randint(18, 80)

    annee_naissance = date.today().year - age
    date_naissance  = date(annee_naissance, random.randint(1,12), random.randint(1,28))

    groupe = random.choices(GROUPES_SANGUINS, weights=POIDS_GROUPES)[0]

    nb_allergies   = random.choices([0, 1, 2], weights=[0.60, 0.30, 0.10])[0]
    allergies      = ", ".join(random.sample(ALLERGIES_POOL, nb_allergies)) if nb_allergies else ""

    nb_antecedents  = random.choices([0, 1, 2, 3], weights=[0.40, 0.35, 0.20, 0.05])[0]
    antecedents_list = random.sample(ANTECEDENTS_POOL, nb_antecedents)
    antecedents     = ", ".join(antecedents_list) if antecedents_list else ""

    # Assignation service + médecin référent (cohérents entre eux)
    medecins_dispo = [e for e in employes_crees if e.role == 'medecin']
    medecin_ref    = random.choice(medecins_dispo) if medecins_dispo else None
    service_patient = medecin_ref.service if medecin_ref else random.choice(list(services_crees.values()))

    patient = Patient.objects.create(
        nom=nom,
        prenom=prenom,
        date_naissance=date_naissance,
        sexe=sexe,
        groupe_sanguin=groupe,
        telephone=tel(),
        adresse=f"{random.choice(QUARTIERS)}, Dakar",
        allergies=allergies,
        antecedents=antecedents,
        actif=random.random() > 0.05,
        service=service_patient,
        medecin_referent=medecin_ref,
    )
    patients_crees.append((patient, age, antecedents_list))

print(f"✅ {len(patients_crees)} patients créés.\n")

# ─── SIGNES VITAUX ───────────────────────────────────────────────────────────
print(f"📊 Création des signes vitaux (mesures ponctuelles, plus réaliste)...")
total_sv      = 0
alertes_data  = []  # liste de (patient, type, message)

for patient, age, antecedents_list in patients_crees:
    antecedents_str = ", ".join(antecedents_list)
    profil     = PROFILS[choisir_profil(age, antecedents_str)]

    poids_base     = random.uniform(profil["poids_min"], profil["poids_max"])
    tendance_poids = random.uniform(-0.02, 0.02)

    # Nombre de mesures aléatoire (tous les jours serait irréaliste)
    nb_mesures = random.randint(NB_MESURES_MIN, NB_MESURES_MAX)
    jours_mesures = sorted(random.sample(range(0, JOURS_HISTORIQUE + 1), nb_mesures))

    for jour in jours_mesures:
        date_mesure = now - timedelta(days=(JOURS_HISTORIQUE - jour))
        poids_jour  = poids_base + (tendance_poids * jour)

        ts   = int(varier(profil["ts"][0],   profil["ts"][1],   80,  200))
        td   = int(varier(profil["td"][0],   profil["td"][1],   50,  130))
        temp = round(varier(profil["temp"][0], profil["temp"][1], 35.5, 41.0), 1)
        poids = round(varier(poids_jour, 0.3, 30, 150), 1)
        glyc  = round(varier(profil["glyc"][0], profil["glyc"][1], 2.0, 25.0), 2)
        fc    = int(varier(profil["fc"][0],  profil["fc"][1],  40,  130))

        # Épisode aigu ponctuel (maladie, stress)
        if random.random() < 0.05:
            temp = round(min(temp + random.uniform(0.8, 2.5), 41.0), 1)
            fc   = min(fc + random.randint(10, 25), 130)

        SignesVitaux.objects.create(
            patient=patient,
            date=date_mesure,
            tension_systolique=ts,
            tension_diastolique=td,
            temperature=Decimal(str(temp)),
            poids=Decimal(str(poids)),
            glycemie=Decimal(str(min(glyc, 25.0))),
            frequence_cardiaque=fc,
        )
        total_sv += 1

        # Détecter les anomalies → alertes
        if ts > 180 or td > 110:
            alertes_data.append((patient, "tension", f"Tension critique : {ts}/{td} mmHg"))
        elif ts > 160 and random.random() < profil["alerte_chance"]:
            alertes_data.append((patient, "tension", f"Tension élevée : {ts}/{td} mmHg"))
        if glyc > 15.0:
            alertes_data.append((patient, "glycemie", f"Hyperglycémie sévère : {glyc:.2f} g/L"))
        elif glyc > 11.0 and random.random() < profil["alerte_chance"]:
            alertes_data.append((patient, "glycemie", f"Glycémie élevée : {glyc:.2f} g/L"))
        if temp > 39.5:
            alertes_data.append((patient, "temperature", f"Fièvre élevée : {temp}°C"))
        if fc > 110:
            alertes_data.append((patient, "frequence", f"Tachycardie : {fc} bpm"))

print(f"✅ {total_sv} mesures créées.\n")

# ─── ALERTES ─────────────────────────────────────────────────────────────────
print("🚨 Création des alertes...")
alertes_crees = 0

# Regrouper par patient, garder max 3 alertes par patient
from collections import defaultdict
alertes_par_patient = defaultdict(list)
for patient, type_alerte, message in alertes_data:
    alertes_par_patient[patient.id].append((patient, type_alerte, message))

for patient_id, items in alertes_par_patient.items():
    for patient, type_alerte, message in items[-3:]:
        Alerte.objects.create(
            patient=patient,
            type=type_alerte,
            message=message,
            statut=random.choice(['non_lue', 'non_lue', 'lue', 'traitee']),
        )
        alertes_crees += 1

print(f"✅ {alertes_crees} alertes créées.\n")

# ─── HOSPITALISATIONS ────────────────────────────────────────────────────────
print("🛏️  Création des hospitalisations...")
total_hosp = 0

medecins_crees = [e for e in employes_crees if e.role == 'medecin']
service_urgences = services_crees.get("Urgences")

CHAMBRES = [f"{lettre}{num}" for lettre in "ABC" for num in range(1, 8)]
LITS = ["1", "2"]

MOTIFS_ADMISSION = [
    "Décompensation cardiaque", "Crise hyperglycémique sévère",
    "Pneumopathie aiguë", "Post-opératoire chirurgie digestive",
    "AVC ischémique", "Insuffisance rénale aiguë",
    "Sepsis sévère", "Fracture nécessitant immobilisation prolongée",
]

# ~20% des patients ont une hospitalisation (en cours ou terminée)
for patient, age, antecedents_list in random.sample(patients_crees, k=max(1, NB_PATIENTS // 5)):
    medecin = random.choice(medecins_crees) if medecins_crees else None
    service_hosp = medecin.service if medecin else random.choice(list(services_crees.values()))

    jours_ecoules = random.randint(0, JOURS_HISTORIQUE)
    date_admission = now - timedelta(days=jours_ecoules)
    est_terminee = jours_ecoules > random.randint(2, 10)

    hosp = Hospitalisation.objects.create(
        patient=patient,
        service=service_hosp,
        medecin_responsable=medecin,
        chambre=random.choice(CHAMBRES),
        lit=random.choice(LITS),
        motif_admission=random.choice(MOTIFS_ADMISSION),
        diagnostic_entree=random.choice(DIAGNOSTICS),
        date_admission=date_admission,
        statut=StatutHospitalisation.TERMINEE if est_terminee else StatutHospitalisation.EN_COURS,
    )
    if est_terminee:
        duree = random.randint(2, 14)
        hosp.date_sortie = date_admission + timedelta(days=duree)
        hosp.diagnostic_sortie = random.choice(DIAGNOSTICS)
        hosp.save()
    total_hosp += 1

print(f"✅ {total_hosp} hospitalisations créées.\n")

# ─── URGENCES ────────────────────────────────────────────────────────────────
print("🚑 Création des passages aux urgences...")
total_urgences = 0

infirmiers_crees = [e for e in employes_crees if e.role == 'infirmier']

MOTIFS_URGENCE = [
    "Douleur thoracique aiguë", "Traumatisme suite à accident",
    "Fièvre élevée chez l'enfant", "Crise d'asthme sévère",
    "Plaie nécessitant suture", "Malaise avec perte de connaissance",
    "Brûlure du second degré", "Douleur abdominale intense",
    "Arrêt cardio-respiratoire", "Accident de la voie publique",
    "Intoxication médicamenteuse", "Crise convulsive",
    "Hémorragie importante", "Choc anaphylactique",
]

def creer_passage_urgence(patient, niveau_tri, mode_arrivee, statut_choisi, decision=None, jours_max=30):
    """Crée un passage aux urgences avec des paramètres précis (utilisé pour garantir tous les cas)."""
    infirmier = random.choice(infirmiers_crees) if infirmiers_crees else None
    medecin   = random.choice(medecins_crees) if medecins_crees else None

    jours_ecoules = random.randint(0, jours_max)
    date_arrivee  = now - timedelta(days=jours_ecoules, hours=random.randint(0, 23))

    passage = PassageUrgence.objects.create(
        patient=patient,
        service=service_urgences,
        infirmier_accueil=infirmier,
        medecin_examinateur=medecin if statut_choisi != StatutUrgence.EN_ATTENTE else None,
        date_arrivee=date_arrivee,
        mode_arrivee=mode_arrivee,
        niveau_tri=niveau_tri,
        motif=random.choice(MOTIFS_URGENCE),
        statut=statut_choisi,
    )

    if statut_choisi == StatutUrgence.SORTI:
        passage.diagnostic = random.choice(DIAGNOSTICS)
        passage.decision = decision or DecisionSortie.DOMICILE
        passage.date_sortie = date_arrivee + timedelta(hours=random.randint(1, 8))
        passage.statut = StatutUrgence.SORTI
        passage.save()

    return passage

# Pool de patients disponibles pour les urgences (on en utilise davantage pour couvrir tous les cas)
nb_patients_urgences = max(20, NB_PATIENTS // 2)
patients_urgences = random.sample(patients_crees, k=min(nb_patients_urgences, len(patients_crees)))
pool_patients_urgences = iter([p for p, age, ant in patients_urgences])

def patient_suivant():
    return next(pool_patients_urgences)

# 1) Garantir chaque niveau de tri (1 à 5) au moins une fois
for niveau in [NiveauTri.NIVEAU_1, NiveauTri.NIVEAU_2, NiveauTri.NIVEAU_3, NiveauTri.NIVEAU_4, NiveauTri.NIVEAU_5]:
    creer_passage_urgence(
        patient_suivant(), niveau,
        random.choice(list(ModeArrivee)),
        StatutUrgence.SORTI,
        random.choice(list(DecisionSortie)),
    )
    total_urgences += 1

# 2) Garantir chaque mode d'arrivée au moins une fois
for mode in [ModeArrivee.PIED, ModeArrivee.AMBULANCE, ModeArrivee.POLICE, ModeArrivee.TRANSFERT, ModeArrivee.AUTRE]:
    creer_passage_urgence(
        patient_suivant(), random.choice([1, 2, 3, 4, 5]),
        mode, StatutUrgence.SORTI, random.choice(list(DecisionSortie)),
    )
    total_urgences += 1

# 3) Garantir chaque décision de sortie au moins une fois (y compris décès, cas le plus rare)
for decision in [DecisionSortie.DOMICILE, DecisionSortie.HOSPITALISATION, DecisionSortie.TRANSFERT,
                 DecisionSortie.PARTI_SANS_ATTENDRE, DecisionSortie.DECES]:
    niveau = NiveauTri.NIVEAU_1 if decision == DecisionSortie.DECES else random.choice([1, 2, 3, 4, 5])
    creer_passage_urgence(
        patient_suivant(), niveau, random.choice(list(ModeArrivee)),
        StatutUrgence.SORTI, decision,
    )
    total_urgences += 1

# 4) Garantir les statuts "en cours" (patients toujours présents aux urgences)
creer_passage_urgence(patient_suivant(), random.choice([1, 2, 3]), random.choice(list(ModeArrivee)), StatutUrgence.EN_ATTENTE, jours_max=1)
total_urgences += 1
creer_passage_urgence(patient_suivant(), random.choice([1, 2, 3]), random.choice(list(ModeArrivee)), StatutUrgence.EN_CONSULTATION, jours_max=1)
total_urgences += 1

# 5) Compléter avec des passages aléatoires pour les patients restants (distribution réaliste)
for patient in pool_patients_urgences:
    statut_choisi = random.choices(
        [StatutUrgence.EN_ATTENTE, StatutUrgence.EN_CONSULTATION, StatutUrgence.SORTI],
        weights=[0.10, 0.10, 0.80]
    )[0]
    decision = None
    if statut_choisi == StatutUrgence.SORTI:
        decision = random.choices(
            [DecisionSortie.DOMICILE, DecisionSortie.HOSPITALISATION, DecisionSortie.TRANSFERT,
             DecisionSortie.PARTI_SANS_ATTENDRE, DecisionSortie.DECES],
            weights=[0.65, 0.15, 0.05, 0.10, 0.05]
        )[0]
    creer_passage_urgence(
        patient,
        random.choices([1, 2, 3, 4, 5], weights=[0.05, 0.15, 0.35, 0.30, 0.15])[0],
        random.choices(list(ModeArrivee), weights=[0.50, 0.30, 0.05, 0.10, 0.05])[0],
        statut_choisi, decision,
    )
    total_urgences += 1

print(f"✅ {total_urgences} passages aux urgences créés (tous les niveaux de tri, modes d'arrivée et décisions de sortie sont représentés).\n")

# ─── CONSULTATIONS & RENDEZ-VOUS ─────────────────────────────────────────────
print("🩺 Création des consultations et rendez-vous...")
total_consult = 0
total_rdv     = 0

for patient, age, antecedents_list in patients_crees:
    nb_consult    = random.randint(2, 8)
    jours_consult = sorted(random.sample(range(1, JOURS_HISTORIQUE), min(nb_consult, JOURS_HISTORIQUE - 1)))

    for jour in jours_consult:
        date_consult   = now - timedelta(days=jour)
        type_evenement = random.choices(
            ['consultation', 'examen', 'operation'],
            weights=[0.65, 0.25, 0.10]
        )[0]

        if type_evenement == 'examen':
            motif = random.choice(MOTIFS_EXAMEN)
        elif type_evenement == 'operation':
            motif = random.choice(MOTIFS_OPERATION)
        else:
            motif = random.choice(MOTIFS)

        statut = "terminee"
        if jour < 7:
            statut = random.choice(["terminee", "en_cours"])

        Consultation.objects.create(
            patient=patient,
            type_evenement=type_evenement,
            date=date_consult,
            motif=motif,
            symptomes=random.choice(SYMPTOMES_POOL) if type_evenement != 'operation' else '',
            examens_realises=random.choice(EXAMENS_POOL),
            diagnostic=random.choice(DIAGNOSTICS),
            ordonnance=random.choice(ORDONNANCES),
            statut=statut,
            notes=(
                f"Patient {'vu' if patient.sexe == 'M' else 'vue'} en consultation. "
                f"{'Antécédents à surveiller : ' + ', '.join(antecedents_list[:2]) if antecedents_list else 'Pas d antécédents notables.'}"
            ),
        )
        total_consult += 1

    # Rendez-vous futurs (0 à 3 par patient)
    nb_rdv = random.randint(0, 3)
    for _ in range(nb_rdv):
        RendezVous.objects.create(
            patient=patient,
            date_heure=now + timedelta(days=random.randint(1, 30)),
            motif=random.choice(MOTIFS),
            statut=random.choice(["planifie", "confirme"]),
        )
        total_rdv += 1

print(f"✅ {total_consult} consultations créées, {total_rdv} rendez-vous planifiés.\n")

# ─── RÉSUMÉ ──────────────────────────────────────────────────────────────────
print("═" * 52)
print("🏥  SEED TERMINÉ — Résumé :")
print(f"   🏢 Services        : {len(services_crees)}")
print(f"   👔 Employés        : {len(employes_crees)}")
print(f"   👤 Patients        : {NB_PATIENTS}")
print(f"   📊 Signes vitaux   : {total_sv}")
print(f"   🩺 Consultations   : {total_consult}")
print(f"   📅 Rendez-vous     : {total_rdv}")
print(f"   🛏️  Hospitalisations: {total_hosp}")
print(f"   🚑 Passages urgences: {total_urgences}")
print(f"   🚨 Alertes         : {alertes_crees}")
print("═" * 52)
print("✅ Base Supabase peuplée avec succès !")