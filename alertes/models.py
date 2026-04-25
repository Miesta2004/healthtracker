from django.db import models
from patients.models import Patient

class Alerte(models.Model):
    TYPE_CHOICES = [
        ('tension', 'Tension anormale'),
        ('glycemie', 'Glycémie anormale'),
        ('temperature', 'Température anormale'),
        ('frequence', 'Fréquence cardiaque anormale'),
        ('rdv', 'Rendez-vous manqué'),
        ('autre', 'Autre'),
    ]

    STATUT_CHOICES = [
        ('non_lue', 'Non lue'),
        ('lue', 'Lue'),
        ('traitee', 'Traitée'),
    ]

    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='alertes')
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    message = models.TextField()
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default='non_lue')
    date_creation = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Alerte {self.type} - {self.patient}"

    class Meta:
        ordering = ['-date_creation']
        verbose_name = "Alerte"
        verbose_name_plural = "Alertes"