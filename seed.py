"""
seed.py — Données de démonstration HealthTracker
Génère des patients sénégalais réalistes avec consultations et signes vitaux cohérents.
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

# ─── CONFIG ──────────────────────────────────────────────────────────────────
JOURS_HISTORIQUE = 90   # 3 mois de données
NB_PATIENTS = 20
random.seed(42)

# ─── NETTOYAGE ───────────────────────────────────────────────────────────────
print("🗑️  Nettoyage des anciennes données...")

if Alerte.objects.exists():
    nb = Alerte.objects.count()
    Alerte.objects.all().delete()
    print(f"   - {nb} alerte(s) supprimée(s)")
else:
    print("   - Aucune alerte à supprimer")

if RendezVous.objects.exists():
    nb = RendezVous.objects.count()
    RendezVous.objects.all().delete()
    print(f"   - {nb} rendez-vous supprimé(s)")
else:
    print("   - Aucun rendez-vous à supprimer")

if Consultation.objects.exists():
    nb = Consultation.objects.count()
    Consultation.objects.all().delete()
    print(f"   - {nb} consultation(s) supprimée(s)")
else:
    print("   - Aucune consultation à supprimer")

if SignesVitaux.objects.exists():
    nb = SignesVitaux.objects.count()
    SignesVitaux.objects.all().delete()
    print(f"   - {nb} mesure(s) de signes vitaux supprimée(s)")
else:
    print("   - Aucune mesure de signes vitaux à supprimer")

if Patient.objects.exists():
    nb = Patient.objects.count()
    Patient.objects.all().delete()
    print(f"   - {nb} patient(s) supprimé(s)")
else:
    print("   - Aucun patient à supprimer")

print("✅ Base nettoyée.\n")

# ─── DONNÉES SÉNÉGALAISES ────────────────────────────────────────────────────
PRENOMS_F = [
    "Fatou", "Aïssatou", "Mariama", "Rokhaya", "Khady", "Ndèye",
    "Aminata", "Sokhna", "Coumba", "Astou", "Dieynaba", "Yaye",
    "Mame", "Binta", "Awa", "Soda", "Rama", "Seynabou"
]
PRENOMS_M = [
    "Moussa", "Ibrahima", "Abdoulaye", "Cheikh", "Mamadou", "Oumar",
    "Modou", "Babacar", "Pape", "Serigne", "Aliou", "Seydou",
    "Lamine", "Assane", "Saliou", "Boubacar", "Idrissa", "Malick"
]
NOMS = [
    "Diop", "Fall", "Ndiaye", "Sow", "Mbaye", "Sarr", "Faye",
    "Diallo", "Gueye", "Ndour", "Thiam", "Ba", "Diouf", "Kane",
    "Cissé", "Sy", "Tall", "Thiongane", "Badji", "Mendy"
]
QUARTIERS = [
    "Plateau", "Médina", "Yoff", "Parcelles Assainies", "Grand Dakar",
    "Ouakam", "Liberté 6", "HLM", "Point E", "Mermoz", "Fann",
    "Sicap Baobab", "Guédiawaye", "Pikine", "Rufisque", "Thiès",
    "Saint-Louis", "Ziguinchor"
]
GROUPES_SANGUINS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
POIDS_GROUPES = [0.45, 0.05, 0.10, 0.02, 0.03, 0.01, 0.30, 0.04]

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
# Chaque profil définit des valeurs de base et leur variabilité
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
    """Variation gaussienne autour d'une valeur."""
    result = val + random.gauss(0, ecart)
    if mini is not None:
        result = max(result, mini)
    if maxi is not None:
        result = min(result, maxi)
    return result

# ─── CRÉATION DES PATIENTS ───────────────────────────────────────────────────
print(f"👤 Création de {NB_PATIENTS} patients...")
now = timezone.now()
patients_crees = []

for i in range(NB_PATIENTS):
    sexe = random.choice(['M', 'F'])
    prenom = random.choice(PRENOMS_M if sexe == 'M' else PRENOMS_F)
    nom = random.choice(NOMS)

    age = random.randint(18, 80)
    annee_naissance = date.today().year - age
    mois = random.randint(1, 12)
    jour = random.randint(1, 28)
    date_naissance = date(annee_naissance, mois, jour)

    groupe = random.choices(GROUPES_SANGUINS, weights=POIDS_GROUPES)[0]

    nb_allergies = random.choices([0, 1, 2], weights=[0.6, 0.3, 0.1])[0]
    allergies = ", ".join(random.sample(ALLERGIES_POOL, nb_allergies)) if nb_allergies else ""

    nb_antecedents = random.choices([0, 1, 2, 3], weights=[0.4, 0.35, 0.2, 0.05])[0]
    antecedents_list = random.sample(ANTECEDENTS_POOL, nb_antecedents)
    antecedents = ", ".join(antecedents_list) if antecedents_list else ""

    patient = Patient.objects.create(
        nom=nom,
        prenom=prenom,
        date_naissance=date_naissance,
        sexe=sexe,
        groupe_sanguin=groupe,
        telephone=f"+221 7{random.randint(0,9)} {random.randint(100,999)} {random.randint(10,99)} {random.randint(10,99)}",
        adresse=f"{random.choice(QUARTIERS)}, Dakar",
        allergies=allergies,
        antecedents=antecedents,
        actif=random.random() > 0.05,
    )
    patients_crees.append((patient, age, antecedents_list))

print(f"✅ {len(patients_crees)} patients créés.\n")

# ─── SIGNES VITAUX ───────────────────────────────────────────────────────────
print(f"📊 Création des signes vitaux ({JOURS_HISTORIQUE} jours par patient)...")
total_sv = 0
alertes_crees = 0

for patient, age, antecedents_list in patients_crees:
    antecedents_str = ", ".join(antecedents_list)
    profil_nom = choisir_profil(age, antecedents_str)
    profil = PROFILS[profil_nom]

    # Poids stable avec légère tendance
    poids_base = random.uniform(profil["poids_min"], profil["poids_max"])
    tendance_poids = random.uniform(-0.02, 0.02)  # légère prise/perte

    alertes_patient = []

    for jour in range(JOURS_HISTORIQUE, -1, -1):
        date_mesure = now - timedelta(days=jour)

        # Évolution du poids dans le temps
        poids_jour = poids_base + (tendance_poids * (JOURS_HISTORIQUE - jour))

        # Valeurs avec variation journalière
        ts = int(varier(profil["ts"][0], profil["ts"][1], 80, 200))
        td = int(varier(profil["td"][0], profil["td"][1], 50, 130))
        temp = round(varier(profil["temp"][0], profil["temp"][1], 35.5, 41.0), 1)
        poids = round(varier(poids_jour, 0.2, 30, 150), 1)
        glyc = round(varier(profil["glyc"][0], profil["glyc"][1], 2.0, 25.0), 2)
        fc = int(varier(profil["fc"][0], profil["fc"][1], 40, 130))

        # Événements ponctuels (maladie, stress)
        if random.random() < 0.05:  # 5% chance d'un épisode
            temp = round(temp + random.uniform(0.8, 2.5), 1)
            fc = min(fc + random.randint(10, 25), 130)

        sv = SignesVitaux.objects.create(
            patient=patient,
            date=date_mesure,
            tension_systolique=ts,
            tension_diastolique=td,
            temperature=Decimal(str(min(temp, 41.0))),
            poids=Decimal(str(poids)),
            glycemie=Decimal(str(min(glyc, 25.0))),
            frequence_cardiaque=fc,
        )
        total_sv += 1

        # Générer des alertes si valeurs anormales
        if ts > 180 or td > 110:
            alertes_patient.append(("tension", f"Tension critique : {ts}/{td} mmHg"))
        elif ts > 160 and random.random() < profil["alerte_chance"]:
            alertes_patient.append(("tension", f"Tension élevée : {ts}/{td} mmHg"))
        if glyc > 15.0:
            alertes_patient.append(("glycemie", f"Hyperglycémie sévère : {glyc} g/L"))
        elif glyc > 11.0 and random.random() < profil["alerte_chance"]:
            alertes_patient.append(("glycemie", f"Glycémie élevée : {glyc} g/L"))
        if temp > 39.5:
            alertes_patient.append(("temperature", f"Fièvre élevée : {temp}°C"))
        if fc > 110:
            alertes_patient.append(("frequence", f"Tachycardie : {fc} bpm"))

    # Créer max 3 alertes par patient (les plus récentes)
    for type_alerte, message in alertes_patient[-3:]:
        Alerte.objects.create(
            patient=patient,
            type=type_alerte,
            message=message,
            statut=random.choice(['non_lue', 'non_lue', 'lue', 'traitee']),
        )
        alertes_crees += 1

print(f"✅ {total_sv} mesures créées, {alertes_crees} alertes générées.\n")

# ─── CONSULTATIONS ───────────────────────────────────────────────────────────
print("🩺 Création des consultations...")
total_consult = 0
total_rdv = 0

for patient, age, antecedents_list in patients_crees:
    # Entre 2 et 8 consultations par patient sur 90 jours
    nb_consult = random.randint(2, 8)

    # Jours de consultation répartis sur l'historique
    jours_consult = sorted(random.sample(range(1, JOURS_HISTORIQUE), nb_consult))

    for jour in jours_consult:
        date_consult = now - timedelta(days=jour)

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

        diagnostic = random.choice(DIAGNOSTICS)
        ordonnance = random.choice(ORDONNANCES)
        symptomes = random.choice(SYMPTOMES_POOL) if type_evenement != 'operation' else ''
        examens_realises = random.choice(EXAMENS_POOL)

        statut = "terminee"
        if jour < 7:  # récent
            statut = random.choice(["terminee", "en_cours"])

        Consultation.objects.create(
            patient=patient,
            type_evenement=type_evenement,
            date=date_consult,
            motif=motif,
            symptomes=symptomes,
            examens_realises=examens_realises,
            diagnostic=diagnostic,
            ordonnance=ordonnance,
            statut=statut,
            notes=f"Patient {patient.sexe == 'M' and 'vu' or 'vue'} en consultation. "
                  f"{'Antécédents à surveiller : ' + ', '.join(antecedents_list[:2]) if antecedents_list else 'Pas d antécédents notables.'}",
        )
        total_consult += 1

    # Rendez-vous futurs (1 à 3 par patient)
    nb_rdv = random.randint(0, 3)
    for _ in range(nb_rdv):
        jours_futur = random.randint(1, 30)
        date_rdv = now + timedelta(days=jours_futur)
        RendezVous.objects.create(
            patient=patient,
            date_heure=date_rdv,
            motif=random.choice(MOTIFS),
            statut=random.choice(["planifie", "confirme"]),
        )
        total_rdv += 1

print(f"✅ {total_consult} consultations créées, {total_rdv} rendez-vous planifiés.\n")

# ─── RÉSUMÉ ──────────────────────────────────────────────────────────────────
print("═" * 50)
print("🏥 SEED TERMINÉ — Résumé :")
print(f"   👤 Patients       : {NB_PATIENTS}")
print(f"   📊 Signes vitaux  : {total_sv}")
print(f"   🩺 Consultations  : {total_consult}")
print(f"   📅 Rendez-vous    : {total_rdv}")
print(f"   🚨 Alertes        : {alertes_crees}")
print("═" * 50)
print("✅ Base de données Supabase peuplée avec succès !")