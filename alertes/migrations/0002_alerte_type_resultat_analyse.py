from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('alertes', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='alerte',
            name='type',
            field=models.CharField(choices=[
                ('tension', 'Tension anormale'),
                ('glycemie', 'Glycémie anormale'),
                ('temperature', 'Température anormale'),
                ('frequence', 'Fréquence cardiaque anormale'),
                ('rdv', 'Rendez-vous manqué'),
                ('resultat_analyse', "Résultat d'analyse disponible"),
                ('autre', 'Autre'),
            ], max_length=20),
        ),
    ]
