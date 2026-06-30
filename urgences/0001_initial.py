import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('patients', '0005_patient_medecin_referent_patient_service_and_more'),
        ('services', '0001_initial'),
        ('comptes', '0004_employe_service_employe_employe_sexe_valid'),
        ('hospitalisations', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='PassageUrgence',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('date_arrivee', models.DateTimeField()),
                ('mode_arrivee', models.CharField(choices=[('pied', 'Par ses propres moyens'), ('ambulance', 'Ambulance / SAMU'), ('police', 'Police / Pompiers'), ('transfert', "Transfert d'un autre établissement"), ('autre', 'Autre')], default='pied', max_length=20)),
                ('niveau_tri', models.IntegerField(blank=True, choices=[(1, '1 — Réanimation immédiate'), (2, '2 — Très urgent'), (3, '3 — Urgent'), (4, '4 — Peu urgent'), (5, '5 — Non urgent')], null=True)),
                ('motif', models.TextField()),
                ('diagnostic', models.TextField(blank=True)),
                ('notes', models.TextField(blank=True)),
                ('statut', models.CharField(choices=[('en_attente', 'En attente'), ('en_consultation', 'En consultation'), ('sorti', 'Sorti')], default='en_attente', max_length=20)),
                ('decision', models.CharField(blank=True, choices=[('domicile', 'Retour à domicile'), ('hospitalisation', 'Hospitalisation'), ('transfert', 'Transféré vers un autre établissement'), ('parti_sans_attendre', 'Parti sans attendre'), ('deces', 'Décès')], max_length=20)),
                ('date_sortie', models.DateTimeField(blank=True, null=True)),
                ('date_creation', models.DateTimeField(auto_now_add=True)),
                ('date_modification', models.DateTimeField(auto_now=True)),
                ('patient', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='passages_urgence', to='patients.patient')),
                ('service', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='passages_urgence', to='services.service')),
                ('infirmier_accueil', models.ForeignKey(blank=True, limit_choices_to={'role': 'infirmier'}, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='accueils_urgence', to='comptes.employe')),
                ('medecin_examinateur', models.ForeignKey(blank=True, limit_choices_to={'role': 'medecin'}, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='examens_urgence', to='comptes.employe')),
                ('hospitalisation', models.OneToOneField(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='passage_urgence_origine', to='hospitalisations.hospitalisation')),
            ],
            options={
                'verbose_name': 'Passage aux urgences',
                'verbose_name_plural': 'Passages aux urgences',
                'ordering': ['niveau_tri', 'date_arrivee'],
            },
        ),
        migrations.AddConstraint(
            model_name='passageurgence',
            constraint=models.CheckConstraint(condition=models.Q(('statut__in', ['en_attente', 'en_consultation', 'sorti'])), name='urgence_statut_valid'),
        ),
    ]
