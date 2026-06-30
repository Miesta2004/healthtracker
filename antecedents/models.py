from django.db import models

class TypeAntecedent(models.TextChoices):
    MALADIE_CHRONIQUE = 'maladie_chronique', 'Maladie chronique'
    CHIRURGIE          = 'chirurgie',         'Chirurgie'
    ALLERGIE           = 'allergie',          'Allergie'
    FAMILIAL           = 'familial',          'Antécédent familial'
    AUTRE              = 'autre',             'Autre'

class StatutAntecedent(models.TextChoices):
    ACTIF  = 'actif',  'Actif'
    RESOLU = 'resolu', 'Résolu'

class Antecedent(models.Model):
    """
    Antécédent médical durable rattaché à un patient.
    Contrairement à un symptôme ponctuel d'une consultation (fièvre, douleur...),
    un antécédent représente une donnée de fond qui doit être connue à chaque
    nouvelle prise en charge (maladie chronique, chirurgie, allergie, antécédent
    familial...).

    Un antécédent peut être créé manuellement (à la création du dossier patient)
    ou rattaché à la consultation qui l'a révélé via `consultation_source`,
    quand un médecin décide explicitement qu'un diagnostic doit être conservé
    durablement dans le dossier.
    """

    patient = models.ForeignKey(
        'patients.Patient',
        on_delete = models.CASCADE,
        related_name = 'antecedents_details'
    )
    type_antecedent = models.CharField(
        max_length=30,
        choices=TypeAntecedent.choices,
        default=TypeAntecedent.AUTRE,
    )
    libelle = models.CharField(max_length=255)
    observations = models.TextField(blank=True)
    statut = models.CharField(
        max_length=10,
        choices=StatutAntecedent.choices,
        default=StatutAntecedent.ACTIF,
    )
    date_diagnostic = models.DateField()
    # Consultation à l'origine de cet antécédent (facultatif : un antécédent
    # peut aussi être déclaré directement, sans consultation associée).
    # SET_NULL : si la consultation est supprimée, l'antécédent reste au dossier.
    consultation_source = models.ForeignKey(
        'consultations.Consultation',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='antecedents_crees',
    )

    date_creation = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date_diagnostic']
        verbose_name = "Antécédent"
        verbose_name_plural = "Antécédents"
        constraints = [
            models.CheckConstraint(
                condition=models.Q(type_antecedent__in=TypeAntecedent.values),
                name='antecedent_type_valide',
            ),
            models.CheckConstraint(
                condition=models.Q(statut__in=StatutAntecedent.values),
                name='antecedent_statut_valide',
            ),
        ]

    def __str__(self):
        return f"{self.libelle} — {self.patient} ({self.get_statut_display()})"
