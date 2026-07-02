from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('signes_vitaux', '0001_initial'),
    ]

    operations = [
        migrations.AddIndex(
            model_name='signesvitaux',
            index=models.Index(fields=['patient', '-date'], name='signes_patient_date_idx'),
        ),
    ]
