from django.db import models
from django.contrib.auth.models import User
from patients.models import Personne

class Role(models.TextChoices):
    ADMIN      = 'admin',      'Administrateur'
    MEDECIN    = 'medecin',    'Médecin'
    INFIRMIER  = 'infirmier',  'Infirmier(ère)'
    SECRETAIRE = 'secretaire', 'Secrétaire'
    LABORANTIN = 'laborantin', 'Laborantin'

class Employe(Personne):
    user = models.OneToOneField(
        User, on_delete=models.CASCADE,
        related_name='employe'
    )
    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.INFIRMIER
    )
    specialite  = models.CharField(max_length=100, blank=True)
    matricule   = models.CharField(max_length=20, unique=True, blank=True)
    actif       = models.BooleanField(default=True)
    service    = models.ForeignKey(              # ← nouveau
        'services.Service',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='employes'
    )

    def save(self, *args, **kwargs):
        if not self.matricule:
            import random, string
            self.matricule = 'E' + ''.join(random.choices(string.digits, k=5))
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.prenom} {self.nom} — {self.get_role_display()}"

    class Meta:
        verbose_name = "Employé"
        verbose_name_plural = "Employés"
        ordering = ['role', 'nom', 'prenom']
        constraints = [
            models.CheckConstraint(
                condition=models.Q(role__in=[r.value for r in Role]),
                name='employe_role_valid',
            ),
            models.CheckConstraint(
                condition=models.Q(sexe__in=['M', 'F']),
                name='employe_sexe_valid',  # ou 'patient_sexe_valid'
            )
        ]