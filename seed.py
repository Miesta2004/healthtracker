"""
seed.py — Données de démonstration HealthTracker
Données très réalistes : profils cliniques cohérents, évolutions temporelles,
scénarios médicaux typiques du contexte sénégalais.
Usage : python3 seed.py
"""

import django, os, random
from decimal import Decimal

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'healthtracker.settings')
django.setup()

from django.utils import timezone
from django.contrib.auth.models import User
from datetime import timedelta, date, datetime
from collections import defaultdict

from patients.models import Patient
from consultations.models import Consultation, RendezVous
from signes_vitaux.models import SignesVitaux
from alertes.models import Alerte
from services.models import Service
from hospitalisations.models import Hospitalisation, StatutHospitalisation
from urgences.models import PassageUrgence, NiveauTri, ModeArrivee, StatutUrgence, DecisionSortie
from comptes.models import Employe
from analyses.models import DemandeAnalyse

random.seed(42)

# ─── CONFIG ───────────────────────────────────────────────────────────────────
JOURS_HISTORIQUE = 180   # 6 mois de données
NB_PATIENTS      = 80
NB_URGENCES      = 150   # passages aux urgences totaux
NB_MESURES_MIN   = 6
NB_MESURES_MAX   = 25

now = timezone.now()

# ─── NETTOYAGE ────────────────────────────────────────────────────────────────
print("🗑️  Nettoyage...")
for Model, label in [
    (DemandeAnalyse,  "demande(s) d'analyse"),
    (PassageUrgence,  "passage(s) urgences"),
    (Hospitalisation, "hospitalisation(s)"),
    (Alerte,          "alerte(s)"),
    (RendezVous,      "rendez-vous"),
    (Consultation,    "consultation(s)"),
    (SignesVitaux,    "signes vitaux"),
    (Patient,         "patient(s)"),
    (Employe,         "employé(s)"),
    (Service,         "service(s)"),
]:
    nb = Model.objects.count()
    if nb:
        Model.objects.all().delete()
        print(f"   - {nb} {label} supprimé(s)")

nb, _ = User.objects.filter(is_superuser=False).delete()
print(f"   - {nb} user(s) Django supprimé(s)\n✅ Nettoyé.\n")

# ─── SERVICES ─────────────────────────────────────────────────────────────────
print("🏥 Services...")
SERVICES_DATA = [
    ("Cardiologie",              "Prise en charge des pathologies cardiovasculaires"),
    ("Médecine interne",         "Consultations de médecine générale et de premier recours"),
    ("Pédiatrie",                "Suivi médical des enfants, nourrissons et adolescents"),
    ("Diabétologie-Endocrinologie", "Suivi des patients diabétiques, thyroïdiens et endocriniens"),
    ("Urgences",                 "Accueil, triage et prise en charge des urgences médicales"),
    ("Chirurgie générale",       "Interventions chirurgicales programmées et urgentes"),
    ("Gynécologie-Obstétrique",  "Suivi de grossesse, accouchement et santé de la femme"),
    ("Neurologie",               "Pathologies du système nerveux central et périphérique"),
    ("Pneumologie",              "Maladies respiratoires, asthme, BPCO, tuberculose"),
    ("Néphro-dialyse",           "Insuffisance rénale, dialyse et transplantation rénale"),
    ("ORL-Ophtalmologie",        "Oto-rhino-laryngologie et pathologies oculaires"),
    ("Laboratoire",              "Analyses biologiques, hématologie et biochimie"),
]
services = {}
for nom, desc in SERVICES_DATA:
    services[nom] = Service.objects.create(nom=nom, description=desc, actif=True)
print(f"✅ {len(services)} services\n")

# ─── DONNÉES NOMS/PRÉNOMS SÉNÉGALAIS ─────────────────────────────────────────
PRENOMS_F = [
    "Fatou", "Aïssatou", "Mariama", "Rokhaya", "Khady", "Ndèye", "Aminata",
    "Sokhna", "Coumba", "Astou", "Dieynaba", "Yaye Khady", "Binta", "Awa",
    "Soda", "Rama", "Seynabou", "Oumou", "Adja", "Kiné", "Nabou", "Penda",
    "Salimata", "Dieumba", "Mame Diarra", "Fatoumata", "Diariatou", "Aida",
    "Codou", "Gnima", "Bigué", "Ngoné", "Thioro", "Yandé",
]
PRENOMS_M = [
    "Moussa", "Ibrahima", "Abdoulaye", "Cheikh", "Mamadou", "Oumar", "Modou",
    "Babacar", "Pape", "Serigne", "Aliou", "Seydou", "Lamine", "Assane",
    "Saliou", "Boubacar", "Idrissa", "Malick", "Tapha", "Djibril", "Issa",
    "Fallou", "Demba", "Mor", "Bamba", "Tidiane", "Alioune", "Daouda",
    "Gorgui", "Makane", "Ndiaga", "Birane", "Thierno", "Elhadji",
]
NOMS = [
    "Diop", "Fall", "Ndiaye", "Sow", "Mbaye", "Sarr", "Faye", "Diallo",
    "Gueye", "Ndour", "Thiam", "Ba", "Diouf", "Kane", "Cissé", "Sy",
    "Tall", "Thiongane", "Badji", "Mendy", "Touré", "Camara", "Beye",
    "Lo", "Dème", "Sène", "Samb", "Boye", "Diagne", "Ndoye", "Tine",
    "Gomis", "Tendeng", "Manga", "Biaye",
]
QUARTIERS = [
    "Plateau", "Médina", "Yoff", "Parcelles Assainies", "Grand Dakar",
    "Ouakam", "Liberté 6", "HLM", "Point E", "Mermoz", "Fann Résidence",
    "Sicap Baobab", "Guédiawaye", "Pikine Ancien", "Rufisque Est",
    "Niary Tally", "Colobane", "Rebeuss", "Biscuiterie", "Dieuppeul",
    "Almadies", "Ngor", "Cambérène", "Yeumbeul", "Thiaroye",
]

def tel():
    op = random.choice(["70", "76", "77", "78"])
    return f"+221 {op} {random.randint(100,999)} {random.randint(10,99)} {random.randint(10,99)}"

def prenom_nom(sexe):
    pool = PRENOMS_F if sexe == 'F' else PRENOMS_M
    return random.choice(pool), random.choice(NOMS)

# ─── EMPLOYÉS ─────────────────────────────────────────────────────────────────
print("👔 Employés...")

# (prenom, nom, sexe, role, specialite, username, password, age, service_nom,
#  type_contrat, date_debut, description_poste)
EMPLOYES_DATA = [
    # Admin
    ("Mamadou",   "Kane",     "M", "admin",      "",                           "admin.kane",     "admin123",      48, None,
     "cdi", date(2015, 3, 1), "Directeur médical et administrateur du système d'information hospitalier. Supervise l'ensemble des services, coordonne les équipes médicales et paramédicales, et assure la conformité réglementaire de l'établissement."),

    # Cardiologie
    ("Aminata",   "Diop",     "F", "medecin",    "Cardiologie interventionnelle", "dr.adiop",    "medecin123",    44, "Cardiologie",
     "cdi", date(2016, 9, 1), "Cardiologue interventionnelle spécialisée dans le cathétérisme cardiaque et la pose de stents coronariens. Assure les consultations spécialisées, les échographies cardiaques, et la prise en charge des syndromes coronariens aigus. Chef de service."),
    ("Modou",     "Sy",       "M", "medecin",    "Rythmologie",                "dr.msy",         "medecin123",    51, "Cardiologie",
     "cdi", date(2012, 1, 15), "Cardiologue spécialisé en rythmologie et troubles du rythme cardiaque. Pose de stimulateurs cardiaques, ablation par radiofréquence, suivi des patients sous anticoagulants."),
    ("Ndèye",     "Ba",       "F", "infirmier",  "",                           "inf.nba",        "infirmier123",  31, "Cardiologie",
     "cdi", date(2019, 6, 1), "Infirmière de cardiologie. Surveillance hémodynamique des patients hospitalisés, préparation et administration des traitements intraveineux, éducation thérapeutique des patients hypertendus et insuffisants cardiaques."),
    ("Mariama",   "Mbaye",    "F", "secretaire", "",                           "sec.mbaye",      "secretaire123", 28, "Cardiologie",
     "cdd", date(2023, 1, 2), "Secrétaire médicale en cardiologie. Gestion des rendez-vous, accueil des patients, saisie des comptes rendus médicaux, facturation des actes."),

    # Médecine interne
    ("Ibrahima",  "Sow",      "M", "medecin",    "Médecine interne",           "dr.isow",        "medecin123",    40, "Médecine interne",
     "cdi", date(2017, 4, 1), "Médecin interniste. Consultations de médecine générale et spécialisée, bilan de pathologies complexes, coordination des prises en charge multidisciplinaires. Référent pour les maladies infectieuses tropicales."),
    ("Khady",     "Faye",     "F", "medecin",    "Médecine interne",           "dr.kfaye",       "medecin123",    43, "Médecine interne",
     "cdi", date(2014, 7, 1), "Médecin interniste avec expertise en maladies infectieuses. Prise en charge du VIH, de la tuberculose et des infections opportunistes. Formation universitaire à Dakar et Paris."),
    ("Cheikh",    "Sarr",     "M", "infirmier",  "",                           "inf.csarr",      "infirmier123",  35, "Médecine interne",
     "cdi", date(2018, 2, 1), "Infirmier principal en médecine interne. Soins infirmiers complexes, prélèvements biologiques, pose de voies veineuses, gestion des perfusions et des traitements parentéraux."),
    ("Abdoulaye", "Diallo",   "M", "secretaire", "",                           "sec.adiallo",    "secretaire123", 33, "Médecine interne",
     "cdi", date(2020, 9, 1), "Secrétaire médical. Gestion administrative des dossiers patients, prise de rendez-vous, archivage des résultats d'examens."),

    # Pédiatrie
    ("Fatou",     "Ndiaye",   "F", "medecin",    "Pédiatrie générale",         "dr.fndiaye",     "medecin123",    37, "Pédiatrie",
     "cdi", date(2015, 11, 1), "Pédiatre généraliste. Suivi de croissance et développement de l'enfant, prise en charge des maladies infectieuses pédiatriques (paludisme, méningite, gastro-entérite sévère), malnutrition sévère, anémie falciforme."),
    ("Babacar",   "Cissé",    "M", "medecin",    "Néonatologie",               "dr.bcisse",      "medecin123",    41, "Pédiatrie",
     "cdi", date(2016, 3, 1), "Pédiatre néonatologiste. Prise en charge des nouveau-nés à terme et prématurés, détresses respiratoires néonatales, ictère du nouveau-né, infections néonatales."),
    ("Awa",       "Ndour",    "F", "infirmier",  "",                           "inf.andour",     "infirmier123",  29, "Pédiatrie",
     "cdi", date(2020, 1, 6), "Infirmière pédiatrique. Administration des vaccins, surveillance nutritionnelle, éducation des parents, soins aux nourrissons et aux jeunes enfants."),

    # Diabétologie
    ("Moussa",    "Fall",     "M", "medecin",    "Diabétologie",               "dr.mfall",       "medecin123",    52, "Diabétologie-Endocrinologie",
     "cdi", date(2010, 6, 1), "Diabétologue endocrinologue. Expert en prise en charge du diabète de type 1 et 2, insuffisance thyroïdienne, troubles de l'axe corticotrope. Consultant régional pour l'OMS sur le diabète en Afrique subsaharienne."),
    ("Coumba",    "Thiam",    "F", "medecin",    "Endocrinologie",             "dr.cthiam",      "medecin123",    46, "Diabétologie-Endocrinologie",
     "cdi", date(2013, 9, 1), "Endocrinologue spécialisée dans les maladies de la thyroïde et les troubles hormonaux. Prise en charge des grossesses diabétiques, éducation thérapeutique en diabétologie."),
    ("Astou",     "Sarr",     "F", "infirmier",  "",                           "inf.asarr",      "infirmier123",  33, "Diabétologie-Endocrinologie",
     "cdd", date(2022, 4, 1), "Infirmière diabétologue. Éducation thérapeutique des patients diabétiques, apprentissage de l'auto-surveillance glycémique, gestion des pompes à insuline, suivi des plaies diabétiques."),

    # Urgences
    ("Pape",      "Diouf",    "M", "medecin",    "Médecine d'urgence",         "dr.pdiouf",      "medecin123",    42, "Urgences",
     "cdi", date(2015, 8, 1), "Médecin urgentiste. Prise en charge des urgences vitales, réanimation cardio-pulmonaire, triage CIMU, gestion des polytraumatismes et des urgences chirurgicales. Formateur ACLS."),
    ("Adja",      "Camara",   "F", "medecin",    "Médecine d'urgence",         "dr.acamara",     "medecin123",    39, "Urgences",
     "cdi", date(2018, 2, 1), "Médecin urgentiste. Spécialisée dans les urgences pédiatriques et obstétricales. Gestion des urgences toxicologiques et des intoxications médicamenteuses."),
    ("Rokhaya",   "Gueye",    "F", "infirmier",  "",                           "inf.rgueye",     "infirmier123",  28, "Urgences",
     "cdi", date(2021, 3, 1), "Infirmière urgentiste. Triage des patients à l'accueil, pose de voies veineuses, préparation des chariots d'urgence, assistance aux gestes techniques urgents."),
    ("Demba",     "Touré",    "M", "infirmier",  "",                           "inf.dtoure",     "infirmier123",  36, "Urgences",
     "cdi", date(2017, 7, 1), "Infirmier urgentiste expérimenté. Gestion de la salle de déchoquage, massage cardiaque externe, défibrillation, intubation assistée."),
    ("Issa",      "Beye",     "M", "secretaire", "",                           "sec.ibeye",      "secretaire123", 27, "Urgences",
     "cdd", date(2023, 10, 1), "Secrétaire médicale aux urgences. Enregistrement des arrivées, gestion administrative des passages, liaison avec les services d'hospitalisation."),

    # Chirurgie
    ("Aliou",     "Mendy",    "M", "medecin",    "Chirurgie digestive",        "dr.amendy",      "medecin123",    49, "Chirurgie générale",
     "cdi", date(2011, 5, 1), "Chirurgien digestif. Chirurgie laparoscopique, appendicectomies, cholécystectomies, hernies abdominales. Prise en charge des occlusions intestinales et des péritonites."),
    ("Soda",      "Lo",       "F", "medecin",    "Chirurgie orthopédique",     "dr.slo",         "medecin123",    45, "Chirurgie générale",
     "cdi", date(2014, 2, 1), "Chirurgienne orthopédiste. Réduction des fractures ouvertes et fermées, pose de fixateurs externes, prothèses de hanche et de genou, traumatologie sportive."),
    ("Malick",    "Dème",     "M", "infirmier",  "",                           "inf.mdeme",      "infirmier123",  34, "Chirurgie générale",
     "cdi", date(2019, 1, 2), "Infirmier de bloc opératoire diplômé d'État. Instrumentation chirurgicale, préparation du champ opératoire, gestion de la stérilisation et du matériel chirurgical."),

    # Gynécologie
    ("Kiné",      "Ndiaye",   "F", "medecin",    "Gynécologie-Obstétrique",    "dr.kndiaye",     "medecin123",    48, "Gynécologie-Obstétrique",
     "cdi", date(2012, 10, 1), "Gynécologue obstétricienne. Suivi de grossesse normale et à risque, accouchements eutociques et dystociques, césariennes, chirurgie gynécologique (fibrome, kyste ovarien). Chef de service."),
    ("Nabou",     "Diallo",   "F", "infirmier",  "",                           "inf.ndiallo",    "infirmier123",  32, "Gynécologie-Obstétrique",
     "cdi", date(2018, 5, 1), "Sage-femme infirmière. Surveillance du travail et de l'accouchement, soins au nouveau-né en salle de naissance, éducation à l'allaitement maternel et à la contraception."),
    ("Saliou",    "Ba",       "M", "secretaire", "",                           "sec.sba",        "secretaire123", 30, "Gynécologie-Obstétrique",
     "cdd", date(2022, 11, 1), "Secrétaire médical en gynécologie. Gestion des dossiers obstétricaux, prise de rendez-vous d'échographie, saisie des comptes rendus opératoires."),

    # Neurologie
    ("Idrissa",   "Sy",       "M", "medecin",    "Neurologie vasculaire",      "dr.isy",         "medecin123",    50, "Neurologie",
     "cdi", date(2010, 4, 1), "Neurologue vasculaire. Expert en accidents vasculaires cérébraux (AVC ischémique et hémorragique), épilepsie, maladie de Parkinson, sclérose en plaques. Coordonnateur de l'unité neurovasculaire."),
    ("Penda",     "Fall",     "F", "infirmier",  "",                           "inf.pfall",      "infirmier123",  31, "Neurologie",
     "cdi", date(2019, 9, 1), "Infirmière en neurologie. Surveillance neurologique des patients post-AVC, rééducation des fonctions cognitives, prévention des escarres, gestion des sondes gastriques."),

    # Pneumologie
    ("Boubacar",  "Diallo",   "M", "medecin",    "Pneumologie-Infectiologie",  "dr.bdiallo",     "medecin123",    47, "Pneumologie",
     "cdi", date(2013, 3, 1), "Pneumologue infectiologue. Prise en charge de la tuberculose pulmonaire et extrapulmonaire, BPCO, asthme sévère, pneumonies communautaires. Référent tuberculose de la région de Dakar."),
    ("Aïssatou",  "Sarr",     "F", "infirmier",  "",                           "inf.asrr",       "infirmier123",  29, "Pneumologie",
     "cdd", date(2023, 4, 1), "Infirmière en pneumologie. Aérosolthérapie, spirométrie, éducation à l'utilisation des inhalateurs, surveillance des patients sous oxygénothérapie."),

    # Néphro-dialyse
    ("Lamine",    "Gueye",    "M", "medecin",    "Néphro-dialyse",             "dr.lgueye",      "medecin123",    44, "Néphro-dialyse",
     "cdi", date(2016, 1, 4), "Néphrologue. Prise en charge de l'insuffisance rénale chronique et aiguë, dialyse hémodialyse et dialyse péritonéale, bilan pré-transplantation rénale."),
    ("Seynabou",  "Mbaye",    "F", "infirmier",  "",                           "inf.smbaye",     "infirmier123",  30, "Néphro-dialyse",
     "cdi", date(2020, 7, 1), "Infirmière néphrologue dialyse. Pose et surveillance des fistules artério-veineuses, gestion des séances de dialyse, éducation des patients sur le régime alimentaire et hydrique."),

    # ORL-Ophtalmo
    ("Fatoumata", "Sow",      "F", "medecin",    "ORL-Chirurgie cervico-faciale", "dr.fsow",     "medecin123",    38, "ORL-Ophtalmologie",
     "cdi", date(2018, 8, 1), "ORL chirurgienne. Amygdalectomies, adénoïdectomies, rhinoplasties, chirurgie des sinus, otites chroniques. Suivi des cancers ORL en coopération avec l'oncologie."),
    ("Dieynaba",  "Ndour",    "F", "infirmier",  "",                           "inf.dndour",     "infirmier123",  27, "ORL-Ophtalmologie",
     "cdd", date(2024, 1, 8), "Infirmière ORL et ophtalmologie. Préparation des consultations spécialisées, instillations oculaires, soins post-opératoires ORL, audiométrie de dépistage."),

    # Laboratoire
    ("Oumar",     "Thiam",    "M", "laborantin", "Biologie médicale",          "lab.othiam",     "labo123",       38, "Laboratoire",
     "cdi", date(2016, 6, 1), "Biologiste médical responsable du laboratoire. Supervision des analyses hématologiques, biochimiques et microbiologiques. Validation et interprétation des résultats critiques. Gestion du contrôle qualité."),
    ("Djibril",   "Tall",     "M", "laborantin", "Biochimie clinique",         "lab.dtall",      "labo123",       36, "Laboratoire",
     "cdi", date(2018, 3, 1), "Laborantin spécialisé en biochimie. Dosages enzymatiques, bilan lipidique, marqueurs cardiaques (troponine, BNP), bilan rénal et hépatique, HbA1c."),
    ("Oumou",     "Badji",    "F", "laborantin", "Hématologie biologique",     "lab.obadji",     "labo123",       34, "Laboratoire",
     "cdi", date(2019, 5, 1), "Laborantine hématologue. Numération formule sanguine, bilan de coagulation, électrophorèse de l'hémoglobine (drépanocytose), tests de paludisme par goutte épaisse et TDR."),
]

employes = []
for (prenom, nom, sexe, role, specialite, username, password, age,
     svc_nom, type_contrat, date_debut, desc) in EMPLOYES_DATA:
    annee = date.today().year - age
    dnaiss = date(annee, random.randint(1, 12), random.randint(1, 28))
    if User.objects.filter(username=username).exists():
        continue
    user = User.objects.create_user(
        username=username, email=f"{username}@healthtracker.sn",
        password=password, first_name=prenom, last_name=nom,
        is_staff=(role == 'admin'),
    )
    # date_fin pour CDD : 2 ans après début
    date_fin = date(date_debut.year + 2, date_debut.month, date_debut.day) if type_contrat == 'cdd' else None
    emp = Employe.objects.create(
        user=user, nom=nom, prenom=prenom, date_naissance=dnaiss,
        sexe=sexe, telephone=tel(),
        adresse=f"{random.choice(QUARTIERS)}, Dakar",
        role=role, specialite=specialite,
        service=services.get(svc_nom) if svc_nom else None,
        type_contrat=type_contrat,
        date_debut_contrat=date_debut,
        date_fin_contrat=date_fin,
        description_poste=desc,
    )
    employes.append(emp)

print(f"✅ {len(employes)} employés\n")

# ── Chefs de service ──────────────────────────────────────────────────────────
print("🩺 Chefs de service...")
for svc_obj in services.values():
    medecins_svc = [e for e in employes if e.role == 'medecin' and e.service_id == svc_obj.id]
    if medecins_svc:
        chef = medecins_svc[0]
        svc_obj.chef_de_service = chef
        svc_obj.save()
        print(f"   {svc_obj.nom} → Dr {chef.prenom} {chef.nom}")
print()

# ── Tableau de connexion ──────────────────────────────────────────────────────
print("┌──────────────────────────────────────────────────────────────────┐")
print("│              COMPTES DE DÉMONSTRATION                            │")
print("├──────────────────┬──────────────────────────┬────────────────────┤")
print("│ Rôle             │ Username                  │ Mot de passe       │")
print("├──────────────────┼──────────────────────────┼────────────────────┤")
for rl, us, pw in [
    ("Admin",        "admin.kane",                   "admin123"),
    ("Médecin",      "dr.adiop / dr.mfall / ...",    "medecin123"),
    ("Infirmier(e)", "inf.nba / inf.csarr / ...",    "infirmier123"),
    ("Secrétaire",   "sec.mbaye / sec.sba / ...",    "secretaire123"),
    ("Laborantin",   "lab.othiam / lab.dtall / ...", "labo123"),
]:
    print(f"│ {rl:<16}│ {us:<25} │ {pw:<18} │")
print("└──────────────────┴──────────────────────────┴────────────────────┘\n")

# ─── PROFILS CLINIQUES ────────────────────────────────────────────────────────
# Chaque profil définit les valeurs basales avec variabilité physiologique réaliste
PROFILS = {
    "sain": {
        "ts": (118, 6), "td": (74, 4), "temp": (37.0, 0.25),
        "poids": (68, 8), "glyc": (4.8, 0.35), "fc": (70, 8),
        "p_alerte": 0.02, "p_episode": 0.04,
    },
    "hypertendu_controle": {
        "ts": (148, 8), "td": (92, 5), "temp": (37.0, 0.25),
        "poids": (82, 10), "glyc": (5.4, 0.5), "fc": (76, 7),
        "p_alerte": 0.12, "p_episode": 0.10,
    },
    "hypertendu_non_controle": {
        "ts": (168, 12), "td": (102, 7), "temp": (37.1, 0.3),
        "poids": (90, 12), "glyc": (5.8, 0.6), "fc": (82, 9),
        "p_alerte": 0.28, "p_episode": 0.18,
    },
    "diabetique_t2_equilibre": {
        "ts": (132, 7), "td": (83, 5), "temp": (37.1, 0.25),
        "poids": (78, 10), "glyc": (7.2, 0.8), "fc": (74, 7),
        "p_alerte": 0.15, "p_episode": 0.12,
    },
    "diabetique_t2_desequilibre": {
        "ts": (145, 10), "td": (90, 6), "temp": (37.2, 0.3),
        "poids": (85, 12), "glyc": (11.5, 2.5), "fc": (80, 9),
        "p_alerte": 0.35, "p_episode": 0.25,
    },
    "drepanocytaire": {
        "ts": (108, 6), "td": (65, 5), "temp": (37.4, 0.5),
        "poids": (54, 7), "glyc": (4.6, 0.3), "fc": (92, 12),
        "p_alerte": 0.30, "p_episode": 0.35,
    },
    "insuffisant_renal": {
        "ts": (152, 10), "td": (96, 6), "temp": (37.0, 0.3),
        "poids": (72, 8), "glyc": (6.0, 0.8), "fc": (78, 8),
        "p_alerte": 0.22, "p_episode": 0.15,
    },
    "senior_fragile": {
        "ts": (150, 12), "td": (90, 7), "temp": (36.8, 0.35),
        "poids": (62, 8), "glyc": (6.5, 1.0), "fc": (74, 9),
        "p_alerte": 0.18, "p_episode": 0.14,
    },
    "enfant_adolescent": {
        "ts": (105, 8), "td": (62, 5), "temp": (37.2, 0.4),
        "poids": (32, 15), "glyc": (4.4, 0.3), "fc": (88, 12),
        "p_alerte": 0.08, "p_episode": 0.12,
    },
    "femme_enceinte": {
        "ts": (112, 7), "td": (68, 5), "temp": (37.1, 0.3),
        "poids": (68, 10), "glyc": (4.6, 0.5), "fc": (85, 8),
        "p_alerte": 0.10, "p_episode": 0.08,
    },
}

def choisir_profil(age, sexe, antecedents_str):
    ant = antecedents_str.lower()
    if "drépanocytose" in ant:
        return "drepanocytaire"
    if "insuffisance rénale" in ant:
        return "insuffisant_renal"
    if "diabète" in ant and "hypertension" in ant:
        return random.choice(["diabetique_t2_desequilibre", "hypertendu_non_controle"])
    if "diabète" in ant:
        return random.choice(["diabetique_t2_equilibre", "diabetique_t2_desequilibre"])
    if "hypertension" in ant:
        return random.choice(["hypertendu_controle", "hypertendu_non_controle"])
    if age < 18:
        return "enfant_adolescent"
    if age > 65:
        return "senior_fragile"
    if sexe == "F" and 18 <= age <= 40 and random.random() < 0.12:
        return "femme_enceinte"
    return "sain"

def varier(mu, sigma, lo=None, hi=None):
    v = mu + random.gauss(0, sigma)
    if lo is not None: v = max(v, lo)
    if hi is not None: v = min(v, hi)
    return v

# ─── PATIENTS ─────────────────────────────────────────────────────────────────
print(f"👤 Création de {NB_PATIENTS} patients...")

GROUPES_SANGUINS  = ['A+','A-','B+','B-','AB+','AB-','O+','O-']
POIDS_GROUPES     = [0.43, 0.05, 0.10, 0.02, 0.03, 0.01, 0.32, 0.04]

ALLERGIES_POOL = [
    "Pénicilline", "Amoxicilline", "Aspirine", "Ibuprofène", "Diclofénac",
    "Sulfamides", "Codéine", "Tramadol", "Latex", "Arachides",
    "Fruits de mer", "Pollen de graminées", "Acariens de poussière",
    "Iode (produit de contraste)", "Métronidazole", "Érythromycine",
]
ANTECEDENTS_POOL = [
    "Hypertension artérielle", "Diabète type 2", "Asthme bronchique",
    "Drépanocytose (HbSS)", "Paludisme saisonnier récidivant",
    "Hépatite B chronique", "Insuffisance rénale chronique stade 3",
    "Épilepsie idiopathique", "Coronaropathie (stent posé en 2021)",
    "Hypothyroïdie sous Levothyrox", "Tuberculose pulmonaire (traitée 2020)",
    "VIH sous trithérapie (ARV)", "Anémie ferriprive chronique",
    "Obésité (IMC > 30)", "Fibrillation auriculaire",
    "Insuffisance cardiaque NYHA II", "Ulcère gastro-duodénal",
    "Goutte chronique sous allopurinol", "BPCO stade 2",
    "Drépanocytose (HbSC)", "Cirrhose hépatique Child A",
]

medecins_list = [e for e in employes if e.role == 'medecin']

patients_data = []   # liste de (patient, age, antecedents_str, profil_key)

for i in range(NB_PATIENTS):
    sexe = random.choice(['M', 'F'])
    prenom, nom = prenom_nom(sexe)
    age  = random.randint(5, 82)
    annee_naiss = date.today().year - age
    dnaiss = date(annee_naiss, random.randint(1, 12), random.randint(1, 28))
    groupe = random.choices(GROUPES_SANGUINS, weights=POIDS_GROUPES)[0]

    # Allergies : 0 à 2, cohérentes avec l'âge
    nb_all = random.choices([0, 1, 2], weights=[0.58, 0.32, 0.10])[0]
    allergies_str = ", ".join(random.sample(ALLERGIES_POOL, nb_all)) if nb_all else ""

    # Antécédents : 0 à 3, plus fréquents chez les adultes
    max_ant = 0 if age < 10 else (1 if age < 25 else (3 if age > 50 else 2))
    nb_ant = random.choices(range(max_ant + 1), weights=[0.4] + [0.6/max(max_ant,1)]*max_ant if max_ant else [1])[0]
    ant_list = random.sample(ANTECEDENTS_POOL, nb_ant) if nb_ant else []
    ant_str  = ", ".join(ant_list)

    medecin_ref  = random.choice(medecins_list) if medecins_list else None
    svc_patient  = medecin_ref.service if medecin_ref else random.choice(list(services.values()))

    profil_key = choisir_profil(age, sexe, ant_str)

    patient = Patient.objects.create(
        nom=nom, prenom=prenom, date_naissance=dnaiss, sexe=sexe,
        groupe_sanguin=groupe, telephone=tel(),
        adresse=f"{random.choice(QUARTIERS)}, Dakar",
        allergies=allergies_str, antecedents=ant_str,
        actif=random.random() > 0.06,
        service=svc_patient, medecin_referent=medecin_ref,
    )
    patients_data.append((patient, age, ant_str, profil_key))

print(f"✅ {len(patients_data)} patients\n")

# ─── SIGNES VITAUX ────────────────────────────────────────────────────────────
print("📊 Signes vitaux...")
total_sv = 0
alertes_brutes = []   # (patient, type_alerte, message, date_alerte)

for patient, age, ant_str, profil_key in patients_data:
    profil = PROFILS[profil_key]

    # Poids de base réaliste selon le profil
    poids_base = varier(profil["poids"][0], profil["poids"][1], 15, 140)
    # Tendance pondérale : stabilité pour la plupart, légère variation
    tendance_j  = random.gauss(0, 0.008)   # kg/jour en moyenne

    # Nombre de mesures aléatoire — pas tous les jours (visite médicale)
    nb_mesures = random.randint(NB_MESURES_MIN, NB_MESURES_MAX)
    jours_mesures = sorted(random.sample(range(0, JOURS_HISTORIQUE), nb_mesures))

    for idx, jour in enumerate(jours_mesures):
        d_mesure = now - timedelta(days=(JOURS_HISTORIQUE - jour))

        poids_j = poids_base + tendance_j * jour
        # Variation physiologique journalière (repas, hydratation)
        poids_mesure = round(varier(poids_j, 0.4, 10, 150), 1)

        ts   = int(varier(profil["ts"][0],   profil["ts"][1],   70, 220))
        td   = int(varier(profil["td"][0],   profil["td"][1],   40, 140))
        temp = round(varier(profil["temp"][0], profil["temp"][1], 35.0, 41.5), 1)
        glyc = round(varier(profil["glyc"][0], profil["glyc"][1], 1.5, 30.0), 2)
        fc   = int(varier(profil["fc"][0],   profil["fc"][1],   35, 160))

        # Episode aigu ponctuel (infection, décompensation, stress)
        if random.random() < profil["p_episode"]:
            temp = round(min(temp + random.uniform(0.8, 3.0), 41.5), 1)
            fc   = min(fc + random.randint(15, 35), 160)
            if profil_key in ("drepanocytaire", "diabetique_t2_desequilibre"):
                ts = min(ts + random.randint(20, 40), 220)

        SignesVitaux.objects.create(
            patient=patient,
            date=d_mesure,
            tension_systolique=ts,
            tension_diastolique=td,
            temperature=Decimal(str(temp)),
            poids=Decimal(str(poids_mesure)),
            glycemie=Decimal(str(min(glyc, 30.0))),
            frequence_cardiaque=fc,
        )
        total_sv += 1

        # Détecter anomalies → alertes (seuils cliniques réels)
        if ts >= 180 or td >= 115:
            alertes_brutes.append((patient, "tension",
                                   f"Urgence hypertensive : TA {ts}/{td} mmHg — consultation immédiate", d_mesure))
        elif ts >= 160 and random.random() < profil["p_alerte"]:
            alertes_brutes.append((patient, "tension",
                                   f"Hypertension non contrôlée : TA {ts}/{td} mmHg", d_mesure))

        if glyc >= 20.0:
            alertes_brutes.append((patient, "glycemie",
                                   f"Hyperglycémie sévère : {glyc:.1f} g/L — risque de coma diabétique", d_mesure))
        elif glyc >= 13.0 and random.random() < profil["p_alerte"]:
            alertes_brutes.append((patient, "glycemie",
                                   f"Glycémie très élevée : {glyc:.1f} g/L — réévaluer traitement", d_mesure))
        elif glyc <= 2.5:
            alertes_brutes.append((patient, "glycemie",
                                   f"Hypoglycémie sévère : {glyc:.1f} g/L — resucrage immédiat", d_mesure))

        if temp >= 40.0:
            alertes_brutes.append((patient, "temperature",
                                   f"Hyperthermie majeure : {temp}°C — rechercher foyer infectieux", d_mesure))
        elif temp >= 38.5 and random.random() < profil["p_alerte"]:
            alertes_brutes.append((patient, "temperature",
                                   f"Fièvre : {temp}°C — bilan infectieux recommandé", d_mesure))
        elif temp <= 36.0:
            alertes_brutes.append((patient, "temperature",
                                   f"Hypothermie : {temp}°C", d_mesure))

        if fc >= 120:
            alertes_brutes.append((patient, "frequence",
                                   f"Tachycardie : {fc} bpm — ECG recommandé", d_mesure))
        elif fc <= 45:
            alertes_brutes.append((patient, "frequence",
                                   f"Bradycardie sévère : {fc} bpm — avis cardiologique", d_mesure))

print(f"✅ {total_sv} mesures\n")

# ─── ALERTES ──────────────────────────────────────────────────────────────────
print("🚨 Alertes...")
alertes_par_patient = defaultdict(list)
for patient, type_al, msg, d in alertes_brutes:
    alertes_par_patient[patient.id].append((patient, type_al, msg, d))

total_alertes = 0
for pid, items in alertes_par_patient.items():
    # Garder au max 4 alertes par patient, les plus récentes
    items_tri = sorted(items, key=lambda x: x[3], reverse=True)[:4]
    for patient, type_al, msg, _ in items_tri:
        Alerte.objects.create(
            patient=patient, type=type_al, message=msg,
            statut=random.choices(
                ['non_lue', 'lue', 'traitee'],
                weights=[0.50, 0.25, 0.25]
            )[0],
        )
        total_alertes += 1
print(f"✅ {total_alertes} alertes\n")

# ─── CONSULTATIONS ────────────────────────────────────────────────────────────
print("🩺 Consultations et rendez-vous...")

MOTIFS_CONSULT = [
    "Contrôle de la tension artérielle", "Suivi du diabète — bilan glycémique",
    "Toux persistante depuis 10 jours", "Fièvre et frissons nocturnes",
    "Céphalées frontales récurrentes", "Douleurs abdominales épigastriques",
    "Fatigue intense et perte de poids", "Palpitations et dyspnée d'effort",
    "Renouvellement d'ordonnance chronique", "Douleurs articulaires des genoux",
    "Suivi post-opératoire — J+15", "Bilan de santé annuel",
    "Douleurs lombaires irradiant dans la jambe", "Troubles urinaires",
    "Prurit généralisé sans éruption", "Oedèmes des membres inférieurs",
    "Vertige positionnel et nausées", "Brûlures épigastriques postprandiales",
    "Suivi grossesse — 1er trimestre", "Vaccination adulte (rappel tétanos)",
]
MOTIFS_EXAMEN = [
    "Bilan biologique complet — NFS, ionogramme, créatinine",
    "Échographie abdominale et pelvienne",
    "Radiographie thoracique de face",
    "Électrocardiogramme 12 dérivations",
    "Glycémie à jeun et HbA1c",
    "Bilan lipidique — cholestérol total, LDL, HDL, triglycérides",
    "Échographie cardiaque transthoracique",
    "Scanner thoracique sans injection",
    "IRM cérébrale sans et avec gadolinium",
    "Fond d'œil — bilan hypertensif",
    "ECBU — examen cytobactériologique des urines",
    "Ponction lombaire — bilan méningé",
    "Test de l'effort sur tapis roulant",
    "Doppler artériel et veineux des membres inférieurs",
]
MOTIFS_OPERATION = [
    "Appendicectomie laparoscopique en urgence",
    "Cholécystectomie pour lithiase symptomatique",
    "Cure de hernie inguinale droite",
    "Césarienne programmée pour bassin limite",
    "Amygdalectomie bilatérale",
    "Réduction chirurgicale d'une fracture du radius",
    "Cure de varicocèle",
    "Excision d'un lipome dorsal",
    "Thyroïdectomie totale pour goitre multinodulaire",
    "Drainage d'un abcès pariétal",
]
SYMPTOMES_PAR_MOTIF = {
    "tension": "Céphalées occipitales matinales, vertiges au lever, parfois bourdonnements d'oreilles.",
    "diabete": "Polyurie, polydipsie, asthénie. Pas de symptôme d'hypoglycémie.",
    "infection": "Fièvre à 38,8°C, frissons, myalgies diffuses, anorexie depuis 3 jours.",
    "cardio": "Dyspnée à l'effort (stade II NYHA), douleur thoracique atypique à l'effort.",
    "digestif": "Douleurs épigastriques postprandiales, nausées sans vomissement, transit normal.",
    "neuro": "Céphalées pulsatiles unilatérales, photophobie, sans signe neurologique focal.",
    "generaux": "Asthénie importante depuis 3 semaines, perte d'appétit, amaigrissement de 4 kg.",
    "osteo": "Douleurs des deux genoux à la marche, raideur matinale < 30 min.",
    "aucun": "Aucune plainte fonctionnelle. Consultation de suivi programmée.",
}
EXAMENS_REALISES = [
    "Mesure de la tension artérielle aux deux bras (PA droite : 148/92, PA gauche : 145/90 mmHg).",
    "NFS : Hb 10,2 g/dL, GB 8 400/mm³, plaquettes 245 000/mm³. Glycémie : 8,4 mmol/L.",
    "ECG 12 dérivations : rythme sinusal régulier, 78 bpm. HVG électrique.",
    "Échographie abdominale : lithiase vésiculaire unique de 18 mm, sans dilatation des voies biliaires.",
    "Radiographie thoracique : cardiomégalie modérée (ICT = 0,55), pas d'épanchement pleural.",
    "Glycémie capillaire : 12,3 mmol/L. HbA1c à 8,9 % (dosé il y a 3 mois).",
    "Auscultation cardio-pulmonaire : souffles télesystoliques 2/6 à l'apex. MV diminué aux bases.",
    "Aucun examen complémentaire réalisé lors de cette consultation.",
    "TDR paludisme : POSITIF (Plasmodium falciparum). Frottis sanguin confirmé.",
    "Créatinine : 185 μmol/L (clairance CKD-EPI : 38 mL/min). Urée : 12,4 mmol/L.",
]
DIAGNOSTICS = [
    "Paludisme à Plasmodium falciparum non compliqué — traitement Coartem instauré.",
    "Hypertension artérielle grade 2 insuffisamment contrôlée — renforcement du traitement.",
    "Diabète type 2 déséquilibré (HbA1c 9,2 %) — ajustement insulinothérapie.",
    "Gastro-entérite aiguë probablement virale — réhydratation et antiémétiques.",
    "Infection urinaire basse — Amoxicilline-clavulanate 7 jours.",
    "Anémie ferriprive sévère — supplémentation en fer et bilan étiologique.",
    "Bronchite bactérienne — Amoxicilline 500 mg 3x/j pendant 7 jours.",
    "Lombalgie commune — AINS, myorelaxants, kinésithérapie à prévoir.",
    "Crise d'asthme modérée — Salbutamol nébulisé + corticoïdes systémiques.",
    "Insuffisance cardiaque décompensée NYHA III — diurétiques IV en urgence.",
    "Paludisme grave (accès pernicieux) — artéméther IV, hospitalisation.",
    "Épilepsie partielle — ajustement de la carbamazépine.",
    "Rhinopharyngite virale — traitement symptomatique uniquement.",
    "Ulcère duodénal (FOGD réalisée) — IPP 40 mg + éradication HP.",
    "Crise drépanocytaire vaso-occlusive — antalgiques palier 3, hydratation IV.",
    "Hypertension gestationnelle — surveillance rapprochée, repos.",
    "Bilan normal — pas d'anomalie clinique ni biologique décelée.",
]
ORDONNANCES = [
    "Coartem® (artéméther/luméfantrine) 20/120 mg — 4 cp à J0, J8, J24, J36, J48, J60.",
    "Amlodipine 10 mg — 1 cp/jour le matin. Hydrochlorothiazide 12,5 mg — 1 cp/jour.",
    "Insuline NPH 18 UI le soir au coucher. Metformine 1000 mg × 2/jour aux repas.",
    "SRO (sels de réhydratation orale) — 1 sachet/250 mL, à boire lentement. Dompéridone 10 mg × 3/j.",
    "Amoxicilline + acide clavulanique 1 g — 1 cp × 2/j pendant 7 jours.",
    "Ferrograd® (sulfate ferreux 325 mg) — 1 cp/jour à jeun pendant 3 mois.",
    "Amoxicilline 500 mg — 1 cp × 3/jour pendant 7 jours. Paracétamol 1 g si fièvre.",
    "Ibuprofène 400 mg — 1 cp × 3/jour avec repas (max 5 jours). Thiocolchicoside 4 mg × 2/j.",
    "Salbutamol 100 μg — 2 bouffées toutes les 4h. Prednisolone 1 mg/kg/j pendant 5 jours.",
    "Furosémide 40 mg IV. Restriction hydro-sodée. Surveillance poids quotidienne.",
    "Artéméther 80 mg IM toutes les 12h pendant 3 jours. Bilan rénal et hépatique à J3.",
    "Carbamazépine 200 mg — 1 cp matin et soir. Dosage sanguin à 1 mois.",
    "Sérum physiologique en lavage nasal × 3/j. Paracétamol 500 mg si T° > 38,5°C.",
    "Oméprazole 40 mg — 1 cp/jour à jeun. Amoxicilline 1 g + Clarithromycine 500 mg × 2/j × 10j.",
    "Morphine 10 mg SC toutes les 4h si EVA > 7. Kétoprofène 100 mg IV × 2/j. NaCl 0,9 % 2 L/24h.",
]

total_consult = 0
total_rdv     = 0
consultations_par_patient = defaultdict(list)  # patient.id → [Consultation] (utilisé pour lier les demandes d'analyse)

for patient, age, ant_str, profil_key in patients_data:
    # Nombre de consultations selon le profil clinique
    if profil_key in ("sain", "enfant_adolescent"):
        nb_c = random.randint(1, 4)
    elif profil_key in ("diabetique_t2_desequilibre", "drepanocytaire", "insuffisant_renal"):
        nb_c = random.randint(6, 14)
    else:
        nb_c = random.randint(3, 8)

    jours_c = sorted(random.sample(range(1, JOURS_HISTORIQUE), min(nb_c, JOURS_HISTORIQUE - 1)))

    for jour in jours_c:
        d_consult = now - timedelta(days=jour, hours=random.randint(7, 17), minutes=random.randint(0, 59))

        type_ev = random.choices(
            ['consultation', 'examen', 'operation', 'autre'],
            weights=[0.65, 0.25, 0.07, 0.03]
        )[0]

        if type_ev == 'examen':
            motif = random.choice(MOTIFS_EXAMEN)
        elif type_ev == 'operation':
            motif = random.choice(MOTIFS_OPERATION)
        else:
            motif = random.choice(MOTIFS_CONSULT)

        # Statut : passé = terminée, très récent = en cours
        if jour <= 2:
            statut = random.choice(["en_cours", "terminee"])
        else:
            statut = "terminee"

        # Symptômes cohérents avec le profil
        if profil_key in ("hypertendu_controle", "hypertendu_non_controle"):
            symptomes_base = SYMPTOMES_PAR_MOTIF["tension"]
        elif profil_key in ("diabetique_t2_equilibre", "diabetique_t2_desequilibre"):
            symptomes_base = SYMPTOMES_PAR_MOTIF["diabete"]
        elif profil_key == "drepanocytaire":
            symptomes_base = SYMPTOMES_PAR_MOTIF["generaux"]
        elif profil_key == "insuffisant_renal":
            symptomes_base = SYMPTOMES_PAR_MOTIF["generaux"]
        elif type_ev == 'operation':
            symptomes_base = ""
        else:
            symptomes_base = random.choice(list(SYMPTOMES_PAR_MOTIF.values()))

        notes = ""
        if ant_str:
            notes = (f"Patient {'vu' if patient.sexe == 'M' else 'vue'} en {type_ev}. "
                     f"ATCD : {ant_str[:120]}{'...' if len(ant_str)>120 else ''}. "
                     f"{'Observance thérapeutique satisfaisante.' if random.random()>0.3 else 'Problème observance signalé.'}")

        c = Consultation.objects.create(
            patient=patient, type_evenement=type_ev, date=d_consult,
            motif=motif, symptomes=symptomes_base,
            examens_realises=random.choice(EXAMENS_REALISES),
            diagnostic=random.choice(DIAGNOSTICS),
            ordonnance=random.choice(ORDONNANCES),
            statut=statut, notes=notes,
        )
        consultations_par_patient[patient.id].append(c)
        total_consult += 1

    # Rendez-vous futurs (0 à 3)
    nb_rdv = random.randint(0, 3)
    for _ in range(nb_rdv):
        jours_futur = random.randint(1, 45)
        RendezVous.objects.create(
            patient=patient,
            date_heure=now + timedelta(days=jours_futur, hours=random.randint(8, 16)),
            motif=random.choice(MOTIFS_CONSULT),
            statut=random.choices(['planifie', 'confirme', 'annule'], weights=[0.55, 0.35, 0.10])[0],
        )
        total_rdv += 1

print(f"✅ {total_consult} consultations, {total_rdv} rendez-vous\n")

# ─── DEMANDES D'ANALYSE ───────────────────────────────────────────────────────
print("🔬 Demandes d'analyse...")

laborantins_list = [e for e in employes if e.role == 'laborantin']

# Type d'analyse le plus plausible selon le profil clinique (réalisme)
TYPES_PAR_PROFIL = {
    "diabetique_t2_equilibre":      ["glycemie", "bilan_lipidique", "urine"],
    "diabetique_t2_desequilibre":   ["glycemie", "bilan_renal", "ionogramme", "urine"],
    "hypertendu_controle":          ["bilan_renal", "ionogramme", "bilan_lipidique"],
    "hypertendu_non_controle":      ["bilan_renal", "ionogramme", "bilan_lipidique", "nfs"],
    "drepanocytaire":               ["nfs", "groupe_sanguin", "hemostase"],
    "insuffisant_renal":            ["bilan_renal", "ionogramme", "urine", "nfs"],
    "senior_fragile":               ["nfs", "bilan_renal", "crp"],
    "enfant_adolescent":            ["nfs", "parasite", "crp"],
    "femme_enceinte":               ["nfs", "groupe_sanguin", "urine"],
    "sain":                         ["nfs", "glycemie", "bilan_lipidique", "autre"],
}
NOTES_MEDECIN_ANALYSE = [
    "Bilan de suivi habituel, merci de traiter en priorité normale.",
    "Contexte clinique évocateur — merci de vérifier attentivement les valeurs limites.",
    "Suivi de pathologie chronique, résultat à comparer avec le bilan précédent.",
    "Patient symptomatique — analyse à traiter rapidement si possible.",
    "Bilan pré-thérapeutique avant ajustement de traitement.",
    "Contrôle post-traitement, merci de signaler toute anomalie même mineure.",
]
RESULTATS_PAR_TYPE = {
    "nfs":             "Hb 11,8 g/dL, GB 7 200/mm³, plaquettes 260 000/mm³. Formule leucocytaire normale.",
    "glycemie":        "Glycémie à jeun : 5,4 mmol/L. Dans les valeurs normales.",
    "bilan_renal":     "Créatinine 78 μmol/L, urée 5,2 mmol/L. Clairance estimée > 90 mL/min. Normal.",
    "bilan_hepatique": "ASAT 22 UI/L, ALAT 18 UI/L, bilirubine totale 8 μmol/L. Bilan hépatique normal.",
    "bilan_lipidique": "Cholestérol total 4,8 mmol/L, LDL 2,9 mmol/L, HDL 1,3 mmol/L, triglycérides 1,1 mmol/L.",
    "ionogramme":      "Na+ 138 mmol/L, K+ 4,1 mmol/L, Cl- 102 mmol/L. Ionogramme équilibré.",
    "crp":             "CRP à 4 mg/L. Pas de syndrome inflammatoire significatif.",
    "groupe_sanguin":  "Groupe déterminé et confirmé sur 2 prélèvements distincts, conforme au dossier.",
    "hemostase":       "TP 92%, TCA ratio 1,05. Hémostase normale, pas de trouble de la coagulation détecté.",
    "urine":           "ECBU stérile, leucocyturie négative, pas de nitrites. Pas d'infection urinaire.",
    "parasite":        "Goutte épaisse négative. Aucune forme parasitaire retrouvée au frottis sanguin.",
    "autre":           "Résultat conforme aux valeurs de référence du laboratoire.",
}

total_analyses         = 0
total_alertes_analyses = 0

# ~45 % des patients ont au moins une demande d'analyse durant leur suivi
for patient, age, ant_str, profil_key in random.sample(patients_data, k=int(NB_PATIENTS * 0.45)):
    nb_demandes = random.randint(1, 3)
    consults_patient = consultations_par_patient.get(patient.id, [])
    types_plausibles = TYPES_PAR_PROFIL.get(profil_key, ["nfs", "glycemie", "autre"])

    for _ in range(nb_demandes):
        demandeur = patient.medecin_referent or (random.choice(medecins_list) if medecins_list else None)
        statut = random.choices(
            ['en_attente', 'en_cours', 'terminee', 'annulee'],
            weights=[0.25, 0.20, 0.45, 0.10]
        )[0]
        consultation_liee = random.choice(consults_patient) if consults_patient and random.random() > 0.4 else None

        # Un laborantin n'est assigné que si la demande a été "prise en charge" :
        # jamais pour 'en_attente' (règle du premier arrivé, premier servi côté
        # Laboratoire.tsx), toujours pour 'terminee' (il faut être assigné pour
        # soumettre un résultat), et parfois pour 'annulee'.
        if statut == 'en_attente':
            laborantin = None
        elif statut in ('en_cours', 'terminee'):
            laborantin = random.choice(laborantins_list) if laborantins_list else None
        else:  # annulee
            laborantin = random.choice(laborantins_list) if laborantins_list and random.random() > 0.5 else None

        type_analyse = random.choice(types_plausibles)

        jours_demande = random.randint(0, JOURS_HISTORIQUE)
        date_demande  = now - timedelta(days=jours_demande, hours=random.randint(0, 23))
        date_resultat = None
        resultats     = ""
        valeurs_norm  = ""

        if statut == 'terminee':
            date_resultat = date_demande + timedelta(hours=random.randint(2, 48))
            resultats     = RESULTATS_PAR_TYPE.get(type_analyse, RESULTATS_PAR_TYPE["autre"])
            valeurs_norm  = "Voir tableau de référence laboratoire (valeurs adulte standard)."

        da = DemandeAnalyse.objects.create(
            patient=patient,
            consultation=consultation_liee,
            demandeur=demandeur,
            laborantin=laborantin,
            type_analyse=type_analyse,
            urgence=random.choices(['normale', 'urgente'], weights=[0.82, 0.18])[0],
            statut=statut,
            notes_medecin=random.choice(NOTES_MEDECIN_ANALYSE),
            resultats=resultats,
            valeurs_normales=valeurs_norm,
            date_resultat=date_resultat,
        )

        # date_demande a auto_now_add=True côté modèle : impossible à fixer à
        # la création (même via bulk_create, Django réévalue le champ à
        # l'insertion). Seul un .update() direct — qui contourne pre_save —
        # permet de l'étaler dans le passé comme les autres données du seed.
        DemandeAnalyse.objects.filter(pk=da.pk).update(date_demande=date_demande)

        total_analyses += 1

        # Alerte "résultat disponible" pour les demandes terminées — cohérent
        # avec la notification créée automatiquement par l'action
        # soumettre-resultats côté backend (analyses/views.py).
        if statut == 'terminee':
            Alerte.objects.create(
                patient=patient,
                type='resultat_analyse',
                message=f"Résultat d'analyse disponible : {da.get_type_analyse_display()}",
                statut=random.choices(['non_lue', 'lue', 'traitee'], weights=[0.50, 0.25, 0.25])[0],
            )
            total_alertes_analyses += 1

total_alertes += total_alertes_analyses
print(f"✅ {total_analyses} demandes d'analyse ({total_alertes_analyses} alertes de résultat associées)\n")

# ─── HOSPITALISATIONS ─────────────────────────────────────────────────────────
print("🛏️  Hospitalisations...")
total_hosp = 0
CHAMBRES = [f"{l}{n}" for l in "ABCD" for n in range(1, 9)]
LITS     = ["1", "2", "3"]

MOTIFS_HOSP = [
    "Décompensation cardiaque aiguë avec œdèmes généralisés",
    "Crise hyperglycémique — glycémie capillaire à 28 mmol/L",
    "Paludisme grave avec signes de gravité (convulsions, trouble de conscience)",
    "Pneumopathie communautaire sévère nécessitant antibiothérapie IV",
    "AVC ischémique sylvien gauche confirmé au scanner",
    "Insuffisance rénale aiguë sur néphropathie chronique",
    "Sepsis sévère — foyer pulmonaire probable",
    "Douleur vaso-occlusive drépanocytaire résistante aux antalgiques oraux",
    "Hémorragie digestive haute — méléna abondant",
    "Post-opératoire cholécystectomie laparoscopique",
    "Prééclampsie sévère à 34 SA — hospitalisation pour surveillance",
    "Crise épileptique prolongée — état de mal épileptique",
    "Tuberculose pulmonaire bacillifère — isolement et instauration traitement",
]
DIAG_HOSP_SORTIE = [
    "Stabilisation obtenue sous traitement médical. Équilibre tensionnel satisfaisant.",
    "Normoglycémie rétablie. Insulinothérapie optimisée. Éducation thérapeutique réalisée.",
    "Apyrexie obtenue à J5. Traitement antipaludéen complété. Bonne récupération.",
    "Amélioration clinique et radiologique. Relais per os possible. Sortie autorisée.",
    "Déficit neurologique stable. Rééducation débutée. Transfert en SSR prévu.",
    "Fonction rénale améliorée (créatinine à 145 μmol/L). Régime suivi.",
    "Apyrexie à J4. Hémocultures stériles. Antibiothérapie relayée per os.",
    "Douleur contrôlée à EVA 2/10. Hydratation correcte. Hb stable à 8,2 g/dL.",
    "Hémostase obtenue par FOGD (clips). Pas de récidive hémorragique. IPP IV relayé.",
    "Suites opératoires simples. Pas d'infection de paroi. Reprise du transit.",
    "TA contrôlée, protéinurie diminuée. Accouchement déclenché à 36 SA. Mère et enfant bien.",
    "Stabilisation sous Diazépam IV. Traitement antiépileptique réajusté.",
    "Début de traitement antituberculeux RHZE bien toléré. BK en cours de négativation.",
]

# ~25% des patients hospitalisés
patients_a_hospitaliser = random.sample(patients_data, k=max(1, int(NB_PATIENTS * 0.25)))
for patient, age, ant_str, profil_key in patients_a_hospitaliser:
    # Certains profils peuvent avoir 2 hospitalisations
    nb_hosp = 2 if profil_key in ("drepanocytaire", "insuffisant_renal", "diabetique_t2_desequilibre") and random.random() < 0.4 else 1
    medecin_ref = patient.medecin_referent
    medecins_pool = medecins_list if medecins_list else [medecin_ref]

    for h in range(nb_hosp):
        medecin_h = medecin_ref or random.choice(medecins_pool)
        svc_h = medecin_h.service if medecin_h else random.choice(list(services.values()))
        jours_ecoul = random.randint(3, JOURS_HISTORIQUE - 5)
        d_admis = now - timedelta(days=jours_ecoul + h * 45)
        duree = random.randint(3, 21)
        est_terminee = (d_admis + timedelta(days=duree)) < now

        hosp = Hospitalisation.objects.create(
            patient=patient, service=svc_h, medecin_responsable=medecin_h,
            chambre=random.choice(CHAMBRES), lit=random.choice(LITS),
            motif_admission=random.choice(MOTIFS_HOSP),
            diagnostic_entree=random.choice(DIAGNOSTICS),
            date_admission=d_admis,
            date_sortie_prevue=(d_admis + timedelta(days=duree)).date(),
            statut=StatutHospitalisation.TERMINEE if est_terminee else StatutHospitalisation.EN_COURS,
        )
        if est_terminee:
            hosp.date_sortie = d_admis + timedelta(days=duree)
            hosp.diagnostic_sortie = random.choice(DIAG_HOSP_SORTIE)
            hosp.save()
        total_hosp += 1

print(f"✅ {total_hosp} hospitalisations\n")

# ─── URGENCES ─────────────────────────────────────────────────────────────────
print("🚑 Urgences...")
total_urgences = 0
infirmiers_list = [e for e in employes if e.role == 'infirmier']
service_urgences = services.get("Urgences")
patients_list = [p for p, age, ant, pk in patients_data]

MOTIFS_URGENCE = [
    # Cardiovasculaires
    "Douleur thoracique constrictive irradiant dans le bras gauche",
    "Palpitations rapides et malaise — syncope brève",
    "Oedème aigu du poumon — détresse respiratoire sévère",
    # Neurologiques
    "Déficit moteur brutal du membre supérieur droit — suspicion AVC",
    "Crise convulsive généralisée tonico-clonique",
    "Céphalée en coup de tonnerre — suspicion HSA",
    "Trouble de conscience brutal — Glasgow 10/15",
    # Infectieux
    "Fièvre à 40°C avec frissons et trouble de conscience",
    "Diarrhée profuse et vomissements — déshydratation sévère",
    "Dyspnée fébrile — suspicion pneumonie grave",
    # Traumatiques
    "Traumatisme crânien suite à accident de la voie publique",
    "Fracture ouverte du tibia — accident moto",
    "Plaie profonde et hémorragique du bras droit",
    "Contusions multiples suite à agression",
    "Brûlure du 2ème degré sur 20% de la surface corporelle",
    # Abdominaux
    "Douleur abdominale périombilicale migrant en FID — suspicion appendicite",
    "Hémorragie digestive — méléna et lipothymie",
    "Douleur biliaire intense irradiant dans l'épaule droite",
    # Autres urgences fréquentes au Sénégal
    "Crise vaso-occlusive drépanocytaire — douleurs osseuses intenses",
    "Hyperglycémie majeure — polydipsie, polyurie, confusion légère",
    "Hypoglycémie profonde — patient retrouvé inconscient",
    "Réaction allergique aiguë — urticaire généralisée et angiœdème",
    "Morsure de serpent — oedème progressif du membre",
    "Intoxication aux organophosphorés (pesticides)",
    "Accouchement imminent — patiente à 39 SA dilatée à 8 cm",
]

def creer_passage(patient, niveau_tri, mode_arrivee, statut, decision=None, jours_max=JOURS_HISTORIQUE):
    inf  = random.choice(infirmiers_list) if infirmiers_list else None
    med  = random.choice(medecins_list)   if medecins_list   else None
    j    = random.randint(0, jours_max)
    h    = random.randint(0, 23)
    d_arr = now - timedelta(days=j, hours=h, minutes=random.randint(0, 59))

    motif_choisi = random.choice(MOTIFS_URGENCE)
    # Cohérence motif / niveau
    if niveau_tri == 1:
        motif_choisi = random.choice([m for m in MOTIFS_URGENCE if any(k in m.lower() for k in ["arrêt", "inconscient", "œdème aigu", "avc", "hémorragie", "hyperglycémie", "accouchement"])] or MOTIFS_URGENCE)

    p = PassageUrgence.objects.create(
        patient=patient, service=service_urgences,
        infirmier_accueil=inf,
        medecin_examinateur=med if statut != StatutUrgence.EN_ATTENTE else None,
        date_arrivee=d_arr,
        mode_arrivee=mode_arrivee,
        niveau_tri=niveau_tri,
        motif=motif_choisi,
        statut=statut,
        diagnostic=random.choice(DIAGNOSTICS) if statut == StatutUrgence.SORTI else '',
    )
    if statut == StatutUrgence.SORTI:
        p.decision   = decision or DecisionSortie.DOMICILE
        p.date_sortie = d_arr + timedelta(hours=random.randint(1, 12))
        p.save()
    return p

def niveau_aleatoire():
    return random.choices([1, 2, 3, 4, 5], weights=[0.05, 0.15, 0.35, 0.30, 0.15])[0]

def mode_aleatoire():
    return random.choices(list(ModeArrivee), weights=[0.48, 0.32, 0.04, 0.11, 0.05])[0]

def statut_decision_aleatoire():
    st = random.choices(
        [StatutUrgence.EN_ATTENTE, StatutUrgence.EN_CONSULTATION, StatutUrgence.SORTI],
        weights=[0.07, 0.06, 0.87]
    )[0]
    dec = None
    if st == StatutUrgence.SORTI:
        dec = random.choices(
            list(DecisionSortie),
            weights=[0.62, 0.18, 0.05, 0.10, 0.05]
        )[0]
    return st, dec

# ── 1. Couverture garantie de tous les cas ────────────────────────────────────
# Chaque niveau × 4 (pour avoir des volumes dans les stats)
for niv in [1, 2, 3, 4, 5]:
    for _ in range(4):
        creer_passage(random.choice(patients_list), niv, mode_aleatoire(),
                      StatutUrgence.SORTI, random.choice(list(DecisionSortie)),
                      jours_max=JOURS_HISTORIQUE)
        total_urgences += 1

# Chaque mode × 3
for mode in list(ModeArrivee):
    for _ in range(3):
        creer_passage(random.choice(patients_list), niveau_aleatoire(), mode,
                      StatutUrgence.SORTI, random.choice(list(DecisionSortie)),
                      jours_max=JOURS_HISTORIQUE)
        total_urgences += 1

# Chaque décision × 3 (décès × 2 — rare mais présent)
for dec in list(DecisionSortie):
    nb = 2 if dec == DecisionSortie.DECES else 3
    for _ in range(nb):
        niv = random.choice([1, 2]) if dec == DecisionSortie.DECES else niveau_aleatoire()
        creer_passage(random.choice(patients_list), niv, mode_aleatoire(),
                      StatutUrgence.SORTI, dec, jours_max=JOURS_HISTORIQUE)
        total_urgences += 1

# ── 2. File d'attente en cours (patients présents maintenant) ─────────────────
# 4 à 7 en attente de tri
for _ in range(random.randint(4, 7)):
    creer_passage(random.choice(patients_list), niveau_aleatoire(), mode_aleatoire(),
                  StatutUrgence.EN_ATTENTE, jours_max=0)
    total_urgences += 1

# 3 à 5 en consultation active
for _ in range(random.randint(3, 5)):
    creer_passage(random.choice(patients_list), random.choice([1, 2, 3]), mode_aleatoire(),
                  StatutUrgence.EN_CONSULTATION, jours_max=0)
    total_urgences += 1

# ── 3. Volume historique jusqu'à NB_URGENCES ─────────────────────────────────
while total_urgences < NB_URGENCES:
    st, dec = statut_decision_aleatoire()
    # Dans l'historique : tout le monde est sorti (les "en cours" = aujourd'hui uniquement)
    if st != StatutUrgence.SORTI:
        st, dec = StatutUrgence.SORTI, DecisionSortie.DOMICILE
    creer_passage(random.choice(patients_list), niveau_aleatoire(), mode_aleatoire(),
                  st, dec, jours_max=JOURS_HISTORIQUE)
    total_urgences += 1

print(f"✅ {total_urgences} passages aux urgences\n")

# ─── RÉSUMÉ ───────────────────────────────────────────────────────────────────
print("═" * 55)
print("🏥  SEED TERMINÉ — Résumé complet :")
print(f"   🏢 Services         : {len(services)}")
print(f"   👔 Employés         : {len(employes)}")
print(f"   👤 Patients         : {NB_PATIENTS}")
print(f"   📊 Signes vitaux    : {total_sv}")
print(f"   🩺 Consultations    : {total_consult}")
print(f"   📅 Rendez-vous      : {total_rdv}")
print(f"   🔬 Demandes d'analyse : {total_analyses}")
print(f"   🛏️  Hospitalisations : {total_hosp}")
print(f"   🚑 Passages urgences: {total_urgences}")
print(f"   🚨 Alertes          : {total_alertes} (dont {total_alertes_analyses} résultats d'analyse)")
print("═" * 55)
print("✅ Base de données peuplée avec succès !")