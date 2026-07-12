from django.db import models
from comptes.models import Employe


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