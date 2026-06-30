from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('patients',      '0005_patient_medecin_referent_patient_service_and_more'),
        ('consultations', '0003_consultation_type_evenement'),
        ('comptes',       '0004_employe_service_employe_employe_sexe_valid'),
    ]

    operations = [
        migrations.CreateModel(
            name='DemandeAnalyse',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('type_analyse', models.CharField(max_length=30, choices=[
                    ('nfs', 'NFS (numération formule sanguine)'),
                    ('glycemie', 'Glycémie'),
                    ('bilan_renal', 'Bilan rénal (créatinine, urée)'),
                    ('bilan_hepatique', 'Bilan hépatique (ASAT, ALAT)'),
                    ('bilan_lipidique', 'Bilan lipidique'),
                    ('ionogramme', 'Ionogramme sanguin'),
                    ('crp', 'CRP (protéine C-réactive)'),
                    ('groupe_sanguin', 'Groupe sanguin / RAI'),
                    ('hemostase', 'Hémostase (TP, TCA)'),
                    ('urine', 'Examen cytobactériologique des urines'),
                    ('parasite', 'Frottis / goutte épaisse (paludisme)'),
                    ('autre', 'Autre'),
                ])),
                ('urgence', models.CharField(max_length=10, choices=[('normale', 'Normale'), ('urgente', 'Urgente')], default='normale')),
                ('statut', models.CharField(max_length=15, choices=[('en_attente', 'En attente'), ('en_cours', 'En cours'), ('terminee', 'Terminée'), ('annulee', 'Annulée')], default='en_attente')),
                ('notes_medecin', models.TextField(blank=True)),
                ('resultats', models.TextField(blank=True)),
                ('valeurs_normales', models.TextField(blank=True)),
                ('date_demande', models.DateTimeField(auto_now_add=True)),
                ('date_resultat', models.DateTimeField(null=True, blank=True)),
                ('patient', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='demandes_analyse', to='patients.patient')),
                ('consultation', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='demandes_analyse', to='consultations.consultation')),
                ('demandeur', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='demandes_envoyees', to='comptes.employe', verbose_name='Médecin demandeur')),
                ('laborantin', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='demandes_traitees', to='comptes.employe', verbose_name='Laborantin traitant', limit_choices_to={'role': 'laborantin'})),
            ],
            options={
                'verbose_name': "Demande d'analyse",
                'verbose_name_plural': "Demandes d'analyse",
                'ordering': ['-date_demande'],
            },
        ),
    ]