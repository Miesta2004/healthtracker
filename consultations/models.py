from django.db import models
from patients.models import Patient

# Create your models here.
class Consultation(models.Model):

    TYPE_CHOICES = [
        ('consultation', 'Consultation'),
        ('examen', 'Examen'),
        ('operation', 'Opération'),
        ('autre', 'Autre'),
    ]

    STATUT_CHOICES = [
        ('planifiee','Planifiée'),
        ('en_cours','En cours'),
        ('terminee','Terminée'),
        ('annulee','Annulée')
    ]

    #Relation avec Patient
    patient = models.ForeignKey(
        Patient,
        on_delete  =models.CASCADE,
        related_name = 'consultations'
    )

    # on_delete=models.CASCADE signifie : si tu supprimes un patient, toutes ses consultations sont supprimées automatiquement.
    # related_name='consultations' te permet d'écrire patient.consultations.all() pour récupérer toutes les consultations d'un patient.

    #Un Patient → peut avoir plusieurs Consultations
    #Une Consultation → appartient à un seul Patient


    #Informations de l'événement médical
    type_evenement = models.CharField(
        max_length=20,
        choices=TYPE_CHOICES,
        default='consultation'
    )
    date = models.DateTimeField()
    motif = models.CharField(max_length=255)
    symptomes = models.TextField(blank=True)
    examens_realises = models.TextField(blank=True)
    diagnostic = models.TextField(blank=True)
    ordonnance = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    statut = models.CharField(
        max_length = 20,
        choices = STATUT_CHOICES,
        default = 'planifiee'
    )

    #Metadonnées
    date_creation = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.get_type_evenement_display()} {self.patient} - {self.date.strftime('%d/%m/%Y')}"

    class Meta:
        ordering = ['-date']
        verbose_name = "Consultation"
        verbose_name_plural = "Consultations"


class RendezVous(models.Model):

    STATUT_CHOICES = [
        ('planifie', 'Planifié'),
        ('confirme', 'Confirmé'),
        ('annule', 'Annulé'),
        ('termine', 'Terminé'),
    ]

    patient = models.ForeignKey(
        Patient,
        on_delete=models.CASCADE,
        related_name='rendez_vous'
    )
    date_heure = models.DateTimeField()
    motif = models.CharField(max_length=255)
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default='planifie')
    notes = models.TextField(blank=True)
    date_creation = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"RDV {self.patient} - {self.date_heure.strftime('%d/%m/%Y %H:%M')}"

    class Meta:
        ordering = ['-date_heure']
        verbose_name = "Rendez-vous"
        verbose_name_plural = "Rendez-vous"