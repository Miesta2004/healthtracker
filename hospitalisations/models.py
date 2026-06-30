from django.db import models
from patients.models import Patient


class StatutHospitalisation(models.TextChoices):
    EN_COURS   = 'en_cours',  'En cours'
    TERMINEE   = 'terminee',  'Terminée'
    TRANSFEREE = 'transferee', 'Transférée'


class Hospitalisation(models.Model):
    """Séjour hospitalier d'un patient au sein d'un service."""

    patient = models.ForeignKey(
        Patient,
        on_delete=models.CASCADE,
        related_name='hospitalisations'
    )
    service = models.ForeignKey(
        'services.Service',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='hospitalisations'
    )
    medecin_responsable = models.ForeignKey(
        'comptes.Employe',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='hospitalisations_suivies',
        limit_choices_to={'role': 'medecin'}
    )

    chambre = models.CharField(max_length=20, blank=True)
    lit = models.CharField(max_length=10, blank=True)

    motif_admission   = models.TextField()
    diagnostic_entree = models.TextField(blank=True)
    diagnostic_sortie = models.TextField(blank=True)
    notes             = models.TextField(blank=True)

    date_admission     = models.DateTimeField()
    date_sortie_prevue = models.DateField(null=True, blank=True)
    date_sortie        = models.DateTimeField(null=True, blank=True)

    statut = models.CharField(
        max_length=20,
        choices=StatutHospitalisation.choices,
        default=StatutHospitalisation.EN_COURS
    )

    date_creation      = models.DateTimeField(auto_now_add=True)
    date_modification  = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Hospitalisation {self.patient} — {self.date_admission.strftime('%d/%m/%Y')}"

    @property
    def duree_jours(self):
        """Nombre de jours d'hospitalisation (à ce jour, ou jusqu'à la sortie)."""
        from django.utils import timezone
        fin = self.date_sortie or timezone.now()
        return (fin.date() - self.date_admission.date()).days

    class Meta:
        verbose_name = "Hospitalisation"
        verbose_name_plural = "Hospitalisations"
        ordering = ['-date_admission']
        constraints = [
            models.CheckConstraint(
                condition=models.Q(statut__in=[s.value for s in StatutHospitalisation]),
                name='hospitalisation_statut_valid',
            ),
        ]
