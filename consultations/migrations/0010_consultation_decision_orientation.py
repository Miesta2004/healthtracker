# Generated manually — ajout de Consultation.decision_orientation
# (voir consultations/models.py::Consultation.save() et
#  consultations/serializers.py::ConsultSerializer.validate())

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('consultations', '0009_alter_rendezvous_type_evenement_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='consultation',
            name='decision_orientation',
            field=models.CharField(
                blank=True,
                choices=[
                    ('sortie', 'Retour à domicile'),
                    ('hospitalisation', 'Hospitalisation'),
                    ('rendez_vous', 'Rendez-vous de suivi à prendre'),
                ],
                default='',
                help_text=(
                    "Décision du médecin sur le devenir du patient à la fin de la "
                    "consultation (sortie / hospitalisation / rendez-vous de suivi). "
                    "Voir save() : pilote la mise à jour de Patient.statut_orientation."
                ),
                max_length=20,
            ),
        ),
    ]