import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('patients', '0005_patient_medecin_referent_patient_service_and_more'),
        ('services', '0001_initial'),
        ('comptes', '0004_employe_service_employe_employe_sexe_valid'),
    ]

    operations = [
        migrations.CreateModel(
            name='Hospitalisation',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('chambre', models.CharField(blank=True, max_length=20)),
                ('lit', models.CharField(blank=True, max_length=10)),
                ('motif_admission', models.TextField()),
                ('diagnostic_entree', models.TextField(blank=True)),
                ('diagnostic_sortie', models.TextField(blank=True)),
                ('notes', models.TextField(blank=True)),
                ('date_admission', models.DateTimeField()),
                ('date_sortie_prevue', models.DateField(blank=True, null=True)),
                ('date_sortie', models.DateTimeField(blank=True, null=True)),
                ('statut', models.CharField(choices=[('en_cours', 'En cours'), ('terminee', 'Terminée'), ('transferee', 'Transférée')], default='en_cours', max_length=20)),
                ('date_creation', models.DateTimeField(auto_now_add=True)),
                ('date_modification', models.DateTimeField(auto_now=True)),
                ('patient', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='hospitalisations', to='patients.patient')),
                ('service', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='hospitalisations', to='services.service')),
                ('medecin_responsable', models.ForeignKey(blank=True, limit_choices_to={'role': 'medecin'}, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='hospitalisations_suivies', to='comptes.employe')),
            ],
            options={
                'verbose_name': 'Hospitalisation',
                'verbose_name_plural': 'Hospitalisations',
                'ordering': ['-date_admission'],
            },
        ),
        migrations.AddConstraint(
            model_name='hospitalisation',
            constraint=models.CheckConstraint(condition=models.Q(('statut__in', ['en_cours', 'terminee', 'transferee'])), name='hospitalisation_statut_valid'),
        ),
    ]
