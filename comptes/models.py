from django.db import models
from django.contrib.auth.models import User
from patients.models import Personne

class Role(models.TextChoices):
    ADMIN      = 'admin',      'Administrateur'
    MEDECIN    = 'medecin',    'Médecin'
    INFIRMIER  = 'infirmier',  'Infirmier(ère)'
    SECRETAIRE = 'secretaire', 'Secrétaire'
    LABORANTIN = 'laborantin', 'Laborantin'

class TypeContrat(models.TextChoices):
    CDI       = 'cdi',       'CDI'
    CDD       = 'cdd',       'CDD'
    STAGE     = 'stage',     'Stage'
    VACATION  = 'vacation',  'Vacation'
    BENEVOLAT = 'benevolat', 'Bénévolat'


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
    service    = models.ForeignKey(
        'services.Service',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='employes'
    )

    # ── Contrat de travail ──────────────────────────────────────────────────
    type_contrat        = models.CharField(
        max_length=20,
        choices=TypeContrat.choices,
        blank=True, default=''
    )
    date_debut_contrat  = models.DateField(null=True, blank=True)
    date_fin_contrat    = models.DateField(null=True, blank=True)   # null = CDI sans limite
    description_poste   = models.TextField(blank=True)              # résumé des missions

    # ── Profil & Settings ───────────────────────────────────────────────────
    signature_medicale = models.TextField(
        blank=True,
        help_text="Texte affiché en bas des ordonnances et comptes rendus"
    )
    preferences = models.JSONField(
        default=dict,
        blank=True,
        help_text="Préférences utilisateur stockées en JSON"
    )
    est_major = models.BooleanField(
        default=False,
        help_text=(
            "Infirmier(ère) major — responsable de l'organisation des soins "
            "infirmiers de son service (assignation des patients, planning "
            "et congés des infirmiers). Uniquement pertinent si role='infirmier'."
        )
    )

    def save(self, *args, **kwargs):
        # vérification d'unicité en base avec retry avant assignation, plutôt qu'un tirage aléatoire
        # à l'aveugle qui pouvait produire un doublon.
        if not self.matricule:
            from healthtracker.identifiers import generer_identifiant_unique
            self.matricule = generer_identifiant_unique(Employe, 'matricule', 'E', 5)
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
            ),
            models.CheckConstraint(
                condition=models.Q(est_major=False) | models.Q(role='infirmier'),
                name='employe_est_major_seulement_infirmier',
            )
        ]