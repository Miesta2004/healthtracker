# Generated manually — ajout de 'a_hospitaliser' et 'en_attente_rdv_suivi'
# à Patient.StatutOrientation (voir patients/models.py). Choices Django ne
# sont pas contraints en base par défaut ici (pas de CheckConstraint sur ce
# champ, contrairement à groupe_sanguin/sexe) : cette migration met juste à
# jour les métadonnées du champ pour rester alignée avec le modèle.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('patients', '0010_alter_patient_statut_orientation'),
    ]

    operations = [
        migrations.AlterField(
            model_name='patient',
            name='statut_orientation',
            field=models.CharField(
                choices=[
                    ('en_attente_validation_service', 'En attente de validation par le service'),
                    ('admis_dans_le_service', 'Admis dans le service'),
                    ('en_consultation', 'En consultation'),
                    ('a_hospitaliser', 'À hospitaliser'),
                    ('hospitalise', 'Hospitalisé'),
                    ('admis_urgences', 'Admis aux urgences'),
                    ('en_attente_rdv_suivi', 'En attente de rendez-vous de suivi'),
                    ('sorti', 'Sorti'),
                ],
                default='en_attente_validation_service',
                help_text=(
                    "Parcours administratif du patient depuis son admission : "
                    "'en_attente_validation_service' (créé + orienté par les Admissions, "
                    "en attente que le secrétariat du service confirme l'arrivée) → "
                    "'admis_dans_le_service' (confirmé) → 'en_consultation' (mis à jour "
                    "AUTOMATIQUEMENT par consultations.Consultation.save()) → à l'issue de "
                    "la consultation, selon Consultation.decision_orientation choisie par "
                    "le médecin : 'a_hospitaliser' (en attente qu'un service ouvre le "
                    "dossier d'hospitalisation, cf. Hospitalisation.consultation_origine), "
                    "'en_attente_rdv_suivi' (le secrétariat doit programmer un RDV), ou "
                    "directement 'sorti'. 'hospitalise' est positionné automatiquement par "
                    "hospitalisations.Hospitalisation.save() dès qu'un dossier "
                    "d'hospitalisation est réellement ouvert. Chemin parallèle : "
                    "'admis_urgences' pour une admission d'urgence vitale à identité "
                    "provisoire (voir identite_provisoire), avant régularisation."
                ),
                max_length=30,
            ),
        ),
    ]