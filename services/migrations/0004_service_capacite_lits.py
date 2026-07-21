from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('services', '0003 chef de service allow laborantin'),
    ]

    operations = [
        migrations.AddField(
            model_name='service',
            name='capacite_lits',
            field=models.PositiveIntegerField(
                blank=True, null=True,
                help_text="Nombre de lits du service — sert à calculer le taux d'occupation. Laisser vide si non pertinent (ex: service sans hospitalisation).",
            ),
        ),
    ]