from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('analyses', 'migration__0001'),
    ]

    operations = [
        migrations.AddIndex(
            model_name='demandeanalyse',
            index=models.Index(fields=['patient', 'statut'], name='analyse_patient_statut_idx'),
        ),
    ]
