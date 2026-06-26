import django, os, random
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'healthtracker.settings')
django.setup()

from django.utils import timezone
from datetime import timedelta
from decimal import Decimal
from patients.models import Patient
from signes_vitaux.models import SignesVitaux

# Supprime les anciennes entrées
SignesVitaux.objects.all().delete()
print("🗑️  Anciennes entrées supprimées.")

patients = Patient.objects.all()[:3]

if not patients:
    print("Aucun patient trouvé.")
else:
    now = timezone.now()
    total = 0

    for patient in patients:
        # Valeurs de base différentes par patient pour que ce soit réaliste
        base = {
            'ts': random.randint(115, 140),
            'td': random.randint(70, 90),
            'temp': 37.0,
            'poids': float(random.randint(55, 90)),
            'glyc': round(random.uniform(4.5, 7.0), 2),
            'fc': random.randint(60, 85),
        }

        for jour in range(30, -1, -1):  # 30 jours jusqu'à aujourd'hui
            # Petite variation aléatoire chaque jour (réaliste)
            SignesVitaux.objects.create(
                patient=patient,
                date=now - timedelta(days=jour),
                tension_systolique=base['ts'] + random.randint(-5, 5),
                tension_diastolique=base['td'] + random.randint(-3, 3),
                temperature=Decimal(str(round(base['temp'] + random.uniform(-0.4, 0.6), 1))),
                poids=Decimal(str(round(base['poids'] + random.uniform(-0.3, 0.3), 2))),
                glycemie=Decimal(str(round(base['glyc'] + random.uniform(-0.3, 0.3), 2))),
                frequence_cardiaque=base['fc'] + random.randint(-5, 5),
            )
            total += 1

    print(f"✅ {total} entrées créées pour {patients.count()} patient(s). ({total // patients.count()} jours chacun)")