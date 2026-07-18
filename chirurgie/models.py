from datetime import timedelta

from django.core.exceptions import ValidationError
from django.db import models


class StatutOperation(models.TextChoices):
    PLANIFIEE    = 'planifiee',    'Planifiée'
    CONFIRMEE    = 'confirmee',    'Confirmée'            # salle + équipe validées
    EN_COURS     = 'en_cours',     'En cours'
    TERMINEE     = 'terminee',     'Terminée'
    COMPLICATION = 'complication', 'Terminée avec complication'
    REPORTEE     = 'reportee',     'Reportée'
    ANNULEE      = 'annulee',      'Annulée'

    @classmethod
    def actifs(cls):
        """
        Statuts considérés comme "occupant" une salle sur son créneau — une
        méthode de classe, pas un attribut, pour que la métaclasse de
        TextChoices ne l'interprète pas à tort comme un 8e statut.
        """
        return [cls.PLANIFIEE, cls.CONFIRMEE, cls.EN_COURS]


class SalleBloc(models.Model):
    """Salle d'opération d'un service. Pas de créneaux récurrents propres —
    sa disponibilité se déduit des Operation déjà planifiées dessus."""
    nom = models.CharField(max_length=50)
    service = models.ForeignKey(
        'services.Service', on_delete=models.CASCADE,
        related_name='salles_bloc'
    )
    actif = models.BooleanField(default=True)

    class Meta:
        unique_together = ('nom', 'service')
        ordering = ['service', 'nom']
        verbose_name = "Salle de bloc"
        verbose_name_plural = "Salles de bloc"

    def __str__(self):
        return f"{self.nom} ({self.service})"


class Operation(models.Model):
    patient = models.ForeignKey(
        'patients.Patient', on_delete=models.CASCADE,
        related_name='operations'
    )

    # Origine clinique : la consultation où l'indication opératoire a été
    # posée (consultations.Consultation, type_evenement='operation').
    consultation_indication = models.ForeignKey(
        'consultations.Consultation', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='operations_indiquees'
    )

    # Nullable : l'opération peut être PLANIFIEE avant que l'admission
    # (l'hospitalisation péri-opératoire) ne soit créée le jour J.
    hospitalisation = models.ForeignKey(
        'hospitalisations.Hospitalisation', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='operations'
    )

    service_chirurgie = models.ForeignKey(
        'services.Service', on_delete=models.PROTECT,
        related_name='operations'
    )
    salle = models.ForeignKey(
        SalleBloc, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='operations'
    )

    chirurgien_principal = models.ForeignKey(
        'comptes.Employe', on_delete=models.PROTECT,
        related_name='operations_dirigees',
        limit_choices_to={'role': 'medecin'}
    )
    equipe = models.ManyToManyField(
        'comptes.Employe', related_name='operations_assistees', blank=True,
        help_text="Chirurgien(s) assistant(s), anesthésiste, infirmier(s) de bloc."
    )

    type_intervention = models.CharField(
        max_length=200,
        help_text="Ex. « Cure de hernie inguinale »"
    )
    date_heure_prevue = models.DateTimeField()
    duree_estimee_min = models.PositiveIntegerField(default=60)

    date_debut_reelle = models.DateTimeField(null=True, blank=True)
    date_fin_reelle   = models.DateTimeField(null=True, blank=True)

    statut = models.CharField(
        max_length=15, choices=StatutOperation.choices,
        default=StatutOperation.PLANIFIEE
    )

    compte_rendu_operatoire = models.TextField(blank=True)
    complications = models.TextField(
        blank=True,
        help_text="Renseigné si statut='complication' — description de l'incident."
    )

    date_creation = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)

    def clean(self):
        # Le chirurgien principal doit être habilité sur le service de
        # l'opération : soit c'est son service de rattachement (Employe.service),
        # soit il a une HabilitationService active dessus.
        if self.chirurgien_principal_id and self.service_chirurgie_id:
            from comptes.models import HabilitationService

            meme_service = self.chirurgien_principal.service_id == self.service_chirurgie_id
            habilite = HabilitationService.objects.filter(
                employe=self.chirurgien_principal,
                service=self.service_chirurgie,
                actif=True,
            ).exists()
            if not (meme_service or habilite):
                raise ValidationError(
                    "Ce médecin n'est ni rattaché ni habilité sur le service de cette opération."
                )

        # Pas de double réservation de salle sur un créneau qui chevauche.
        if self.salle_id and self.date_heure_prevue:
            fin_prevue = self.date_heure_prevue + timedelta(minutes=self.duree_estimee_min)
            conflits = Operation.objects.filter(
                salle_id=self.salle_id,
                statut__in=StatutOperation.actifs(),
            ).exclude(pk=self.pk)
            for autre in conflits:
                autre_fin = autre.date_heure_prevue + timedelta(minutes=autre.duree_estimee_min)
                chevauche = self.date_heure_prevue < autre_fin and fin_prevue > autre.date_heure_prevue
                if chevauche:
                    raise ValidationError(
                        f"La salle {self.salle} est déjà occupée sur ce créneau "
                        f"(opération #{autre.pk} de {autre.date_heure_prevue.strftime('%H:%M')} "
                        f"à {autre_fin.strftime('%H:%M')})."
                    )

    class Meta:
        ordering = ['-date_heure_prevue']
        verbose_name = "Opération"
        verbose_name_plural = "Opérations"

    def __str__(self):
        return f"{self.type_intervention} — {self.patient} ({self.get_statut_display()})"
