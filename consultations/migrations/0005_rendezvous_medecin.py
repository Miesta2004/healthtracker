# Generated manually on 2026-07-10

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('consultations', '0004_add_indexes'),
        ('comptes', '0006_employe_preferences_employe_signature_medicale'),
    ]

    operations = [
        migrations.AddField(
            model_name='rendezvous',
            name='medecin',
            field=models.ForeignKey(
                blank=True,
                help_text="Médecin avec qui le rendez-vous est pris (optionnel)",
                limit_choices_to={'role': 'medecin'},
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='rendez_vous_medecin',
                to='comptes.employe',
            ),
        ),
        migrations.AddIndex(
            model_name='rendezvous',
            index=models.Index(fields=['medecin', 'date_heure'], name='rdv_medecin_date_idx'),
        ),
    ]
