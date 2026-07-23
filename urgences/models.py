from django.db import models
from patients.models import Patient


class NiveauTri(models.IntegerChoices):
    """Échelle de triage façon CIMU/ESI — 1 = vital, 5 = non urgent."""
    NIVEAU_1 = 1, '1 — Réanimation immédiate'
    NIVEAU_2 = 2, '2 — Très urgent'
    NIVEAU_3 = 3, '3 — Urgent'
    NIVEAU_4 = 4, '4 — Peu urgent'
    NIVEAU_5 = 5, '5 — Non urgent'


class ModeArrivee(models.TextChoices):
    PIED       = 'pied',       'Par ses propres moyens'
    AMBULANCE  = 'ambulance',  'Ambulance / SAMU'
    POLICE     = 'police',     'Police / Pompiers'
    TRANSFERT  = 'transfert',  "Transfert d'un autre établissement"
    AUTRE      = 'autre',      'Autre'


class StatutUrgence(models.TextChoices):
    EN_ATTENTE    = 'en_attente',    'En attente'
    EN_CONSULTATION = 'en_consultation', 'En consultation'
    SORTI         = 'sorti',         'Sorti'


class DecisionSortie(models.TextChoices):
    DOMICILE             = 'domicile',             'Retour à domicile'
    HOSPITALISATION      = 'hospitalisation',      'Hospitalisation'
    TRANSFERT            = 'transfert',            'Transféré vers un autre établissement'
    PARTI_SANS_ATTENDRE  = 'parti_sans_attendre',  "Parti sans attendre"
    DECES                = 'deces',                'Décès'


class PassageUrgence(models.Model):
    """Passage d'un patient au service des urgences."""

    patient = models.ForeignKey(
        Patient,
        on_delete=models.CASCADE,
        related_name='passages_urgence'
    )
    service = models.ForeignKey(
        'services.Service',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='passages_urgence'
    )
    infirmier_accueil = models.ForeignKey(
        'comptes.Employe',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='accueils_urgence',
        limit_choices_to={'role': 'infirmier'}
    )
    medecin_examinateur = models.ForeignKey(
        'comptes.Employe',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='examens_urgence',
        limit_choices_to={'role': 'medecin'}
    )
    hospitalisation = models.OneToOneField(
        'hospitalisations.Hospitalisation',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='passage_urgence_origine'
    )

    date_arrivee  = models.DateTimeField()
    mode_arrivee  = models.CharField(max_length=20, choices=ModeArrivee.choices, default=ModeArrivee.PIED)
    niveau_tri    = models.IntegerField(choices=NiveauTri.choices, null=True, blank=True)

    motif      = models.TextField()
    diagnostic = models.TextField(blank=True)
    notes      = models.TextField(blank=True)

    statut   = models.CharField(max_length=20, choices=StatutUrgence.choices, default=StatutUrgence.EN_ATTENTE)
    decision = models.CharField(max_length=20, choices=DecisionSortie.choices, blank=True)

    date_sortie = models.DateTimeField(null=True, blank=True)

    date_prise_en_charge = models.DateTimeField(
        null=True, blank=True,
        help_text="Renseigné automatiquement dès qu'un médecin_examinateur est assigné — "
                  "alimente le KPI 'temps moyen de prise en charge' (Analytics > Qualité)."
    )

    date_creation     = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Urgence {self.patient} — {self.date_arrivee.strftime('%d/%m/%Y %H:%M')}"

    @property
    def temps_attente_minutes(self):
        """Minutes écoulées depuis l'arrivée (utile pour la file d'attente)."""
        from django.utils import timezone
        fin = self.date_sortie or timezone.now()
        return int((fin - self.date_arrivee).total_seconds() // 60)

    class Meta:
        verbose_name = "Passage aux urgences"
        verbose_name_plural = "Passages aux urgences"
        ordering = ['niveau_tri', 'date_arrivee']
        constraints = [
            models.CheckConstraint(
                condition=models.Q(statut__in=[s.value for s in StatutUrgence]),
                name='urgence_statut_valid',
            ),
        ]