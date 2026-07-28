import django.db.models.deletion
from django.db import migrations, models


# Ancien statut → nouveau statut, pour ne pas laisser les dossiers existants
# dans un état qui n'existe plus après le changement de choices ci-dessous.
# 'en_attente_orientation' n'a plus d'équivalent exact (dans le nouveau
# workflow le service est choisi DÈS la création) — on le fait atterrir sur
# 'en_attente_validation_service', l'état le plus proche en pratique (le
# service peut être vide pour ces vieux dossiers ; à corriger au cas par cas
# via un transfert si besoin).
MAPPING_ANCIEN_VERS_NOUVEAU = {
    'en_attente_orientation': 'en_attente_validation_service',
    'oriente': 'admis_dans_le_service',
}


def migrer_anciens_statuts(apps, schema_editor):
    Patient = apps.get_model('patients', 'Patient')
    for ancien, nouveau in MAPPING_ANCIEN_VERS_NOUVEAU.items():
        Patient.objects.filter(statut_orientation=ancien).update(statut_orientation=nouveau)


def migrer_anciens_statuts_arriere(apps, schema_editor):
    Patient = apps.get_model('patients', 'Patient')
    for ancien, nouveau in MAPPING_ANCIEN_VERS_NOUVEAU.items():
        Patient.objects.filter(statut_orientation=nouveau).update(statut_orientation=ancien)


class Migration(migrations.Migration):

    dependencies = [
        ('comptes', '0011_agent_admission_role'),
        ('patients', '0008_patient_contact_urgence_lien_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='patient',
            name='statut_orientation',
            field=models.CharField(
                choices=[
                    ('en_attente_validation_service', "En attente de validation par le service"),
                    ('admis_dans_le_service', 'Admis dans le service'),
                    ('en_consultation', 'En consultation'),
                    ('hospitalise', 'Hospitalisé'),
                    ('admis_urgences', 'Admis aux urgences'),
                    ('sorti', 'Sorti'),
                ],
                default='en_attente_validation_service',
                max_length=30,
                help_text=(
                    "Parcours administratif du patient depuis son admission : "
                    "'en_attente_validation_service' (créé + orienté par les Admissions, "
                    "en attente que le secrétariat du service confirme l'arrivée) → "
                    "'admis_dans_le_service' (confirmé) → 'en_consultation' / 'hospitalise' "
                    "(mis à jour AUTOMATIQUEMENT par les apps consultations/hospitalisations "
                    "à la création d'un enregistrement, voir leurs save()) → 'sorti'. Chemin "
                    "parallèle : 'admis_urgences' pour une admission d'urgence vitale à "
                    "identité provisoire (voir identite_provisoire), avant régularisation."
                ),
            ),
        ),
        # IMPORTANT : ce RunPython doit venir APRÈS l'AlterField ci-dessus.
        # 'en_attente_validation_service' fait 30 caractères — sur l'ancienne
        # colonne varchar(25) (avant élargissement), Postgres refuse la valeur
        # avec un StringDataRightTruncation. L'ordre inverse plantait la migration.
        migrations.RunPython(migrer_anciens_statuts, migrer_anciens_statuts_arriere),
        migrations.AddField(
            model_name='patient',
            name='identite_provisoire',
            field=models.BooleanField(
                default=False,
                help_text=(
                    "Patient créé en mode 'Urgence Vitale / Identité Provisoire' "
                    "(inconscient, seul, sans papiers) : état civil non fiable tant que "
                    "ce champ est True. Passé à False par l'action de régularisation, qui "
                    "NE modifie que l'identité — l'historique médical déjà créé pendant "
                    "l'urgence (consultations, signes vitaux…) n'est jamais altéré."
                ),
            ),
        ),
        migrations.AddField(
            model_name='patient',
            name='date_regularisation',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='patient',
            name='regularise_par',
            field=models.ForeignKey(
                blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
                related_name='patients_regularises', to='comptes.employe',
                help_text="Agent d'admission ayant effectué la régularisation d'identité.",
            ),
        ),
    ]
