# Generated manually on 2026-07-10

from django.db import migrations, models


def backfill_statut(apps, schema_editor):
    """Reprend la valeur du booléen `valide` existant : True -> validé, False -> en attente.
    (Les rejets antérieurs n'étaient pas distingués des demandes en attente et ne peuvent
    pas être reconstitués rétroactivement.)"""
    ExceptionDisponibilite = apps.get_model('disponibilites', 'ExceptionDisponibilite')
    ExceptionDisponibilite.objects.filter(valide=True).update(statut='valide')
    ExceptionDisponibilite.objects.filter(valide=False).update(statut='en_attente')


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('disponibilites', '0001_init'),
    ]

    operations = [
        migrations.AddField(
            model_name='exceptiondisponibilite',
            name='statut',
            field=models.CharField(
                choices=[('en_attente', 'En attente'), ('valide', 'Validé'), ('rejete', 'Rejeté')],
                default='en_attente',
                help_text="En attente / Validé / Rejeté par l'admin ou chef de service",
                max_length=20,
            ),
        ),
        migrations.AlterField(
            model_name='exceptiondisponibilite',
            name='valide',
            field=models.BooleanField(
                default=False,
                help_text="Validé par l'admin ou chef de service (déprécié, voir `statut`)",
            ),
        ),
        migrations.RunPython(backfill_statut, noop_reverse),
    ]
