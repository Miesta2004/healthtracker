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
    actif           = models.BooleanField(
        default=True,
        help_text="Reflète une activité récente dans le dossier (consultation, "
                  "hospitalisation, rendez-vous, signes vitaux). Recalculé "
                  "périodiquement via 'python manage.py recalculer_patients_actifs' "
                  "(seuil par défaut : 3 ans) ; peut aussi être ajusté manuellement.",
    )
    numero_dossier  = models.CharField(max_length=20, unique=True, blank=True)
    date_naissance_estimee = models.BooleanField(
        default=False,
        help_text="La date de naissance n'est pas connue avec certitude : elle a été "
                  "déduite d'un âge approximatif déclaré (convention : 1er juillet de "
                  "l'année de naissance estimée). À corriger dès que la vraie date est connue.",
    )

    class StatutVital(models.TextChoices):
        VIVANT  = 'vivant',  'Vivant'
        DECEDE  = 'decede',  'Décédé'

    statut_vital = models.CharField(
        max_length=10, choices=StatutVital.choices, default=StatutVital.VIVANT,
        help_text="Distinct de 'actif' : un patient décédé n'est pas 'inactif au sens "
                  "dossier plus suivi', c'est un fait clinique définitif. Positionné "
                  "automatiquement à 'décédé' par l'app morgue lors de l'enregistrement "
                  "d'un décès.",
    )
    service          = models.ForeignKey(          # ← nouveau
        'services.Service',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='patients'
    )
    medecin_referent = models.ForeignKey(          # ← nouveau
        'comptes.Employe',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='patients'
    )

    def save(self, *args, **kwargs):
        # Génère un numéro de dossier automatique, garanti unique (vérifié en
        # base avant assignation, avec retry en cas de collision — corrige le
        # tirage aléatoire précédent qui pouvait produire un doublon et faire
        # planter le save() sur l'unique constraint sans aucune récupération).
        if not self.numero_dossier:
            from healthtracker.identifiers import generer_identifiant_unique
            self.numero_dossier = generer_identifiant_unique(Patient, 'numero_dossier', 'P', 6)
        super().save(*args, **kwargs)

    class Meta:
        verbose_name = "Patient"
        verbose_name_plural = "Patients"
        ordering = ['nom', 'prenom']
        constraints = [
            models.CheckConstraint(
                condition=models.Q(
                    groupe_sanguin__in=['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
                )
                          | models.Q(groupe_sanguin=''),
                name='patient_groupe_sanguin_valid',
            ),
            models.CheckConstraint(
                condition=models.Q(sexe__in=['M', 'F']),
                name='employe_sexe_validate',
            )
        ]
