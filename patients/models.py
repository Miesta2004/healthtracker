from django.db import models

class Personne(models.Model):

    """Modèle de base abstrait partagé par Patient et Employe"""

    SEXE_CHOICES = [('M', 'Masculin'), ('F', 'Féminin')]

    nom             = models.CharField(max_length=100)
    prenom          = models.CharField(max_length=100)
    date_naissance  = models.DateField()
    sexe            = models.CharField(max_length=1, choices=SEXE_CHOICES)
    telephone       = models.CharField(max_length=20, blank=True)
    adresse         = models.TextField(blank=True)
    photo_path      = models.CharField(max_length=255, blank=True, null=True)
    date_creation   = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True  # ← pas de table créée pour Personne

    def __str__(self):
        return f"{self.prenom} {self.nom}"

    @property
    def age(self):
        from datetime import date
        today = date.today()
        d = self.date_naissance
        return today.year - d.year - ((today.month, today.day) < (d.month, d.day))


class Patient(Personne):

    GROUPE_SANGUIN_CHOICES = [
        ('A+','A+'),('A-','A-'),('B+','B+'),('B-','B-'),
        ('AB+','AB+'),('AB-','AB-'),('O+','O+'),('O-','O-'),
    ]

    groupe_sanguin  = models.CharField(max_length=3, choices=GROUPE_SANGUIN_CHOICES, blank=True)
    allergies       = models.TextField(blank=True)
    antecedents     = models.TextField(blank=True)
    actif           = models.BooleanField(default=True)
    numero_dossier  = models.CharField(max_length=20, unique=True, blank=True)

    def save(self, *args, **kwargs):
        # Génère un numéro de dossier automatique
        if not self.numero_dossier:
            import random, string
            self.numero_dossier = 'P' + ''.join(random.choices(string.digits, k=6))
        super().save(*args, **kwargs)

    class Meta:
        verbose_name = "Patient"
        verbose_name_plural = "Patients"
        ordering = ['nom', 'prenom']