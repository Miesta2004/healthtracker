from django.db import migrations


def migrer_antecedents_existants(apps, schema_editor):
    """
    Reprend le champ texte Patient.antecedents (liste séparée par des virgules)
    et crée une ligne Antecedent par valeur, pour ne perdre aucune donnée
    existante lors du passage à la table structurée.
    """
    Patient = apps.get_model('patients', 'Patient')
    Antecedent = apps.get_model('antecedents', 'Antecedent')

    for patient in Patient.objects.exclude(antecedents='').exclude(antecedents__isnull=True):
        libelles = [a.strip() for a in patient.antecedents.split(',') if a.strip()]
        for libelle in libelles:
            Antecedent.objects.create(
                patient=patient,
                libelle=libelle,
                type_antecedent='autre',
                statut='actif',
                date_diagnostic=patient.date_creation.date(),
            )


def revenir_en_arriere(apps, schema_editor):
    """Pas de retour en arrière automatique : le texte d'origine reste intact sur Patient."""
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('antecedents', '0001_initial'),
        ('patients', '0003_remove_patient_photo_url_patient_photo_path'),
    ]

    operations = [
        migrations.RunPython(migrer_antecedents_existants, revenir_en_arriere),
    ]
