# Generated manually — élargit chef_de_service au rôle 'laborantin'
# (nécessaire pour le service Laboratoire, qui n'a pas de médecin).

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('comptes', '0006_employe_preferences_employe_signature_medicale'),
        ('services', '0002_add_date_modification'),
    ]

    operations = [
        migrations.AlterField(
            model_name='service',
            name='chef_de_service',
            field=models.ForeignKey(
                blank=True,
                limit_choices_to={'role__in': ['medecin', 'laborantin']},
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='services_diriges',
                to='comptes.employe',
            ),
        ),
    ]