from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('comptes', '0004_employe_service_employe_employe_sexe_valid'),
    ]

    operations = [
        migrations.AddField(
            model_name='employe',
            name='type_contrat',
            field=models.CharField(
                blank=True, default='',
                choices=[
                    ('cdi', 'CDI'), ('cdd', 'CDD'), ('stage', 'Stage'),
                    ('vacation', 'Vacation'), ('benevolat', 'Bénévolat'),
                ],
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name='employe',
            name='date_debut_contrat',
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='employe',
            name='date_fin_contrat',
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='employe',
            name='description_poste',
            field=models.TextField(blank=True),
        ),
    ]
