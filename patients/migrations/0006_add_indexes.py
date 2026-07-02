from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('patients', '0005_patient_medecin_referent_patient_service_and_more'),
    ]

    operations = [
        # Index sur nom+prenom — tri alphabétique (ordering = ['nom', 'prenom'])
        migrations.AddIndex(
            model_name='patient',
            index=models.Index(fields=['nom', 'prenom'], name='patient_nom_prenom_idx'),
        ),
        # Index sur actif — filtres dashboard
        migrations.AddIndex(
            model_name='patient',
            index=models.Index(fields=['actif'], name='patient_actif_idx'),
        ),
    ]
