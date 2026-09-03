from django.db import models
from django.utils import timezone as dj_timezone
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

    class TypeConsultation(models.TextChoices):
        """
        Type "métier" de la consultation, renseigné par le médecin dans la
        modale « Nouvelle consultation » avant de démarrer. Distinct de
        `type_evenement` (catégorie d'agenda : consultation / examen /
        opération / autre) et de la spécialité du médecin — cf. discussion
        parcours consultation : ne pas mélanger type d'acte et spécialité.
        """
        INITIALE        = 'initiale',        'Consultation initiale'
        SUIVI            = 'suivi',            'Consultation de suivi'
        CONTROLE         = 'controle',         'Consultation de contrôle'
        URGENCE          = 'urgence',          'Consultation d\'urgence'
        PREOPERATOIRE    = 'preoperatoire',    'Consultation préopératoire'
        POSTOPERATOIRE   = 'postoperatoire',   'Consultation postopératoire'
        TELECONSULTATION = 'teleconsultation', 'Téléconsultation'
        AUTRE            = 'autre',            'Autre'

    class DecisionOrientation(models.TextChoices):
        """
        Où va le patient à l'issue de la consultation. Renseignée par le
        médecin (ConsultSerializer.validate rend ce champ obligatoire dès que
        statut passe à 'terminee') — avant l'ajout de ce champ, rien ne
        capturait cette décision : Consultation.save() faisait toujours
        'terminée + pas d'hospitalisation active → sorti', sans distinguer
        une vraie sortie d'un patient qu'il fallait en réalité hospitaliser
        ou renvoyer prendre un rendez-vous de suivi au secrétariat.
        """
        SORTIE           = 'sortie',           'Retour à domicile'
        HOSPITALISATION  = 'hospitalisation',  'Hospitalisation'
        RENDEZ_VOUS      = 'rendez_vous',      'Rendez-vous de suivi à prendre'

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
    type_consultation = models.CharField(
        max_length=20,
        choices=TypeConsultation.choices,
        blank=True,
        default='',
        help_text="Type de consultation choisi dans la modale de démarrage "
                  "(consultation initiale, suivi, contrôle...). Vide pour les "
                  "consultations créées avant l'ajout de ce champ.",
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

    # Horodatage réel du déroulement de la consultation (bouton "Démarrer" /
    # "Terminer" côté frontend) — source de vérité pour le chronomètre et,
    # plus tard, les statistiques d'activité (durée moyenne/médiane...).
    # Rempli automatiquement dans save() dès que le statut passe à
    # 'en_cours' / 'terminee', pas seulement depuis ce frontend précis :
    # ainsi tout appel API (admin, script, autre client) reste cohérent.
    started_at = models.DateTimeField(
        null=True, blank=True,
        help_text="Horodatage réel du démarrage (passage à 'en_cours'). Rempli automatiquement.",
    )
    ended_at = models.DateTimeField(
        null=True, blank=True,
        help_text="Horodatage réel de la fin (passage à 'terminee'). Rempli automatiquement.",
    )

    decision_orientation = models.CharField(
        max_length=20,
        choices=DecisionOrientation.choices,
        blank=True,
        default='',
        help_text="Décision du médecin sur le devenir du patient à la fin de "
                  "la consultation (sortie / hospitalisation / rendez-vous de "
                  "suivi). Voir save() : pilote la mise à jour de "
                  "Patient.statut_orientation.",
    )

    #Metadonnées
    date_creation = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        # Mise à jour AUTOMATIQUE du parcours administratif du patient — pas
        # besoin d'une action manuelle séparée côté secrétariat/médecin :
        #
        # - Consultation planifiée/en cours (à sa création) : le patient est
        #   "en consultation".
        # - Consultation TERMINÉE : on suit la décision explicite du médecin
        #   (decision_orientation) :
        #     · SORTIE           → patient "sorti"
        #     · HOSPITALISATION  → "à hospitaliser" (file d'attente : le
        #       service ouvre ensuite le dossier via HospitalisationViewSet,
        #       qui peut être lié à cette consultation via
        #       Hospitalisation.consultation_origine)
        #     · RENDEZ_VOUS      → "en attente de rendez-vous de suivi" (file
        #       d'attente secrétariat)
        #     · non renseignée (consultations créées avant ce champ, ou hors
        #       API) → comportement historique inchangé : "sorti"
        #   Dans tous les cas, si une hospitalisation est déjà EN_COURS en
        #   parallèle (décidée pendant cette même consultation), HOSPITALISE
        #   prime et on ne l'écrase pas.
        # - Consultation ANNULÉE : la visite n'a jamais vraiment eu lieu, on
        #   ne touche pas au parcours du patient.
        #
        # .update() plutôt que patient.save() : évite de redéclencher toute la
        # logique de Patient.save() (numéro de dossier…) pour un simple champ.
        est_nouvelle = self._state.adding

        # Horodatage réel début/fin — idempotent (ne touche jamais une valeur
        # déjà enregistrée), donc sans effet sur un simple enregistrement de
        # brouillon une fois la consultation déjà démarrée/terminée.
        if self.statut in ('en_cours', 'terminee') and self.started_at is None:
            self.started_at = dj_timezone.now()
        if self.statut == 'terminee' and self.ended_at is None:
            self.ended_at = dj_timezone.now()

        super().save(*args, **kwargs)

        from patients.models import Patient

        if self.statut == 'terminee':
            from hospitalisations.models import Hospitalisation, StatutHospitalisation
            a_hospitalisation_active = Hospitalisation.objects.filter(
                patient_id=self.patient_id, statut=StatutHospitalisation.EN_COURS
            ).exists()

            if not a_hospitalisation_active:
                if self.decision_orientation == self.DecisionOrientation.HOSPITALISATION:
                    nouveau_statut = Patient.StatutOrientation.A_HOSPITALISER
                elif self.decision_orientation == self.DecisionOrientation.RENDEZ_VOUS:
                    nouveau_statut = Patient.StatutOrientation.EN_ATTENTE_RDV_SUIVI
                else:
                    nouveau_statut = Patient.StatutOrientation.SORTI
                Patient.objects.filter(pk=self.patient_id).update(
                    statut_orientation=nouveau_statut
                )
        elif est_nouvelle and self.statut in ('planifiee', 'en_cours'):
            Patient.objects.filter(pk=self.patient_id).update(
                statut_orientation=Patient.StatutOrientation.EN_CONSULTATION
            )

    @property
    def duree_secondes(self):
        """
        Durée réelle de la consultation en secondes, calculée à partir de
        started_at/ended_at (pas de champ dupliqué en base — cf. discussion
        parcours consultation : ne pas créer duration_seconds si la durée se
        déduit proprement des deux horodatages).
        Retourne None tant que la consultation n'est pas terminée.
        """
        if self.started_at and self.ended_at:
            return max(0, int((self.ended_at - self.started_at).total_seconds()))
        return None

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