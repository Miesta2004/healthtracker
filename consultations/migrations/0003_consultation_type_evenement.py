from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('consultations', '0002_rendezvous'),
    ]

    operations = [
        migrations.AddField(
            model_name='consultation',
            name='type_evenement',
            field=models.CharField(
                choices=[
                    ('consultation', 'Consultation'),
                    ('examen', 'Examen'),
                    ('operation', 'Opération'),
                    ('autre', 'Autre'),
                ],
                default='consultation',
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name='consultation',
            name='symptomes',
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name='consultation',
            name='examens_realises',
            field=models.TextField(blank=True),
        ),
    ]
