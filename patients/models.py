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

    class StatutOrientation(models.TextChoices):
        EN_ATTENTE_VALIDATION_SERVICE = 'en_attente_validation_service', "En attente de validation par le service"
        ADMIS_DANS_LE_SERVICE         = 'admis_dans_le_service',         'Admis dans le service'
        EN_CONSULTATION               = 'en_consultation',               'En consultation'
        A_HOSPITALISER                = 'a_hospitaliser',                'À hospitaliser'
        HOSPITALISE                  = 'hospitalise',                   'Hospitalisé'
        ADMIS_URGENCES                = 'admis_urgences',                'Admis aux urgences'
        EN_ATTENTE_RDV_SUIVI          = 'en_attente_rdv_suivi',          'En attente de rendez-vous de suivi'
        SORTI                         = 'sorti',                         'Sorti'

    statut_orientation = models.CharField(
        max_length=30,
        choices=StatutOrientation.choices,
        default=StatutOrientation.EN_ATTENTE_VALIDATION_SERVICE,
        help_text="Parcours administratif du patient depuis son admission : "
                  "'en_attente_validation_service' (créé + orienté par les Admissions, "
                  "en attente que le secrétariat du service confirme l'arrivée) → "
                  "'admis_dans_le_service' (confirmé) → 'en_consultation' (mis à jour "
                  "AUTOMATIQUEMENT par consultations.Consultation.save()) → à l'issue de la "
                  "consultation, selon Consultation.decision_orientation choisie par le "
                  "médecin : 'a_hospitaliser' (en attente qu'un service ouvre le dossier "
                  "d'hospitalisation, cf. Hospitalisation.consultation_origine), "
                  "'en_attente_rdv_suivi' (le secrétariat doit programmer un RDV), ou "
                  "directement 'sorti'. 'hospitalise' est positionné automatiquement par "
                  "hospitalisations.Hospitalisation.save() dès qu'un dossier "
                  "d'hospitalisation est réellement ouvert. Chemin parallèle : "
                  "'admis_urgences' pour une admission d'urgence vitale à identité "
                  "provisoire (voir identite_provisoire), avant régularisation.",
    )

    # ── Admission d'urgence / identité provisoire ───────────────────────────
    identite_provisoire = models.BooleanField(
        default=False,
        help_text="Patient créé en mode 'Urgence Vitale / Identité Provisoire' "
                  "(inconscient, seul, sans papiers) : état civil non fiable tant que "
                  "ce champ est True. Passé à False par l'action de régularisation, qui "
                  "NE modifie que l'identité — l'historique médical déjà créé pendant "
                  "l'urgence (consultations, signes vitaux…) n'est jamais altéré.",
    )
    regularise_par = models.ForeignKey(
        'comptes.Employe', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='patients_regularises',
        help_text="Agent d'admission ayant effectué la régularisation d'identité.",
    )
    date_regularisation = models.DateTimeField(null=True, blank=True)

    # ── Contact d'urgence ────────────────────────────────────────────────────
    contact_urgence_nom       = models.CharField(max_length=150, blank=True)
    contact_urgence_telephone = models.CharField(max_length=20, blank=True)
    contact_urgence_lien      = models.CharField(
        max_length=50, blank=True,
        help_text="Lien de parenté avec le patient (ex : conjoint, parent, ami)."
    )

    # ── Couverture sociale / mutuelle ────────────────────────────────────────
    mutuelle        = models.CharField(
        max_length=150, blank=True,
        help_text="Nom de la mutuelle / assurance santé (vide = non couvert ou inconnu)."
    )
    numero_mutuelle = models.CharField(max_length=50, blank=True)

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


class Accompagnant(models.Model):
    """
    Personne accompagnant un patient lors de son admission — traçabilité des
    accès à l'établissement (identitovigilance) et point de contact rapide en
    complément du contact d'urgence du patient (qui, lui, n'est pas forcément
    présent physiquement). Un patient peut avoir plusieurs accompagnants au
    fil du temps ; on garde l'historique plutôt que d'écraser (`statut` +
    `date_sortie`) pour la traçabilité des accès plutôt qu'un simple champ
    unique sur Patient.
    """

    class Statut(models.TextChoices):
        PRESENT = 'present', 'Présent'
        SORTI   = 'sorti',   'Sorti'

    patient = models.ForeignKey(
        Patient, on_delete=models.CASCADE,
        related_name='accompagnants'
    )
    nom              = models.CharField(max_length=100)
    prenom           = models.CharField(max_length=100)
    lien_parente     = models.CharField(
        max_length=50, blank=True,
        help_text="Lien avec le patient (ex : conjoint, parent, enfant, ami)."
    )
    cni              = models.CharField(
        max_length=30, blank=True,
        help_text="Numéro de pièce d'identité présentée (CNI, passeport…) — "
                  "utilisé pour la recherche inversée et le contrôle d'accès.",
    )
    telephone        = models.CharField(max_length=20, blank=True)
    statut           = models.CharField(
        max_length=10, choices=Statut.choices, default=Statut.PRESENT,
        help_text="PRÉSENT tant que l'accompagnant n'a pas été pointé en sortie "
                  "(contrôle d'accès) ; SORTI une fois son passage terminé.",
    )
    date_entree      = models.DateTimeField(auto_now_add=True)
    date_sortie      = models.DateTimeField(null=True, blank=True)
    enregistre_par   = models.ForeignKey(
        'comptes.Employe', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='accompagnants_enregistres',
        help_text="Agent ayant enregistré l'accompagnant (traçabilité)."
    )

    class Meta:
        verbose_name = "Accompagnant"
        verbose_name_plural = "Accompagnants"
        ordering = ['-date_entree']
        indexes = [
            models.Index(fields=['nom', 'prenom'], name='accompagnant_nom_prenom_idx'),
            models.Index(fields=['telephone'], name='accompagnant_telephone_idx'),
            models.Index(fields=['cni'], name='accompagnant_cni_idx'),
            models.Index(fields=['statut'], name='accompagnant_statut_idx'),
        ]

    def __str__(self):
        return f"{self.prenom} {self.nom} (accompagnant de {self.patient})"
