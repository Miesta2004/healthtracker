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

    def save(self, *args, **kwargs):
        # Mise à jour AUTOMATIQUE du parcours administratif du patient : la
        # création d'une Consultation est, par définition, la preuve qu'il est
        # bien pris en charge en consultation — pas besoin d'une action manuelle
        # séparée côté secrétariat/médecin pour refléter ça sur le dossier.
        # .update() plutôt que patient.save() : évite de redéclencher toute la
        # logique de Patient.save() (numéro de dossier…) pour un simple champ.
        est_nouvelle = self._state.adding
        super().save(*args, **kwargs)
        if est_nouvelle:
            from patients.models import Patient
            Patient.objects.filter(pk=self.patient_id).update(
                statut_orientation=Patient.StatutOrientation.EN_CONSULTATION
            )

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

    TYPE_EVENEMENT_CHOICES = [
        ('consultation',        'Consultation'),
        ('intervention',        'Intervention'),
        ('reunion',             'Réunion'),
        ('formation',           'Formation'),
        ('garde',               'Garde'),
        ('visite_postoperatoire', 'Visite postopératoire'),
        ('autre',               'Autre'),
    ]

    patient = models.ForeignKey(
        Patient,
        on_delete=models.CASCADE,
        related_name='rendez_vous'
    )
    medecin = models.ForeignKey(
        'comptes.Employe',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='rendez_vous_medecin',
        limit_choices_to={'role': 'medecin'},
        help_text="Médecin avec qui le rendez-vous est pris (optionnel)"
    )
    date_heure = models.DateTimeField()
    duree_minutes = models.PositiveIntegerField(
        default=30,
        help_text="Durée prévue en minutes — utilisée pour calculer end_time côté planning."
    )
    motif = models.CharField(max_length=255)
    type_evenement = models.CharField(
        max_length=25, choices=TYPE_EVENEMENT_CHOICES, default='consultation',
        help_text="Catégorie affichée dans le planning médecin (couleur/icône) — "
                  "distincte de Consultation.type_evenement, propre au calendrier."
    )
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default='planifie')
    notes = models.TextField(blank=True)
    consultation_liee = models.ForeignKey(
        Consultation, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='rendez_vous_origine',
        help_text="Renseigné une fois qu'une Consultation a été créée depuis ce RDV "
                  "(cf. mon_planning) — permet au frontend de proposer 'Reprendre' "
                  "plutôt que 'Démarrer' la consultation."
    )
    date_creation = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"RDV {self.patient} - {self.date_heure.strftime('%d/%m/%Y %H:%M')}"

    class Meta:
        ordering = ['-date_heure']
        verbose_name = "Rendez-vous"
        verbose_name_plural = "Rendez-vous"


class TypeEvenementAdmin(models.TextChoices):
    REUNION   = 'reunion',   'Réunion'
    FORMATION = 'formation', 'Formation'
    GARDE     = 'garde',     'Garde'
    AUTRE     = 'autre',     'Autre'


class StatutEvenementAdmin(models.TextChoices):
    PLANIFIE = 'planifie', 'Planifié'
    ANNULE   = 'annule',   'Annulé'
    TERMINE  = 'termine',  'Terminé'


class EvenementAdministratif(models.Model):
    """
    Réunions, formations, gardes administratives — événements du calendrier
    qui ne concernent PAS un patient précis, contrairement à RendezVous (dont
    le champ `patient` est obligatoire). Création/modification/annulation
    réservées au chef de service ou à l'admin général — voir
    comptes.permissions.IsAdminRole, réutilisée telle quelle (cf.
    comptes/capacites.py : « IsAdminRole reste un contrôle par rôle unique +
    same_service, ça n'a pas besoin de la couche de capacités »).
    """
    titre = models.CharField(max_length=255)
    type_evenement = models.CharField(
        max_length=20, choices=TypeEvenementAdmin.choices, default=TypeEvenementAdmin.REUNION
    )
    service = models.ForeignKey(
        'services.Service', on_delete=models.CASCADE, null=True, blank=True,
        related_name='evenements_administratifs',
        help_text="Service concerné. Laisser vide pour un événement transversal "
                  "(tout l'hôpital) — dans ce cas, seul un superuser peut le modifier."
    )
    date_heure_debut = models.DateTimeField()
    date_heure_fin = models.DateTimeField()
    lieu = models.CharField(max_length=255, blank=True)
    description = models.TextField(blank=True)
    participants = models.ManyToManyField(
        'comptes.Employe', related_name='evenements_administratifs', blank=True,
        help_text="Optionnel — si vide, l'événement est simplement visible par tout le service concerné."
    )
    organisateur = models.ForeignKey(
        'comptes.Employe', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='evenements_organises'
    )
    statut = models.CharField(
        max_length=15, choices=StatutEvenementAdmin.choices, default=StatutEvenementAdmin.PLANIFIE
    )
    date_creation = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date_heure_debut']
        verbose_name = "Événement administratif"
        verbose_name_plural = "Événements administratifs"
        constraints = [
            models.CheckConstraint(
                condition=models.Q(date_heure_fin__gt=models.F('date_heure_debut')),
                name='evenement_admin_fin_apres_debut'
            )
        ]

    def __str__(self):
        return f"{self.get_type_evenement_display()} — {self.titre}"