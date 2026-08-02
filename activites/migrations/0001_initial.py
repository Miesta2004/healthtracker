from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('comptes', '0012_alter_employe_specialite_principale_and_more'),
        ('services', '0005_creer_services_urgences_triage'),
    ]

    operations = [
        migrations.CreateModel(
            name='JournalActivite',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('type_objet', models.CharField(choices=[
                    ('rendez_vous', 'Rendez-vous'),
                    ('consultation', 'Consultation'),
                    ('intervention', 'Intervention chirurgicale'),
                    ('patient', 'Patient'),
                    ('hospitalisation', 'Hospitalisation'),
                    ('urgence', 'Urgence'),
                    ('employe', 'Employé'),
                    ('autre', 'Autre'),
                ], max_length=20)),
                ('action', models.CharField(choices=[
                    ('creation', 'Création'),
                    ('modification', 'Modification'),
                    ('suppression', 'Suppression'),
                    ('annulation', 'Annulation'),
                    ('autre', 'Autre'),
                ], max_length=20)),
                ('description', models.CharField(max_length=255)),
                ('objet_id', models.PositiveIntegerField(blank=True, null=True)),
                ('date_creation', models.DateTimeField(auto_now_add=True)),
                ('employe', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='activites', to='comptes.employe')),
                ('service', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='activites', to='services.service')),
            ],
            options={
                'verbose_name': 'Activité',
                'verbose_name_plural': 'Activités',
                'ordering': ['-date_creation'],
            },
        ),
        migrations.AddIndex(
            model_name='journalactivite',
            index=models.Index(fields=['service', '-date_creation'], name='activites_j_service_a9131b_idx'),
        ),
    ]