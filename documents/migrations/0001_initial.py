import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('comptes', '0012_alter_employe_specialite_principale_and_more'),
        ('patients', '0010_alter_patient_statut_orientation'),
        ('consultations', '0009_alter_rendezvous_type_evenement_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='ModeleDocument',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('nom', models.CharField(max_length=150)),
                ('type_document', models.CharField(choices=[
                    ('compte_rendu_consultation', 'Compte rendu de consultation'),
                    ('ordonnance', 'Ordonnance'),
                    ('certificat_medical', 'Certificat médical'),
                    ('demande_analyse', "Demande d'analyse"),
                    ('demande_imagerie', "Demande d'imagerie"),
                    ('lettre_orientation', "Lettre d'orientation"),
                    ('arret_travail', 'Arrêt de travail'),
                    ('autre', 'Autre'),
                ], max_length=30)),
                ('corps', models.TextField(help_text="Texte du modèle. Jetons disponibles : {{patient.nom}}, {{patient.prenom}}, {{patient.age}}, {{patient.sexe}}, {{patient.numero_dossier}}, {{patient.date_naissance}}, {{consultation.motif}}, {{consultation.diagnostic}}, {{consultation.symptomes}}, {{consultation.ordonnance}}, {{consultation.date}}, {{medecin.nom}}, {{medecin.prenom}}, {{service.nom}}, {{date_jour}}")),
                ('actif', models.BooleanField(default=True)),
                ('date_creation', models.DateTimeField(auto_now_add=True)),
                ('date_modification', models.DateTimeField(auto_now=True)),
                ('cree_par', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='modeles_crees', to='comptes.employe')),
            ],
            options={
                'verbose_name': 'Modèle de document',
                'verbose_name_plural': 'Modèles de document',
                'ordering': ['type_document', 'nom'],
            },
        ),
        migrations.CreateModel(
            name='DocumentGenere',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('type_document', models.CharField(choices=[
                    ('compte_rendu_consultation', 'Compte rendu de consultation'),
                    ('ordonnance', 'Ordonnance'),
                    ('certificat_medical', 'Certificat médical'),
                    ('demande_analyse', "Demande d'analyse"),
                    ('demande_imagerie', "Demande d'imagerie"),
                    ('lettre_orientation', "Lettre d'orientation"),
                    ('arret_travail', 'Arrêt de travail'),
                    ('autre', 'Autre'),
                ], max_length=30)),
                ('titre', models.CharField(max_length=200)),
                ('contenu', models.TextField()),
                ('date_creation', models.DateTimeField(auto_now_add=True)),
                ('consultation', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='documents_generes', to='consultations.consultation')),
                ('genere_par', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='documents_generes', to='comptes.employe')),
                ('modele', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='documents_generes', to='documents.modeledocument')),
                ('patient', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='documents_generes', to='patients.patient')),
            ],
            options={
                'verbose_name': 'Document généré',
                'verbose_name_plural': 'Documents générés',
                'ordering': ['-date_creation'],
            },
        ),
    ]
