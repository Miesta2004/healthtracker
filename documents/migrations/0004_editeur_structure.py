import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('comptes', '0012_alter_employe_specialite_principale_and_more'),
        ('documents', '0003_signature_et_demande_imagerie'),
    ]

    operations = [
        migrations.AlterField(
            model_name='modeledocument', name='corps',
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='modeledocument', name='entete',
            field=models.TextField(blank=True, help_text="Texte affiché en haut du document.", default=''),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='modeledocument', name='pied_de_page',
            field=models.TextField(blank=True, help_text="Mentions légales / signature.", default=''),
            preserve_default=False,
        ),
        migrations.AlterField(
            model_name='documentgenere', name='modele',
            field=models.ForeignKey(
                blank=True, help_text="Modèle (en-tête/pied de page) utilisé pour l'habillage — optionnel.",
                null=True, on_delete=django.db.models.deletion.SET_NULL,
                related_name='documents_generes', to='documents.modeledocument',
            ),
        ),
        migrations.AddField(
            model_name='documentgenere', name='statut',
            field=models.CharField(choices=[('brouillon', 'Brouillon'), ('finalise', 'Finalisé')], default='brouillon', max_length=10),
        ),
        migrations.AddField(
            model_name='documentgenere', name='donnees',
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.AddField(
            model_name='documentgenere', name='date_modification',
            field=models.DateTimeField(auto_now=True),
        ),
        migrations.AlterField(
            model_name='documentgenere', name='contenu',
            field=models.TextField(blank=True),
        ),
        migrations.AlterField(
            model_name='documentgenere', name='type_document',
            field=models.CharField(choices=[
                ('compte_rendu_consultation', 'Compte rendu de consultation'), ('ordonnance', 'Ordonnance'),
                ('certificat_medical', 'Certificat médical'), ('demande_analyse', "Demande d'examen"),
                ('demande_imagerie', "Demande d'imagerie"), ('lettre_orientation', "Lettre d'orientation"),
                ('arret_travail', 'Arrêt de travail'), ('autre', 'Autre'),
            ], max_length=30),
        ),
        migrations.AlterField(
            model_name='modeledocument', name='type_document',
            field=models.CharField(choices=[
                ('compte_rendu_consultation', 'Compte rendu de consultation'), ('ordonnance', 'Ordonnance'),
                ('certificat_medical', 'Certificat médical'), ('demande_analyse', "Demande d'examen"),
                ('demande_imagerie', "Demande d'imagerie"), ('lettre_orientation', "Lettre d'orientation"),
                ('arret_travail', 'Arrêt de travail'), ('autre', 'Autre'),
            ], max_length=30),
        ),
        migrations.CreateModel(
            name='Medicament',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('nom', models.CharField(db_index=True, max_length=150)),
                ('dci', models.CharField(blank=True, max_length=150)),
                ('forme', models.CharField(blank=True, max_length=100)),
                ('dosages_courants', models.CharField(blank=True, max_length=200)),
                ('actif', models.BooleanField(default=True)),
            ],
            options={'verbose_name': 'Médicament', 'verbose_name_plural': 'Médicaments', 'ordering': ['nom']},
        ),
    ]
