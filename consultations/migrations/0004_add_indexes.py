from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('consultations', '0003_consultation_type_evenement'),
    ]

    operations = [
        migrations.AddIndex(
            model_name='consultation',
            index=models.Index(fields=['patient', '-date'], name='consult_patient_date_idx'),
        ),
        migrations.AddIndex(
            model_name='rendezvous',
            index=models.Index(fields=['patient', 'date_heure'], name='rdv_patient_date_idx'),
        ),
    ]
