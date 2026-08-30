from django.db import migrations

MEDICAMENTS_PAR_DEFAUT = [
    ("Paracétamol", "Paracétamol", "comprimé", "500 mg, 1 g"),
    ("Doliprane", "Paracétamol", "comprimé", "500 mg, 1 g"),
    ("Ibuprofène", "Ibuprofène", "comprimé", "200 mg, 400 mg"),
    ("Amoxicilline", "Amoxicilline", "gélule", "500 mg, 1 g"),
    ("Amoxicilline + acide clavulanique", "Amoxicilline/Acide clavulanique", "comprimé", "1 g"),
    ("Métronidazole", "Métronidazole", "comprimé", "250 mg, 500 mg"),
    ("Ciprofloxacine", "Ciprofloxacine", "comprimé", "500 mg"),
    ("Azithromycine", "Azithromycine", "comprimé", "250 mg"),
    ("Amlodipine", "Amlodipine", "comprimé", "5 mg, 10 mg"),
    ("Hydrochlorothiazide", "Hydrochlorothiazide", "comprimé", "12,5 mg, 25 mg"),
    ("Metformine", "Metformine", "comprimé", "500 mg, 850 mg, 1000 mg"),
    ("Insuline NPH", "Insuline NPH", "injectable", "100 UI/mL"),
    ("Glibenclamide", "Glibenclamide", "comprimé", "5 mg"),
    ("Oméprazole", "Oméprazole", "gélule", "20 mg, 40 mg"),
    ("Dompéridone", "Dompéridone", "comprimé", "10 mg"),
    ("Sels de réhydratation orale (SRO)", "", "sachet", "1 sachet/250 mL"),
    ("Salbutamol", "Salbutamol", "aérosol", "100 μg/dose"),
    ("Prednisolone", "Prednisolone", "comprimé", "5 mg, 20 mg"),
    ("Furosémide", "Furosémide", "comprimé", "40 mg"),
    ("Artéméther/Luméfantrine (Coartem)", "Artéméther/Luméfantrine", "comprimé", "20/120 mg"),
    ("Artéméther", "Artéméther", "injectable", "80 mg"),
    ("Carbamazépine", "Carbamazépine", "comprimé", "200 mg"),
    ("Diazépam", "Diazépam", "injectable", "10 mg"),
    ("Ferrograd (sulfate ferreux)", "Sulfate ferreux", "comprimé", "325 mg"),
    ("Acide folique", "Acide folique", "comprimé", "5 mg"),
    ("Morphine", "Morphine", "injectable", "10 mg"),
    ("Tramadol", "Tramadol", "comprimé", "50 mg, 100 mg"),
    ("Kétoprofène", "Kétoprofène", "injectable", "100 mg"),
    ("Thiocolchicoside", "Thiocolchicoside", "comprimé", "4 mg"),
    ("Clarithromycine", "Clarithromycine", "comprimé", "500 mg"),
    ("Levothyrox", "Lévothyroxine", "comprimé", "25 μg, 50 μg, 100 μg"),
    ("Allopurinol", "Allopurinol", "comprimé", "100 mg, 300 mg"),
    ("Vitamine C", "Acide ascorbique", "comprimé", "500 mg, 1 g"),
    ("Sérum physiologique", "Chlorure de sodium 0,9 %", "solution", "5 mL, 500 mL, 1 L"),
]


def creer_medicaments(apps, schema_editor):
    Medicament = apps.get_model('documents', 'Medicament')
    for nom, dci, forme, dosages in MEDICAMENTS_PAR_DEFAUT:
        Medicament.objects.get_or_create(nom=nom, defaults={'dci': dci, 'forme': forme, 'dosages_courants': dosages, 'actif': True})


def supprimer_medicaments(apps, schema_editor):
    Medicament = apps.get_model('documents', 'Medicament')
    Medicament.objects.filter(nom__in=[m[0] for m in MEDICAMENTS_PAR_DEFAUT]).delete()


class Migration(migrations.Migration):
    dependencies = [('documents', '0004_editeur_structure')]
    operations = [migrations.RunPython(creer_medicaments, supprimer_medicaments)]
