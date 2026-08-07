# Generated manually — ajout de Hospitalisation.consultation_origine
# (voir hospitalisations/models.py), symétrique de
# chirurgie.InterventionChirurgicale.consultation_indication.

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('hospitalisations', '0001_initial'),
        ('consultations', '0010_consultation_decision_orientation'),
    ]

    operations = [
        migrations.AddField(
            model_name='hospitalisation',
            name='consultation_origine',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='hospitalisations_decidees',
                to='consultations.consultation',
                help_text=(
                    "Consultation à l'issue de laquelle cette hospitalisation a été "
                    "décidée (Consultation.decision_orientation == 'hospitalisation'), "
                    "quand ce dossier en découle directement plutôt que d'un passage aux "
                    "urgences ou d'une admission programmée sans consultation préalable. "
                    "Symétrique de "
                    "chirurgie.InterventionChirurgicale.consultation_indication — permet "
                    "de retrouver le contexte clinique qui a motivé l'admission."
                ),
            ),
        ),
    ]