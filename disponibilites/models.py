from django.db import models
from comptes.models import Employe
from patients.models import Patient
from services.models import Service


class JourSemaine(models.IntegerChoices):
    LUNDI    = 0, 'Lundi'
    MARDI    = 1, 'Mardi'
    MERCREDI = 2, 'Mercredi'
    JEUDI    = 3, 'Jeudi'
    VENDREDI = 4, 'Vendredi'
    SAMEDI   = 5, 'Samedi'
    DIMANCHE = 6, 'Dimanche'


class TypeCreneau(models.TextChoices):
    PRESENTIEL = 'presentiel', 'Présentiel'
    GARDE      = 'garde',      'Garde'
    ASTREINTE  = 'astreinte',  'Astreinte'
    TELECONSULTATION = 'teleconsultation', 'Téléconsultation'


class CreneauDisponibilite(models.Model):
    """Disponibilité récurrente hebdomadaire d'un employé."""
    employe     = models.ForeignKey(
        Employe, on_delete=models.CASCADE,
        related_name='creneaux'
    )
    jour        = models.IntegerField(choices=JourSemaine.choices)
    heure_debut = models.TimeField()
    heure_fin   = models.TimeField()
    type        = models.CharField(
        max_length=20,
        choices=TypeCreneau.choices,
        default=TypeCreneau.PRESENTIEL
    )
    actif       = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Créneau de disponibilité"
        ordering     = ['jour', 'heure_debut']
        constraints  = [
            models.CheckConstraint(
                condition=models.Q(heure_fin__gt=models.F('heure_debut')),
                name='creneau_heure_fin_apres_debut'
            )
        ]

    def __str__(self):
        return (f"{self.employe} — {self.get_jour_display()} "
                f"{self.heure_debut:%H:%M}–{self.heure_fin:%H:%M}")


class TypeException(models.TextChoices):
    CONGE       = 'conge',       'Congé'
    ABSENCE     = 'absence',     'Absence'
    GARDE       = 'garde',       'Garde exceptionnelle'
    FORMATION   = 'formation',   'Formation'
    MISSION     = 'mission',     'Mission extérieure'


class StatutException(models.TextChoices):
    EN_ATTENTE = 'en_attente', 'En attente'
    VALIDE     = 'valide',     'Validé'
    REJETE     = 'rejete',     'Rejeté'


class ExceptionDisponibilite(models.Model):
    """Exception ponctuelle : congé, absence, garde exceptionnelle…"""
    employe     = models.ForeignKey(
        Employe, on_delete=models.CASCADE,
        related_name='exceptions'
    )
    type        = models.CharField(max_length=20, choices=TypeException.choices)
    date_debut  = models.DateField()
    date_fin    = models.DateField()
    motif       = models.CharField(max_length=255, blank=True)
    valide      = models.BooleanField(
        default=False,
        help_text="Validé par l'admin ou chef de service (déprécié, voir `statut`)"
    )
    statut      = models.CharField(
        max_length=20,
        choices=StatutException.choices,
        default=StatutException.EN_ATTENTE,
        help_text="En attente / Validé / Rejeté par l'admin ou chef de service"
    )
    date_creation = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Exception de disponibilité"
        ordering     = ['-date_debut']
        constraints  = [
            models.CheckConstraint(
                condition=models.Q(date_fin__gte=models.F('date_debut')),
                name='exception_date_fin_apres_debut'
            )
        ]

    def __str__(self):
        return f"{self.employe} — {self.get_type_display()} du {self.date_debut} au {self.date_fin}"


class Shift(models.TextChoices):
    MATIN       = 'matin',       'Matin (7h–15h)'
    APRES_MIDI  = 'apres_midi',  'Après-midi (15h–23h)'
    NUIT        = 'nuit',        'Nuit (23h–7h)'


class AssignationPatient(models.Model):
    """
    Assignation d'un(e) infirmier(ère) à un patient pour un poste donné.
    Faite par le chef de service (rôle admin, scopé à son service) — dans la
    vraie vie ce serait le rôle de l'infirmière major/cadre de santé, mais on
    réutilise le rôle admin existant plutôt que d'en ajouter un nouveau.
    Plusieurs infirmiers peuvent être assignés au même patient (relève entre
    postes : jour → nuit), donc pas d'unicité sur (patient, date, shift).
    """
    infirmier   = models.ForeignKey(
        Employe, on_delete=models.CASCADE,
        related_name='patients_assignes',
        limit_choices_to={'role': 'infirmier'},
    )
    patient     = models.ForeignKey(
        Patient, on_delete=models.CASCADE,
        related_name='infirmiers_assignes',
    )
    service     = models.ForeignKey(
        Service, on_delete=models.CASCADE,
        related_name='assignations',
        help_text="Dénormalisé depuis l'infirmier au moment de la création — évite une jointure pour le scoping.",
    )
    date        = models.DateField()
    shift       = models.CharField(max_length=20, choices=Shift.choices)
    date_creation = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Assignation infirmier ↔ patient"
        ordering     = ['-date', 'shift']
        constraints  = [
            models.UniqueConstraint(
                fields=['infirmier', 'patient', 'date', 'shift'],
                name='assignation_unique_infirmier_patient_date_shift',
            )
        ]

    def __str__(self):
        return f"{self.infirmier} → {self.patient} — {self.date} ({self.get_shift_display()})"