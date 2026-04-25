from django.db import models
from patients.models import Patient

class SignesVitaux(models.Model):
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='signes_vitaux')
    date = models.DateTimeField()
    tension_systolique = models.IntegerField(null=True, blank=True)   # ex: 120
    tension_diastolique = models.IntegerField(null=True, blank=True)  # ex: 80
    temperature = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True)  # ex: 37.5
    poids = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)        # ex: 70.50
    glycemie = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)     # ex: 5.60
    frequence_cardiaque = models.IntegerField(null=True, blank=True)  # ex: 72
    date_creation = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Signes vitaux {self.patient} - {self.date.strftime('%d/%m/%Y')}"

    class Meta:
        ordering = ['-date']
        verbose_name = "Signes vitaux"
        verbose_name_plural = "Signes vitaux"