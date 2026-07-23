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

from django.db import transaction
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
from comptes.models import Employe, Specialite, HabilitationService
from analyses.models import DemandeAnalyse
from disponibilites.models import (
    CreneauDisponibilite, ExceptionDisponibilite, JourSemaine, TypeCreneau,
    TypeException, StatutException, AssignationPatient, Shift,
)
from morgue.models import Deces, Autopsie, LieuDeces, StatutDeces, TypeAutopsie
from antecedents.models import Antecedent, TypeAntecedent, StatutAntecedent
from chirurgie.models import Operation, SalleBloc, StatutOperation

@transaction.atomic
def run_seed():
    """Nettoie puis régénère l'intégralité du jeu de données de démonstration,
    dans une seule transaction (tout ou rien : en cas d'erreur en cours de
    route, la base repart exactement dans l'état où elle était avant)."""

    random.seed(42)

    # ─── CONFIG ───────────────────────────────────────────────────────────────────
    JOURS_HISTORIQUE = 180   # 6 mois de données
    NB_PATIENTS      = 240   # x3 par rapport au seed précédent (80)
    NB_URGENCES      = 420   # scalé avec le volume de patients (150 → x2.8)
    NB_MESURES_MIN   = 6
    NB_MESURES_MAX   = 25

    now = timezone.now()

    # ─── NETTOYAGE ────────────────────────────────────────────────────────────────
    print("🗑️  Nettoyage...")
    for Model, label in [
        (Autopsie,        "autopsie(s)"),
        (Deces,           "décès enregistré(s)"),
        (AssignationPatient, "assignation(s) infirmier ↔ patient"),
        (DemandeAnalyse,  "demande(s) d'analyse"),
        (PassageUrgence,  "passage(s) urgences"),
        (Operation,       "opération(s) chirurgicale(s)"),
        (SalleBloc,       "salle(s) de bloc"),
        (Antecedent,      "antécédent(s) détaillé(s)"),
        (Hospitalisation, "hospitalisation(s)"),
        (Alerte,          "alerte(s)"),
        (RendezVous,      "rendez-vous"),
        (Consultation,    "consultation(s)"),
        (SignesVitaux,    "signes vitaux"),
        (Patient,         "patient(s)"),
        (ExceptionDisponibilite, "exception(s) de disponibilité"),
        (CreneauDisponibilite,   "créneau(x) de disponibilité"),
        (HabilitationService,    "habilitation(s) service"),
        (Employe,         "employé(s)"),
        (Specialite,      "spécialité(s)"),
        (Service,         "service(s)"),
    ]:
        nb = Model.objects.count()
        if nb:
            Model.objects.all().delete()
            print(f"   - {nb} {label} supprimé(s)")

    nb, _ = User.objects.filter(is_superuser=False).delete()
    print(f"   - {nb} user(s) Django supprimé(s)\n✅ Nettoyé.\n")

    # ─── SPÉCIALITÉS MÉDICALES ────────────────────────────────────────────────────
    print("🏥 Spécialités médicales...")
    SPECIALITES_DATA = [
        # Cardiologie
        ("Cardiologie générale", False),
        ("Cardiologie interventionnelle", True),
        ("Rythmologie", False),
        # Médecine interne & infectiologie
        ("Médecine interne", False),
        ("Maladies infectieuses", False),
        # Pédiatrie
        ("Pédiatrie générale", False),
        ("Néonatologie", False),
        # Diabétologie
        ("Diabétologie", False),
        ("Endocrinologie", False),
        # Urgences
        ("Médecine d'urgence", False),
        ("Réanimation polyvalente", False),
        # Chirurgie
        ("Chirurgie digestive", True),
        ("Chirurgie orthopédique", True),
        ("Chirurgie vasculaire", True),
        ("Chirurgie thoracique", True),
        ("Chirurgie cardiaque", True),
        # Gynécologie-Obstétrique
        ("Gynécologie-Obstétrique", True),
        # Neurologie
        ("Neurologie générale", False),
        ("Neurologie vasculaire", False),
        # Pneumologie
        ("Pneumologie générale", False),
        ("Pneumologie-Infectiologie", False),
        # Néphro-dialyse
        ("Néphrologie", False),
        ("Dialyse péritonéale", False),
        # ORL-Ophtalmo
        ("ORL-Chirurgie cervico-faciale", True),
        ("Ophtalmologie", False),
        # Biologie & Anesthésie
        ("Biologie médicale", False),
        ("Anesthésie-Réanimation", False),
    ]

    specialites = {}
    for nom, est_chirurgicale in SPECIALITES_DATA:
        specialites[nom] = Specialite.objects.create(
            nom=nom, est_chirurgicale=est_chirurgicale
        )
    print(f"✅ {len(specialites)} spécialités\n")

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
        ("Sokhna",    "Diouf",    "F", "secretaire", "",                           "sec.sdiouf",     "secretaire123", 25, "Pédiatrie",
         "cdd", date(2023, 9, 1), "Secrétaire médicale en pédiatrie. Accueil des familles, prise de rendez-vous de suivi vaccinal et de croissance, gestion des carnets de santé des enfants."),

        # Diabétologie
        ("Moussa",    "Fall",     "M", "medecin",    "Diabétologie",               "dr.mfall",       "medecin123",    52, "Diabétologie-Endocrinologie",
         "cdi", date(2010, 6, 1), "Diabétologue endocrinologue. Expert en prise en charge du diabète de type 1 et 2, insuffisance thyroïdienne, troubles de l'axe corticotrope. Consultant régional pour l'OMS sur le diabète en Afrique subsaharienne."),
        ("Coumba",    "Thiam",    "F", "medecin",    "Endocrinologie",             "dr.cthiam",      "medecin123",    46, "Diabétologie-Endocrinologie",
         "cdi", date(2013, 9, 1), "Endocrinologue spécialisée dans les maladies de la thyroïde et les troubles hormonaux. Prise en charge des grossesses diabétiques, éducation thérapeutique en diabétologie."),
        ("Astou",     "Sarr",     "F", "infirmier",  "",                           "inf.asarr",      "infirmier123",  33, "Diabétologie-Endocrinologie",
         "cdd", date(2022, 4, 1), "Infirmière diabétologue. Éducation thérapeutique des patients diabétiques, apprentissage de l'auto-surveillance glycémique, gestion des pompes à insuline, suivi des plaies diabétiques."),
        ("Ousmane",   "Ndiaye",   "M", "secretaire", "",                           "sec.ondiaye",    "secretaire123", 31, "Diabétologie-Endocrinologie",
         "cdi", date(2021, 2, 1), "Secrétaire médical en diabétologie-endocrinologie. Prise de rendez-vous de suivi glycémique, gestion des dossiers d'éducation thérapeutique, coordination avec le laboratoire pour les bilans HbA1c."),

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
        ("Yacine",    "Diop",     "F", "secretaire", "",                           "sec.ydiop",      "secretaire123", 29, "Chirurgie générale",
         "cdd", date(2023, 3, 1), "Secrétaire médicale en chirurgie. Planification du bloc opératoire, gestion des dossiers pré et post-opératoires, prise de rendez-vous de consultation chirurgicale."),

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
        ("Ndèye Awa", "Thiam",    "F", "secretaire", "",                           "sec.athiam",     "secretaire123", 27, "Neurologie",
         "cdd", date(2023, 5, 1), "Secrétaire médicale en neurologie. Prise de rendez-vous de consultation et d'EEG, gestion des dossiers de suivi post-AVC, coordination avec l'unité neurovasculaire."),

        # Pneumologie
        ("Boubacar",  "Diallo",   "M", "medecin",    "Pneumologie-Infectiologie",  "dr.bdiallo",     "medecin123",    47, "Pneumologie",
         "cdi", date(2013, 3, 1), "Pneumologue infectiologue. Prise en charge de la tuberculose pulmonaire et extrapulmonaire, BPCO, asthme sévère, pneumonies communautaires. Référent tuberculose de la région de Dakar."),
        ("Aïssatou",  "Sarr",     "F", "infirmier",  "",                           "inf.asrr",       "infirmier123",  29, "Pneumologie",
         "cdd", date(2023, 4, 1), "Infirmière en pneumologie. Aérosolthérapie, spirométrie, éducation à l'utilisation des inhalateurs, surveillance des patients sous oxygénothérapie."),
        ("Cheikhouna", "Ba",      "M", "secretaire", "",                           "sec.cba",        "secretaire123", 32, "Pneumologie",
         "cdi", date(2020, 11, 1), "Secrétaire médical en pneumologie. Prise de rendez-vous de consultation et de spirométrie, gestion des dossiers de suivi tuberculose et BPCO."),

        # Néphro-dialyse
        ("Lamine",    "Gueye",    "M", "medecin",    "Néphro-dialyse",             "dr.lgueye",      "medecin123",    44, "Néphro-dialyse",
         "cdi", date(2016, 1, 4), "Néphrologue. Prise en charge de l'insuffisance rénale chronique et aiguë, dialyse hémodialyse et dialyse péritonéale, bilan pré-transplantation rénale."),
        ("Seynabou",  "Mbaye",    "F", "infirmier",  "",                           "inf.smbaye",     "infirmier123",  30, "Néphro-dialyse",
         "cdi", date(2020, 7, 1), "Infirmière néphrologue dialyse. Pose et surveillance des fistules artério-veineuses, gestion des séances de dialyse, éducation des patients sur le régime alimentaire et hydrique."),
        ("Bineta",    "Sow",      "F", "secretaire", "",                           "sec.bsow",       "secretaire123", 28, "Néphro-dialyse",
         "cdd", date(2023, 8, 1), "Secrétaire médicale en néphro-dialyse. Planification des séances de dialyse, gestion des dossiers de suivi de la fonction rénale, prise de rendez-vous pré-transplantation."),

        # ORL-Ophtalmo
        ("Fatoumata", "Sow",      "F", "medecin",    "ORL-Chirurgie cervico-faciale", "dr.fsow",     "medecin123",    38, "ORL-Ophtalmologie",
         "cdi", date(2018, 8, 1), "ORL chirurgienne. Amygdalectomies, adénoïdectomies, rhinoplasties, chirurgie des sinus, otites chroniques. Suivi des cancers ORL en coopération avec l'oncologie."),
        ("Dieynaba",  "Ndour",    "F", "infirmier",  "",                           "inf.dndour",     "infirmier123",  27, "ORL-Ophtalmologie",
         "cdd", date(2024, 1, 8), "Infirmière ORL et ophtalmologie. Préparation des consultations spécialisées, instillations oculaires, soins post-opératoires ORL, audiométrie de dépistage."),
        ("Alioune",   "Diagne",   "M", "secretaire", "",                           "sec.adiagne",    "secretaire123", 30, "ORL-Ophtalmologie",
         "cdi", date(2021, 6, 1), "Secrétaire médical en ORL-ophtalmologie. Prise de rendez-vous de consultation, gestion des dossiers d'audiométrie et d'examens de la vue, coordination des interventions programmées."),

        # Laboratoire
        ("Oumar",     "Thiam",    "M", "laborantin", "Biologie médicale",          "lab.othiam",     "labo123",       38, "Laboratoire",
         "cdi", date(2016, 6, 1), "Biologiste médical responsable du laboratoire. Supervision des analyses hématologiques, biochimiques et microbiologiques. Validation et interprétation des résultats critiques. Gestion du contrôle qualité."),
        ("Djibril",   "Tall",     "M", "laborantin", "Biochimie clinique",         "lab.dtall",      "labo123",       36, "Laboratoire",
         "cdi", date(2018, 3, 1), "Laborantin spécialisé en biochimie. Dosages enzymatiques, bilan lipidique, marqueurs cardiaques (troponine, BNP), bilan rénal et hépatique, HbA1c."),
        ("Oumou",     "Badji",    "F", "laborantin", "Hématologie biologique",     "lab.obadji",     "labo123",       34, "Laboratoire",
         "cdi", date(2019, 5, 1), "Laborantine hématologue. Numération formule sanguine, bilan de coagulation, électrophorèse de l'hémoglobine (drépanocytose), tests de paludisme par goutte épaisse et TDR."),
        ("Fatimata",  "Kane",     "F", "secretaire", "",                           "sec.fkane",      "secretaire123", 26, "Laboratoire",
         "cdd", date(2023, 7, 1), "Secrétaire de laboratoire. Enregistrement des demandes d'analyses, remise des résultats, gestion administrative des dossiers de prélèvement."),
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

        # Lier la specialite du modèle si elle existe
        specialite_obj = specialites.get(specialite) if specialite else None

        emp = Employe.objects.create(
            user=user, nom=nom, prenom=prenom, date_naissance=dnaiss,
            sexe=sexe, telephone=tel(),
            adresse=f"{random.choice(QUARTIERS)}, Dakar",
            role=role, specialite=specialite,
            specialite_principale=specialite_obj,
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
        else:
            # Pas de médecin dans ce service (cas du Laboratoire) : le responsable
            # technique senior (laborantin) fait office de chef de service.
            laborantins_svc = [e for e in employes if e.role == 'laborantin' and e.service_id == svc_obj.id]
            if laborantins_svc:
                chef = laborantins_svc[0]
                svc_obj.chef_de_service = chef
                svc_obj.save()
                print(f"   {svc_obj.nom} → {chef.prenom} {chef.nom} (responsable technique)")
    print()

    # ── Habilitations services ─────────────────────────────────────────────────────
    print("🔑 Habilitations des employés sur les services...")
    total_habilitations = 0

    # Chaque employé est habilité sur au moins son service de rattachement
    for emp in employes:
        if emp.service:
            HabilitationService.objects.create(
                employe=emp, service=emp.service,
                date_debut=emp.date_debut_contrat or date.today(),
                date_fin=emp.date_fin_contrat,  # null si CDI
                actif=emp.actif
            )
            total_habilitations += 1

    # Quelques habilitations supplémentaires pour refléter la mobilité réelle
    # (chirurgiens pouvant intervenir dans plusieurs services, consultants externes)
    medecins_tous = [e for e in employes if e.role == 'medecin']
    for medecin in random.sample(medecins_tous, k=min(8, len(medecins_tous))):
        # Habilitation dans un 2e service
        autres_services = [s for s in services.values() if s.id != medecin.service_id]
        if autres_services:
            svc_supp = random.choice(autres_services)
            try:
                HabilitationService.objects.create(
                    employe=medecin, service=svc_supp,
                    date_debut=date.today() - timedelta(days=random.randint(30, 365)),
                    date_fin=None,  # Sans limitation pour ces habilitations supplémentaires
                    actif=True
                )
                total_habilitations += 1
            except:
                pass  # Doublon possible

    print(f"✅ {total_habilitations} habilitations (service principal + complémentaires)\n")

    # ── Renfort d'équipe (x3 médecins / infirmiers au total) ──────────────────────
    # Les employés ci-dessus sont l'équipe "historique" avec bio détaillée.
    # On complète avec du personnel généré pour atteindre un effectif réaliste
    # d'hôpital (une dizaine de services actifs ne peut pas tourner avec 1 seul
    # médecin chacun).
    print("👥 Renfort d'équipe (médecins et infirmiers supplémentaires)...")

    SPECIALITES_PAR_SERVICE = {
        "Cardiologie":                  ["Cardiologie générale", "Rythmologie", "Cardiologie interventionnelle"],
        "Médecine interne":             ["Médecine interne générale", "Médecine polyvalente"],
        "Pédiatrie":                    ["Pédiatrie générale", "Néonatologie"],
        "Diabétologie-Endocrinologie":  ["Diabétologie", "Endocrinologie"],
        "Urgences":                     ["Médecine d'urgence", "Réanimation polyvalente"],
        "Chirurgie générale":           ["Chirurgie viscérale", "Chirurgie générale"],
        "Gynécologie-Obstétrique":      ["Gynécologie médicale", "Obstétrique"],
        "Neurologie":                   ["Neurologie générale", "Neurovasculaire"],
        "Pneumologie":                  ["Pneumologie générale", "Allergologie respiratoire"],
        "Néphro-dialyse":               ["Néphrologie", "Dialyse péritonéale"],
        "ORL-Ophtalmologie":            ["ORL", "Ophtalmologie"],
    }
    EXTRA_MEDECINS_PAR_SERVICE  = 3   # x11 services cliniques (hors Laboratoire) ≈ +33
    EXTRA_INFIRMIERS_PAR_SERVICE = 4  # x12 services (Laboratoire compris) ≈ +24

    usernames_pris = {e.user.username for e in employes}

    def username_libre(prefixe, nom):
        base = f"{prefixe}.{nom.lower().replace(' ', '').replace('-', '')[:10]}"
        candidat, n = base, 1
        while candidat in usernames_pris:
            n += 1
            candidat = f"{base}{n}"
        usernames_pris.add(candidat)
        return candidat

    def creer_employe_genere(role, svc_nom, prefixe_username, password, specialite=""):
        sexe = random.choice(['M', 'F'])
        prenom, nom = prenom_nom(sexe)
        username = username_libre(prefixe_username, nom)
        age = random.randint(27, 56)
        annee = date.today().year - age
        dnaiss = date(annee, random.randint(1, 12), random.randint(1, 28))
        type_contrat = random.choices(['cdi', 'cdd'], weights=[0.75, 0.25])[0]
        date_debut = date.today() - timedelta(days=random.randint(180, 8 * 365))
        date_fin = date(date_debut.year + 2, date_debut.month, date_debut.day) if type_contrat == 'cdd' else None

        user = User.objects.create_user(
            username=username, email=f"{username}@healthtracker.sn",
            password=password, first_name=prenom, last_name=nom,
        )
        if role == 'medecin':
            desc = f"Médecin en {svc_nom}. Consultations, suivi des patients hospitalisés et participation aux gardes du service."
        else:
            desc = f"Infirmier(ère) en {svc_nom}. Soins courants, surveillance des constantes, administration des traitements prescrits."

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
        return emp

    nb_medecins_generes, nb_infirmiers_generes = 0, 0
    for svc_nom in SERVICES_DATA:
        svc_nom = svc_nom[0]
        if svc_nom == "Laboratoire":
            continue  # pas de médecin au laboratoire, cf. logique chef de service plus haut
        specialites = SPECIALITES_PAR_SERVICE.get(svc_nom, [""])
        for _ in range(EXTRA_MEDECINS_PAR_SERVICE):
            creer_employe_genere('medecin', svc_nom, 'dr', 'medecin123', random.choice(specialites))
            nb_medecins_generes += 1

    for svc_nom in SERVICES_DATA:
        svc_nom = svc_nom[0]
        for _ in range(EXTRA_INFIRMIERS_PAR_SERVICE):
            creer_employe_genere('infirmier', svc_nom, 'inf', 'infirmier123')
            nb_infirmiers_generes += 1

    print(f"✅ +{nb_medecins_generes} médecins, +{nb_infirmiers_generes} infirmiers "
          f"(total : {sum(1 for e in employes if e.role == 'medecin')} médecins, "
          f"{sum(1 for e in employes if e.role == 'infirmier')} infirmiers)\n")

    # ─── DISPONIBILITÉS ────────────────────────────────────────────────────────────
    # Sans ces créneaux récurrents, l'agenda de prise de rendez-vous est vide pour
    # tout le monde (aucune date/heure disponible ne peut être proposée à la
    # secrétaire), donc c'est indispensable au bon fonctionnement de la démo.
    print("🗓️  Créneaux de disponibilité...")

    medecins_tous = [e for e in employes if e.role == 'medecin']

    JOURS_OUVRES = [JourSemaine.LUNDI, JourSemaine.MARDI, JourSemaine.MERCREDI, JourSemaine.JEUDI, JourSemaine.VENDREDI]

    nb_creneaux = 0
    for medecin in medecins_tous:
        # Variante d'emploi du temps selon le service pour éviter que tout le
        # monde ait exactement le même agenda (peu réaliste et un peu ennuyeux
        # en démo).
        est_urgentiste = medecin.service and medecin.service.nom == "Urgences"

        if est_urgentiste:
            # Les urgentistes tournent en gardes de 24h, réparties sur la semaine
            # plutôt qu'en créneaux de consultation classiques.
            jours_garde = random.sample(JOURS_OUVRES + [JourSemaine.SAMEDI, JourSemaine.DIMANCHE], k=3)
            for jour in jours_garde:
                CreneauDisponibilite.objects.create(
                    employe=medecin, jour=jour,
                    heure_debut="08:00", heure_fin="20:00",
                    type=TypeCreneau.GARDE, actif=True,
                )
                nb_creneaux += 1
            continue

        # Matin, tous les jours ouvrés
        for jour in JOURS_OUVRES:
            CreneauDisponibilite.objects.create(
                employe=medecin, jour=jour,
                heure_debut="08:00", heure_fin="12:30",
                type=TypeCreneau.PRESENTIEL, actif=True,
            )
            nb_creneaux += 1

        # Après-midi : la plupart travaillent aussi l'après-midi, sauf le mercredi
        # (fréquent au Sénégal comme ailleurs, jour allégé), et environ 1 médecin
        # sur 5 fait de la téléconsultation le vendredi après-midi plutôt qu'en
        # présentiel.
        for jour in JOURS_OUVRES:
            if jour == JourSemaine.MERCREDI:
                continue
            type_creneau = TypeCreneau.PRESENTIEL
            if jour == JourSemaine.VENDREDI and random.random() < 0.2:
                type_creneau = TypeCreneau.TELECONSULTATION
            CreneauDisponibilite.objects.create(
                employe=medecin, jour=jour,
                heure_debut="14:30", heure_fin="17:30",
                type=type_creneau, actif=True,
            )
            nb_creneaux += 1

        # Un samedi matin sur trois environ (permanence réduite)
        if random.random() < 0.35:
            CreneauDisponibilite.objects.create(
                employe=medecin, jour=JourSemaine.SAMEDI,
                heure_debut="09:00", heure_fin="12:00",
                type=TypeCreneau.PRESENTIEL, actif=True,
            )
            nb_creneaux += 1

    print(f"✅ {nb_creneaux} créneaux pour {len(medecins_tous)} médecins\n")

    # ─── CONGÉS / ABSENCES (demandes) ──────────────────────────────────────────────
    # Un mélange de statuts (validé / en attente / rejeté) pour pouvoir tester
    # l'écran de gestion des demandes dans les trois états.
    print("🌴 Congés et absences...")

    MOTIFS_CONGE     = ["Congés annuels", "Repos après garde prolongée", "Événement familial"]
    MOTIFS_ABSENCE   = ["Rendez-vous médical personnel", "Absence justifiée"]
    MOTIFS_FORMATION = ["Congrès médical à Dakar", "Formation continue DPC", "Séminaire de spécialité"]
    MOTIFS_MISSION   = ["Mission de vaccination itinérante", "Consultation dans un centre de santé partenaire"]

    nb_exceptions = 0

    def creer_exception(employe, type_, jour_debut, duree_jours, motif, statut):
        nonlocal nb_exceptions
        ExceptionDisponibilite.objects.create(
            employe=employe, type=type_,
            date_debut=jour_debut,
            date_fin=jour_debut + timedelta(days=duree_jours - 1),
            motif=motif,
            valide=(statut == StatutException.VALIDE),
            statut=statut,
        )
        nb_exceptions += 1

    aujourdhui = timezone.localdate()

    # Personnel non-médecin : quelques congés/absences classiques, déjà validés,
    # répartis dans le passé récent et le futur proche.
    personnel_non_medecin = [e for e in employes if e.role != 'medecin' and e.role != 'admin']
    for employe in random.sample(personnel_non_medecin, k=min(10, len(personnel_non_medecin))):
        type_ = random.choice([TypeException.CONGE, TypeException.ABSENCE])
        offset = random.randint(-25, 40)
        duree = random.randint(1, 7) if type_ == TypeException.CONGE else 1
        motif = random.choice(MOTIFS_CONGE if type_ == TypeException.CONGE else MOTIFS_ABSENCE)
        creer_exception(employe, type_, aujourdhui + timedelta(days=offset), duree, motif, StatutException.VALIDE)

    # Médecins : un panel plus complet pour couvrir les trois statuts et le cas
    # "garde exceptionnelle" (qui ne bloque pas l'agenda, voir _exception_bloquante).
    for i, medecin in enumerate(medecins_tous):
        if i % 3 == 0:
            # Congé validé, dans le futur proche : bloque bien l'agenda de
            # prise de rendez-vous (bon cas de test pour l'écran secrétaire).
            creer_exception(
                medecin, TypeException.CONGE,
                aujourdhui + timedelta(days=random.randint(5, 30)),
                random.randint(3, 10),
                random.choice(MOTIFS_CONGE), StatutException.VALIDE,
                )
        elif i % 3 == 1:
            # Demande de formation encore en attente de validation par
            # l'administration : ne bloque pas encore l'agenda tant qu'elle
            # n'est pas validée.
            creer_exception(
                medecin, TypeException.FORMATION,
                aujourdhui + timedelta(days=random.randint(10, 45)),
                random.randint(1, 3),
                random.choice(MOTIFS_FORMATION), StatutException.EN_ATTENTE,
                )
        else:
            # Demande de mission rejetée (ex. dates non compatibles avec le
            # service) : reste visible dans l'historique mais sans effet.
            creer_exception(
                medecin, TypeException.MISSION,
                aujourdhui + timedelta(days=random.randint(10, 45)),
                random.randint(1, 4),
                random.choice(MOTIFS_MISSION), StatutException.REJETE,
                )

    # Une poignée de gardes exceptionnelles validées (n'empêchent pas de prendre
    # rendez-vous ce jour-là, elles s'ajoutent aux créneaux habituels).
    for medecin in random.sample(medecins_tous, k=min(4, len(medecins_tous))):
        creer_exception(
            medecin, TypeException.GARDE,
            aujourdhui + timedelta(days=random.randint(1, 20)),
            1, "Garde exceptionnelle (renfort service)", StatutException.VALIDE,
            )

    print(f"✅ {nb_exceptions} congés/absences/formations/missions (validés, en attente et rejetés)\n")
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

    print(f"✅ {total_consult} consultations\n")

    # ─── RENDEZ-VOUS (PLANNING MÉDECIN / MODULE CALENDRIER) ────────────────────
    # Contrairement à Consultation (liée uniquement au patient), RendezVous
    # alimente le module Calendrier — RendezVous.medecin est le champ que lisent
    # à la fois ConsultViewSet.mon_planning (agenda du médecin connecté) et
    # ConsultViewSet.planning (vue générique Jour/Semaine, filtre ?medecin=).
    # Sans lui, ces deux vues restent vides quel que soit le nombre de RDV en
    # base. On couvre volontairement les trois temporalités (passé 'terminé',
    # aujourd'hui, futur) et tous les types d'événement du calendrier
    # (consultation, intervention, réunion, garde, visite postopératoire, autre).
    print("📅 Rendez-vous (planning médecin)...")

    MOTIFS_INTERVENTION = [
        "Cholécystectomie laparoscopique", "Appendicectomie", "Réduction de fracture",
        "Cure de hernie inguinale", "Pose de prothèse de hanche", "Césarienne programmée",
        "Ablation de kyste ovarien", "Amygdalectomie", "Cataracte — phacoémulsification",
    ]
    MOTIFS_VISITE_POSTOP = [
        "Contrôle cicatrisation à J7", "Ablation des fils", "Suivi post-opératoire à 1 mois",
        "Contrôle radiologique de consolidation", "Retrait de drain",
    ]
    MOTIFS_REUNION = [
        "Réunion de service hebdomadaire", "Staff pluridisciplinaire",
        "Revue de morbi-mortalité (RMM)", "Point qualité et sécurité des soins",
        "Coordination inter-services", "Réunion budgétaire du service",
    ]
    MOTIFS_GARDE = ["Garde de nuit", "Garde de week-end", "Astreinte téléphonique"]
    MOTIFS_AUTRE_RDV = ["Entretien administratif", "Formation interne", "Visite de contrôle qualité"]

    total_rdv = 0

    def creer_rdv(patient, medecin, jour_offset, heure, minute, motif, type_ev, duree=30, forcer_statut=None):
        """Crée un RendezVous rattaché à `medecin` (agenda) et `patient` (dossier),
        avec un statut cohérent avec sa position temporelle (passé → terminé,
        aujourd'hui → selon l'heure déjà passée ou non, futur → planifié)."""
        nonlocal total_rdv
        d_heure = (now + timedelta(days=jour_offset)).replace(
            hour=heure, minute=minute, second=0, microsecond=0
        )
        if forcer_statut:
            statut = forcer_statut
        elif jour_offset < 0:
            statut = random.choices(['termine', 'annule'], weights=[0.88, 0.12])[0]
        elif jour_offset == 0:
            statut = 'termine' if d_heure < now else random.choices(['confirme', 'planifie'], weights=[0.7, 0.3])[0]
        else:
            statut = random.choices(['planifie', 'confirme', 'annule'], weights=[0.5, 0.4, 0.10])[0]
        RendezVous.objects.create(
            patient=patient, medecin=medecin, date_heure=d_heure, duree_minutes=duree,
            motif=motif, type_evenement=type_ev, statut=statut,
        )
        total_rdv += 1

    for patient, age, ant_str, profil_key in patients_data:
        medecin = patient.medecin_referent
        if medecin is None:
            continue

        # Passé : 1 à 5 consultations honorées (ou annulées), sur les 60 derniers jours
        for _ in range(random.randint(1, 5)):
            creer_rdv(
                patient, medecin, jour_offset=-random.randint(1, 60),
                heure=random.randint(8, 16), minute=random.choice([0, 15, 30, 45]),
                motif=random.choice(MOTIFS_CONSULT), type_ev='consultation',
            )

        # Aujourd'hui : un peu moins d'un patient sur cinq a un RDV le jour même
        # (pour que l'agenda du jour ne soit jamais vide en ouvrant la démo).
        if random.random() < 0.18:
            creer_rdv(
                patient, medecin, jour_offset=0,
                heure=random.randint(8, 17), minute=random.choice([0, 15, 30, 45]),
                motif=random.choice(MOTIFS_CONSULT), type_ev='consultation',
            )

        # Futur : 0 à 3 RDV, types variés selon le contexte clinique
        for _ in range(random.randint(0, 3)):
            type_ev = random.choices(
                ['consultation', 'intervention', 'visite_postoperatoire', 'autre'],
                weights=[0.70, 0.10, 0.12, 0.08],
            )[0]
            if type_ev == 'intervention':
                motif, duree = random.choice(MOTIFS_INTERVENTION), random.choice([60, 90, 120, 180])
            elif type_ev == 'visite_postoperatoire':
                motif, duree = random.choice(MOTIFS_VISITE_POSTOP), 20
            elif type_ev == 'autre':
                motif, duree = random.choice(MOTIFS_AUTRE_RDV), 30
            else:
                motif, duree = random.choice(MOTIFS_CONSULT), 30
            creer_rdv(
                patient, medecin, jour_offset=random.randint(1, 45),
                heure=random.randint(8, 16), minute=random.choice([0, 15, 30, 45]),
                motif=motif, type_ev=type_ev, duree=duree,
            )

    print(f"✅ {total_rdv} rendez-vous patients (consultations/interventions/suivis)\n")

    # ─── RÉUNIONS DE SERVICE & GARDES ──────────────────────────────────────────
    # Événements administratifs organisés par le chef de service (à défaut, un
    # médecin du service) — rattachés à un patient "support" du service pour
    # respecter la contrainte du modèle (RendezVous.patient est obligatoire,
    # y compris pour ce type d'événement) ; sans incidence fonctionnelle car
    # le planning n'affiche jamais ces types comme liés à un dossier patient.
    print("👥 Réunions de service et gardes...")
    total_reunions_gardes = 0

    patients_par_service = defaultdict(list)
    for p, *_ in patients_data:
        if p.service_id:
            patients_par_service[p.service_id].append(p)
    tous_les_patients = [p for p, *_ in patients_data]

    for nom_service, svc_obj in services.items():
        medecins_du_service = [e for e in employes if e.role == 'medecin' and e.service_id == svc_obj.id]
        if svc_obj.chef_de_service and svc_obj.chef_de_service.role == 'medecin':
            organisateur = svc_obj.chef_de_service
        elif medecins_du_service:
            organisateur = random.choice(medecins_du_service)
        elif medecins_list:
            organisateur = random.choice(medecins_list)
        else:
            continue

        patients_service = patients_par_service.get(svc_obj.id) or tous_les_patients
        if not patients_service:
            continue
        patient_support = random.choice(patients_service)

        # Réunion hebdomadaire : 8 semaines passées (pas toutes tenues) + les
        # 2 prochaines semaines, déjà planifiées.
        for semaine in range(-8, 3):
            if random.random() < 0.75:
                creer_rdv(
                    patient_support, organisateur, jour_offset=semaine * 7,
                    heure=9, minute=0, motif=random.choice(MOTIFS_REUNION),
                    type_ev='reunion', duree=60,
                )
                total_reunions_gardes += 1

        # Gardes : uniquement pour les services qui en assurent une rotation.
        if nom_service in ("Urgences", "Chirurgie générale"):
            equipe_garde = medecins_du_service or [organisateur]
            for jour_offset in (-14, -7, -3, 0, 4, 10, 18):
                garde_medecin = random.choice(equipe_garde)
                statut_garde = 'termine' if jour_offset < 0 else ('confirme' if jour_offset == 0 else 'planifie')
                creer_rdv(
                    patient_support, garde_medecin, jour_offset=jour_offset,
                    heure=20, minute=0, motif=random.choice(MOTIFS_GARDE),
                    type_ev='garde', duree=720, forcer_statut=statut_garde,
                )
                total_reunions_gardes += 1

    print(f"✅ {total_reunions_gardes} réunions/gardes — total rendez-vous planning : {total_rdv}\n")

    # ─── ANTÉCÉDENTS DÉTAILLÉS ────────────────────────────────────────────────────
    print("📋 Antécédents détaillés (liaison avec consultations)...")
    total_antecedents = 0

    for patient, age, ant_str, profil_key in patients_data:
        # Parser les antécédents texte et créer les instances Antecedent
        if ant_str:
            ant_list = [a.strip() for a in ant_str.split(",")]
            consults_patient = consultations_par_patient.get(patient.id, [])

            for ant_libelle in ant_list:
                # Mapper le libellé au type d'antécédent le plus plausible
                if any(kw in ant_libelle.lower() for kw in ["chirurg", "appendic", "cure", "hernior", "ablation", "exci"]):
                    type_ant = TypeAntecedent.CHIRURGIE
                elif any(kw in ant_libelle.lower() for kw in ["allergi", "intolerance"]):
                    type_ant = TypeAntecedent.ALLERGIE
                elif any(kw in ant_libelle.lower() for kw in ["antécédent", "familial", "père", "mère", "frère", "sœur"]):
                    type_ant = TypeAntecedent.FAMILIAL
                else:
                    type_ant = TypeAntecedent.MALADIE_CHRONIQUE

                # Dater l'antécédent quelque part dans le passé (antérieur au patient)
                date_diag = date.today() - timedelta(days=random.randint(30, 8*365))

                # Optionnellement lier à une consultation
                consultation_source = None
                if consults_patient and random.random() > 0.5:
                    consultation_source = random.choice(consults_patient)

                try:
                    Antecedent.objects.create(
                        patient=patient,
                        type_antecedent=type_ant,
                        libelle=ant_libelle,
                        observations="Antécédent connu et documenté." if random.random() > 0.4 else "",
                        statut=StatutAntecedent.ACTIF if random.random() > 0.15 else StatutAntecedent.RESOLU,
                        date_diagnostic=date_diag,
                        consultation_source=consultation_source,
                    )
                    total_antecedents += 1
                except Exception:
                    pass  # Doublon ou erreur - skip silencieusement

    print(f"✅ {total_antecedents} antécédents détaillés créés\n")

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

    # Répartition des patients par service pour garantir une couverture minimale
    # partout, plutôt que de laisser un tirage aléatoire risquer de laisser un
    # service sans aucune hospitalisation.
    patients_par_service = defaultdict(list)
    for pdata in patients_data:
        if pdata[0].service_id:
            patients_par_service[pdata[0].service_id].append(pdata)

    deja_hospitalises = set()

    def creer_hospitalisation(patient, svc_h, medecin_h, offset_jours=0):
        nonlocal total_hosp
        jours_ecoul = random.randint(5, JOURS_HISTORIQUE - 5)
        d_admis = now - timedelta(days=max(jours_ecoul - offset_jours, 2))
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
        deja_hospitalises.add(patient.id)
        return hosp

    # Phase A — couverture garantie : au moins quelques hospitalisations dans
    # CHAQUE service clinique (le Laboratoire n'admet pas de patients, il n'a
    # pas de médecin donc pas de médecin_responsable possible).
    MIN_HOSP_PAR_SERVICE = 10
    for svc_nom, svc_obj in services.items():
        if svc_nom == "Laboratoire":
            continue
        medecins_svc = [e for e in employes if e.role == 'medecin' and e.service_id == svc_obj.id]
        if not medecins_svc:
            continue  # sécurité, ne devrait plus arriver avec le renfort d'équipe
        candidats = patients_par_service.get(svc_obj.id, [])
        if not candidats:
            # Filet de sécurité si, par tirage, aucun patient n'a ce service en
            # service principal : on hospitalise quand même quelques patients
            # au hasard dans ce service pour ne jamais le laisser vide.
            candidats = random.sample(patients_data, k=min(MIN_HOSP_PAR_SERVICE, len(patients_data)))
        n = min(MIN_HOSP_PAR_SERVICE, len(candidats))
        for pdata in random.sample(candidats, k=n):
            creer_hospitalisation(pdata[0], svc_obj, random.choice(medecins_svc))

    # Phase B — volume additionnel organique, réparti selon le médecin référent
    # du patient (peut cumuler 2 séjours pour les profils lourds).
    patients_restants = [pdata for pdata in patients_data if pdata[0].id not in deja_hospitalises]
    n_extra = max(0, int(NB_PATIENTS * 0.20) - len(deja_hospitalises))
    for pdata in random.sample(patients_restants, k=min(n_extra, len(patients_restants))):
        patient, age, ant_str, profil_key = pdata
        nb_hosp = 2 if profil_key in ("drepanocytaire", "insuffisant_renal", "diabetique_t2_desequilibre") and random.random() < 0.4 else 1
        medecin_ref = patient.medecin_referent
        medecins_pool = medecins_list if medecins_list else [medecin_ref]

        for h in range(nb_hosp):
            medecin_h = medecin_ref or random.choice(medecins_pool)
            svc_h = medecin_h.service if (medecin_h and medecin_h.service) else random.choice(
                [s for n, s in services.items() if n != "Laboratoire"])
            creer_hospitalisation(patient, svc_h, medecin_h, offset_jours=h * 45)

    # Phase C — réadmissions réelles : pour un échantillon de séjours déjà
    # terminés, une nouvelle admission du même patient dans le même service,
    # 5 à 25 jours après sa sortie (donc < 30 jours) — sans ça, le taux de
    # réadmission réel (Analytics > Qualité) n'a aucun cas positif à détecter.
    sejours_termines = list(Hospitalisation.objects.filter(
        statut=StatutHospitalisation.TERMINEE, date_sortie__isnull=False,
    ))
    for hosp in random.sample(sejours_termines, k=min(8, len(sejours_termines))):
        jours_apres = random.randint(5, 25)
        d_readmission = hosp.date_sortie + timedelta(days=jours_apres)
        if d_readmission >= now:
            continue
        duree = random.randint(2, 10)
        est_terminee = (d_readmission + timedelta(days=duree)) < now
        readmission = Hospitalisation.objects.create(
            patient=hosp.patient, service=hosp.service, medecin_responsable=hosp.medecin_responsable,
            chambre=random.choice(CHAMBRES), lit=random.choice(LITS),
            motif_admission="Réadmission — " + random.choice(MOTIFS_HOSP),
            diagnostic_entree=random.choice(DIAGNOSTICS),
            date_admission=d_readmission,
            date_sortie_prevue=(d_readmission + timedelta(days=duree)).date(),
            statut=StatutHospitalisation.TERMINEE if est_terminee else StatutHospitalisation.EN_COURS,
        )
        if est_terminee:
            readmission.date_sortie = d_readmission + timedelta(days=duree)
            readmission.diagnostic_sortie = random.choice(DIAG_HOSP_SORTIE)
            readmission.save()
        total_hosp += 1

    print(f"✅ {total_hosp} hospitalisations, réparties dans les {len(services) - 1} services cliniques "
          f"(Laboratoire exclu, pas de médecin)\n")

    # ─── SALLES DE BLOC ET OPÉRATIONS ──────────────────────────────────────────────
    print("🏥 Salles de bloc et opérations chirurgicales...")
    total_salles = 0
    total_operations = 0

    # Créer 2-3 salles par service chirurgical
    services_chirurgie = [s for n, s in services.items() if n in ["Chirurgie générale", "Gynécologie-Obstétrique"]]
    salles_bloc = {}
    for svc in services_chirurgie:
        nb_salles = random.randint(2, 3)
        for i in range(1, nb_salles + 1):
            salle = SalleBloc.objects.create(
                nom=f"Salle {i}", service=svc, actif=True
            )
            salles_bloc[svc.id] = salles_bloc.get(svc.id, []) + [salle]
            total_salles += 1

    # Créer 30-50 opérations programmées liées aux hospitalisations
    chirurgiens_list = [e for e in employes if e.role == 'medecin'
                        and e.service and e.service.nom in ["Chirurgie générale", "Gynécologie-Obstétrique"]]

    operations_data = []
    for hosp in random.sample(list(Hospitalisation.objects.all()), k=min(40, Hospitalisation.objects.count())):
        # Créer une opération pour environ 40% des hospitalisations
        if not hosp.patient or not hosp.service or random.random() > 0.4:
            continue
        if not hosp.service.id in salles_bloc:
            continue

        salle = random.choice(salles_bloc[hosp.service.id])
        chirurgien = None
        # Trouver un chirurgien habilité
        for chir in chirurgiens_list:
            if chir.service_id == hosp.service.id or chir.service is None:
                chirurgien = chir
                break
        if not chirurgien:
            chirurgien = random.choice(chirurgiens_list) if chirurgiens_list else None
        if not chirurgien:
            continue

        # Date de l'opération pendant l'hospitalisation
        date_fin = (hosp.date_sortie or now).date()

        nb_jours = max(
            1,
            (date_fin - hosp.date_admission.date()).days
        )

        d_op = hosp.date_admission + timedelta(
            days=random.randint(1, nb_jours)
        )
        heure_op = datetime.combine(d_op.date(), datetime.min.time()).replace(hour=random.randint(8, 16))

        duree_prevue = random.randint(60, 180)
        statut_op = random.choices(
            [StatutOperation.TERMINEE, StatutOperation.EN_COURS, StatutOperation.CONFIRMEE, StatutOperation.COMPLICATION],
            weights=[0.65, 0.15, 0.15, 0.05]
        )[0]

        # date_debut_reelle/date_fin_reelle : uniquement pour les opérations
        # effectivement passées au bloc — alimente le "temps opératoire moyen"
        # réel (Analytics > Qualité). Une complication rallonge un peu la durée
        # réelle par rapport à l'estimation, ce qui reste réaliste.
        debut_reel = fin_reel = None
        if statut_op in (StatutOperation.TERMINEE, StatutOperation.COMPLICATION):
            debut_reel = heure_op + timedelta(minutes=random.randint(-10, 20))
            duree_reelle = duree_prevue + (random.randint(20, 60) if statut_op == StatutOperation.COMPLICATION else random.randint(-15, 15))
            fin_reel = debut_reel + timedelta(minutes=max(20, duree_reelle))

        try:
            op = Operation.objects.create(
                patient=hosp.patient,
                consultation_indication=random.choice(consultations_par_patient.get(hosp.patient.id, [])) if consultations_par_patient.get(hosp.patient.id) else None,
                hospitalisation=hosp,
                service_chirurgie=hosp.service,
                salle=salle,
                chirurgien_principal=chirurgien,
                type_intervention=random.choice(MOTIFS_OPERATION),
                date_heure_prevue=heure_op,
                duree_estimee_min=duree_prevue,
                date_debut_reelle=debut_reel,
                date_fin_reelle=fin_reel,
                statut=statut_op,
                compte_rendu_operatoire="Acte chirurgical réalisé sans incident majeur. Suites opératoires simples attendues." if statut_op == StatutOperation.TERMINEE and random.random() > 0.2 else "",
                complications=(
                    random.choice([
                        "Hémorragie post-opératoire nécessitant reprise partielle de l'hémostase.",
                        "Infection du site opératoire, mise sous antibiothérapie.",
                        "Complication anesthésique mineure, surveillance rapprochée en SSPI.",
                        "Déhiscence partielle de la plaie, reprise au bloc.",
                    ]) if statut_op == StatutOperation.COMPLICATION
                    else ("Saignement contrôlé per-opératoire, hémostase complète." if random.random() < 0.05 else "")
                ),
            )
            operations_data.append(op)
            total_operations += 1

            # Assigner une équipe à l'opération
            if random.random() > 0.4:
                assistants = random.sample(
                    [e for e in employes if e.role in ['medecin', 'infirmier'] and e.service_id == hosp.service.id],
                    k=random.randint(1, 3)
                )
                for asst in assistants:
                    op.equipe.add(asst)
        except Exception as e:
            pass  # Conflit de salle ou autre constraint - skip silencieusement

    print(f"✅ {total_salles} salles de bloc, {total_operations} opérations chirurgicales\n")

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
        if statut != StatutUrgence.EN_ATTENTE:
            # Délai de prise en charge cohérent avec la gravité du triage : un
            # niveau 1 (vital) est vu en quelques minutes, un niveau 5 peut
            # attendre plus d'une heure — alimente le "temps de prise en charge
            # moyen" réel (Analytics > Qualité).
            delai_min = {1: (2, 10), 2: (5, 20), 3: (15, 45), 4: (30, 90), 5: (45, 150)}.get(niveau_tri, (15, 60))
            p.date_prise_en_charge = d_arr + timedelta(minutes=random.randint(*delai_min))
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
    deces_aux_urgences = []   # (passage, patient) — repris plus bas par l'app morgue
    for dec in list(DecisionSortie):
        nb = 2 if dec == DecisionSortie.DECES else 3
        for _ in range(nb):
            niv = random.choice([1, 2]) if dec == DecisionSortie.DECES else niveau_aleatoire()
            patient_choisi = random.choice(patients_list)
            passage = creer_passage(patient_choisi, niv, mode_aleatoire(),
                                    StatutUrgence.SORTI, dec, jours_max=JOURS_HISTORIQUE)
            if dec == DecisionSortie.DECES:
                deces_aux_urgences.append((passage, patient_choisi))
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

    # ─── ASSIGNATIONS INFIRMIER ↔ PATIENT (SHIFTS) ─────────────────────────────────
    # Qui s'occupe de quel patient hospitalisé, poste par poste. On se limite aux
    # hospitalisations actuellement en cours et aux derniers jours de chaque
    # séjour terminé récemment — un historique complet sur 6 mois × 3 shifts/jour
    # représenterait des centaines de milliers de lignes pour une donnée qui n'a
    # d'intérêt que récente (planning infirmier, pas archive médico-légale).
    print("🧑‍⚕️ Assignations infirmier ↔ patient (shifts)...")
    total_assignations = 0
    SHIFTS = list(Shift)

    hospitalisations_actives = list(Hospitalisation.objects.filter(statut=StatutHospitalisation.EN_COURS)
                                    .select_related('patient', 'service'))
    hospitalisations_recentes = list(
        Hospitalisation.objects.filter(
            statut=StatutHospitalisation.TERMINEE,
            date_sortie__gte=now - timedelta(days=6),
        ).select_related('patient', 'service')
    )

    infirmiers_par_service = defaultdict(list)
    for e in employes:
        if e.role == 'infirmier' and e.service_id:
            infirmiers_par_service[e.service_id].append(e)

    def assigner_shifts(hosp, jour_debut, jour_fin):
        """Un infirmier par poste (matin/après-midi/nuit), chaque jour de la période,
        parmi le personnel du service de l'hospitalisation."""
        nonlocal total_assignations
        equipe = infirmiers_par_service.get(hosp.service_id, [])
        if not equipe:
            return
        jour = jour_debut
        while jour <= jour_fin:
            for shift in SHIFTS:
                infirmier = random.choice(equipe)
                try:
                    AssignationPatient.objects.create(
                        infirmier=infirmier, patient=hosp.patient, service=hosp.service,
                        date=jour, shift=shift,
                    )
                    total_assignations += 1
                except Exception:
                    pass  # doublon (infirmier, patient, date, shift) déjà généré — sans conséquence
            jour += timedelta(days=1)

    aujourdhui_date = timezone.localdate()
    for hosp in hospitalisations_actives:
        debut_planning = max(hosp.date_admission.date(), aujourdhui_date - timedelta(days=4))
        assigner_shifts(hosp, debut_planning, aujourdhui_date)

    for hosp in hospitalisations_recentes:
        debut_planning = max(hosp.date_admission.date(), hosp.date_sortie.date() - timedelta(days=3))
        assigner_shifts(hosp, debut_planning, hosp.date_sortie.date())

    print(f"✅ {total_assignations} assignations (matin/après-midi/nuit) sur "
          f"{len(hospitalisations_actives)} hospitalisations en cours et "
          f"{len(hospitalisations_recentes)} sorties récentes\n")

    # ─── MORGUE (DÉCÈS / AUTOPSIES) ─────────────────────────────────────────────────
    # Reproduit volontairement la logique de DecesViewSet.perform_create (seul
    # endroit habituel où Patient.statut_vital passe à 'decede') puisqu'on crée
    # les enregistrements directement en base, en contournant l'API.
    print("⚰️  Morgue (décès et autopsies)...")
    total_deces, total_autopsies = 0, 0

    CAUSES_DECES_URGENCE = [
        "Arrêt cardio-respiratoire réfractaire à la réanimation",
        "Choc hémorragique non contrôlé",
        "Engagement cérébral sur AVC hémorragique massif",
        "Défaillance multiviscérale sur sepsis sévère",
    ]
    CAUSES_DECES_HOSPIT = [
        "Défaillance cardiaque terminale sur cardiopathie évoluée",
        "Insuffisance respiratoire réfractaire",
        "Complication aiguë de drépanocytose (syndrome thoracique aigu)",
        "Arrêt sur trouble du rythme réfractaire",
        "Choc septique réfractaire",
    ]
    MOTIFS_LIEN = ["Époux", "Épouse", "Fils", "Fille", "Frère", "Sœur", "Père", "Mère", "Neveu", "Nièce"]

    def enregistrer_deces(patient, d_deces, cause, lieu, medecin, necessite_autopsie):
        nonlocal total_deces
        statut_initial = StatutDeces.EN_ATTENTE_AUTOPSIE if necessite_autopsie else StatutDeces.DISPENSE_AUTOPSIE
        deces = Deces.objects.create(
            patient=patient, date_deces=d_deces, lieu_deces=lieu,
            cause_presumee=cause, necessite_autopsie=necessite_autopsie,
            statut=statut_initial, medecin_constatant=medecin,
        )
        # Réplique de perform_create : seule source de vérité pour statut_vital.
        patient.statut_vital = patient.StatutVital.DECEDE
        patient.actif = False
        patient.save(update_fields=['statut_vital', 'actif'])
        total_deces += 1
        return deces

    # 1. Décès déjà générés côté urgences (cohérence : le patient est bien mort
    #    à l'hôpital, constaté par le médecin qui l'a examiné).
    for passage, patient in deces_aux_urgences:
        deces = enregistrer_deces(
            patient, passage.date_sortie or passage.date_arrivee,
            random.choice(CAUSES_DECES_URGENCE), LieuDeces.HOPITAL,
            passage.medecin_examinateur, necessite_autopsie=random.random() < 0.3,
                     )

    # 2. Quelques décès supplémentaires en cours d'hospitalisation, pour ne pas
    #    dépendre uniquement des urgences (patients déjà admis qui se dégradent).
    candidats_hospit = [h for h in hospitalisations_recentes if h.patient.statut_vital != h.patient.StatutVital.DECEDE]
    for hosp in random.sample(candidats_hospit, k=min(4, len(candidats_hospit))):
        d_deces = hosp.date_sortie or (hosp.date_admission + timedelta(days=random.randint(1, 10)))
        deces = enregistrer_deces(
            hosp.patient, d_deces, random.choice(CAUSES_DECES_HOSPIT), LieuDeces.HOPITAL,
            hosp.medecin_responsable, necessite_autopsie=random.random() < 0.15,
        )
        hosp.statut = StatutHospitalisation.TERMINEE
        hosp.date_sortie = d_deces
        hosp.diagnostic_sortie = "Décès en cours de séjour — cf. dossier morgue."
        hosp.save()

    # Autopsies pour les décès qui en nécessitaient une, + remise du corps pour
    # les décès les plus anciens (couvre les 4 statuts du cycle de vie du dossier).
    tous_les_deces = list(Deces.objects.select_related('patient').all())
    medecins_legistes = [e for e in medecins_list if 'légale' in (e.specialite or '').lower()] or medecins_list

    for deces in tous_les_deces:
        if deces.necessite_autopsie and random.random() < 0.75:
            Autopsie.objects.create(
                deces=deces,
                medecin_legiste=random.choice(medecins_legistes) if medecins_legistes else None,
                type=random.choice(list(TypeAutopsie)),
                date_autopsie=deces.date_deces + timedelta(days=random.randint(1, 4)),
                cause_deces_determinee=random.choice(CAUSES_DECES_HOSPIT + CAUSES_DECES_URGENCE),
                constatations="Constatations macroscopiques et prélèvements conformes au protocole médico-légal standard.",
                rapport_valide=True,
                date_validation=deces.date_deces + timedelta(days=random.randint(5, 10)),
            )
            deces.statut = StatutDeces.AUTOPSIE_TERMINEE
            deces.save(update_fields=['statut'])
            total_autopsies += 1
        elif not deces.necessite_autopsie and random.random() < 0.5:
            # Corps déjà remis à la famille pour une partie des décès anciens.
            deces.reclamant_nom = f"{random.choice(PRENOMS_M + PRENOMS_F)} {random.choice(NOMS)}"
            deces.reclamant_lien = random.choice(MOTIFS_LIEN)
            deces.reclamant_telephone = tel()
            deces.date_remise_corps = deces.date_deces + timedelta(days=random.randint(1, 5))
            deces.statut = StatutDeces.CORPS_REMIS
            deces.save()

    print(f"✅ {total_deces} décès enregistrés, {total_autopsies} autopsies\n")

    # ─── RÉSUMÉ ───────────────────────────────────────────────────────────────────
    print("═" * 60)
    print("🏥  SEED TERMINÉ — Résumé complet :")
    print(f"   🏢 Services           : {len(services)}")
    print(f"   🎓 Spécialités        : {len(specialites)}")
    print(f"   👔 Employés           : {len(employes)}")
    print(f"   🔑 Habilitations      : {total_habilitations}")
    print(f"   👤 Patients           : {NB_PATIENTS}")
    print(f"   📊 Signes vitaux      : {total_sv}")
    print(f"   🩺 Consultations      : {total_consult}")
    print(f"   📅 Rendez-vous        : {total_rdv} (dont {total_reunions_gardes} réunions/gardes)")
    print(f"   📋 Antécédents détaillés : {total_antecedents}")
    print(f"   🔬 Demandes d'analyse : {total_analyses}")
    print(f"   🛏️  Hospitalisations   : {total_hosp}")
    print(f"   🏥 Salles de bloc      : {total_salles}")
    print(f"   ⚕️  Opérations chirurg : {total_operations}")
    print(f"   🚑 Passages urgences  : {total_urgences}")
    print(f"   🧑‍⚕️  Assignations shifts : {total_assignations}")
    print(f"   ⚰️  Décès / autopsies  : {total_deces} / {total_autopsies}")
    print(f"   🚨 Alertes            : {total_alertes} (dont {total_alertes_analyses} résultats d'analyse)")
    print("═" * 60)
    print("✅ Base de données peuplée avec succès !")

if __name__ == '__main__':
    run_seed()