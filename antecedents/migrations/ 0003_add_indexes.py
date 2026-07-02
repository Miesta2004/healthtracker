from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('antecedents', '0002_migrer_antecedents_existants'),
    ]

    operations = [
        migrations.AddIndex(
            model_name='antecedent',
            index=models.Index(fields=['patient', 'statut'], name='antecedent_patient_statut_idx'),
        ),
    ]
