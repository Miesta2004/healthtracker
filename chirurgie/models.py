from django.core.exceptions import ValidationError
from django.db import models

from comptes.capacites import roles_avec_capacite, Capacite


def _roles_actes_medicaux():
    """
    Callable limit_choices_to — rôles pouvant être chirurgien principal
    d'une intervention. Passe par la couche de capacités plutôt qu'une liste
    en dur : un futur rôle héritant de médecin y apparaît automatiquement.
    """
    return {'role__in': roles_avec_capacite(Capacite.ACTES_MEDICAUX_GERER)}


class StatutSalle(models.TextChoices):
    DISPONIBLE              = 'disponible',              'Disponible'
    OCCUPE                  = 'occupe',                  'Occupée'
    DESINFECTION_APPROFONDIE = 'desinfection_approfondie', 'Désinfection approfondie'
    MAINTENANCE             = 'maintenance',              'Maintenance'


class SalleBloc(models.Model):
    """Salle d'opération d'un service."""
    nom = models.CharField(max_length=50)
    service = models.ForeignKey(
        'services.Service', on_delete=models.CASCADE,
        related_name='salles_bloc'
    )
    statut = models.CharField(
        max_length=25, choices=StatutSalle.choices, default=StatutSalle.DISPONIBLE
    )

    class Meta:
        unique_together = ('nom', 'service')
        ordering = ['service', 'nom']
        verbose_name = "Salle de bloc"
        verbose_name_plural = "Salles de bloc"

    def __str__(self):
        return f"{self.nom} ({self.service})"


class StatutIntervention(models.TextChoices):
    PROGRAMMEE    = 'programmee',    'Programmée'
    EN_COURS      = 'en_cours',      'En cours'
    TERMINEE      = 'terminee',      'Terminée'
    DECES_AU_BLOC = 'deces_au_bloc', 'Décès au bloc'
    ANNULEE       = 'annulee',       'Annulée'

    @classmethod
    def actifs(cls):
        """
        Statuts considérés comme "occupant" une salle sur son créneau — une
        méthode de classe, pas un attribut, pour que la métaclasse de
        TextChoices ne l'interprète pas à tort comme un statut de plus.
        """
        return [cls.PROGRAMMEE, cls.EN_COURS]


class InterventionChirurgicale(models.Model):
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

    # Nullable : l'intervention peut être PROGRAMMEE avant que l'admission
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
        limit_choices_to=_roles_actes_medicaux
    )
    # Gestion des rôles volontairement simple : pas de modèle de rattachement
    # équipe/rôle dédié — le rôle de chaque membre (anesthésiste, infirmier
    # de bloc...) se lit via Employe.specialite_principale, un référentiel
    # qui existe déjà et couvre tous les rôles, pas seulement les médecins.
    equipe = models.ManyToManyField(
        'comptes.Employe', related_name='operations_assistees', blank=True,
        help_text="Chirurgien(s) assistant(s), anesthésiste, infirmier(s) de bloc — "
                  "le rôle de chacun se lit sur son profil (spécialité)."
    )

    type_acte = models.CharField(
        max_length=200,
        help_text="Ex. « Cure de hernie inguinale »"
    )
    heure_debut = models.DateTimeField()
    heure_fin = models.DateTimeField()

    date_debut_reelle = models.DateTimeField(null=True, blank=True)
    date_fin_reelle   = models.DateTimeField(null=True, blank=True)

    statut = models.CharField(
        max_length=15, choices=StatutIntervention.choices,
        default=StatutIntervention.PROGRAMMEE
    )

    compte_rendu_operatoire = models.TextField(blank=True)
    complications = models.TextField(
        blank=True,
        help_text="Incident ou complication survenu pendant l'intervention, "
                  "y compris en cas de décès au bloc."
    )

    date_creation = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)

    def clean(self):
        if self.heure_debut and self.heure_fin and self.heure_fin <= self.heure_debut:
            raise ValidationError({'heure_fin': "L'heure de fin doit être postérieure à l'heure de début."})

        # Le chirurgien principal doit être habilité sur le service de
        # l'intervention : soit c'est son service de rattachement
        # (Employe.service), soit il a une HabilitationService active ET
        # valide à la date de l'intervention.
        if self.chirurgien_principal_id and self.service_chirurgie_id:
            from comptes.models import HabilitationService

            meme_service = self.chirurgien_principal.service_id == self.service_chirurgie_id

            habilitations = HabilitationService.objects.filter(
                employe=self.chirurgien_principal,
                service=self.service_chirurgie,
                actif=True,
            )
            date_ref = self.heure_debut.date() if self.heure_debut else None
            if date_ref:
                habilitations = habilitations.filter(
                    models.Q(date_debut__isnull=True) | models.Q(date_debut__lte=date_ref)
                ).filter(
                    models.Q(date_fin__isnull=True) | models.Q(date_fin__gte=date_ref)
                )
            habilite = habilitations.exists()

            if not (meme_service or habilite):
                raise ValidationError(
                    "Ce médecin n'est ni rattaché ni habilité sur le service de cette intervention "
                    "(ou son habilitation n'est plus valide à cette date)."
                )

        # Pas de double réservation de salle sur un créneau qui chevauche.
        if self.salle_id and self.heure_debut and self.heure_fin:
            conflits = InterventionChirurgicale.objects.filter(
                salle_id=self.salle_id,
                statut__in=StatutIntervention.actifs(),
            ).exclude(pk=self.pk)
            for autre in conflits:
                chevauche = self.heure_debut < autre.heure_fin and self.heure_fin > autre.heure_debut
                if chevauche:
                    raise ValidationError(
                        f"La salle {self.salle} est déjà occupée sur ce créneau "
                        f"(intervention #{autre.pk} de {autre.heure_debut.strftime('%H:%M')} "
                        f"à {autre.heure_fin.strftime('%H:%M')})."
                    )

    class Meta:
        ordering = ['-heure_debut']
        verbose_name = "Intervention chirurgicale"
        verbose_name_plural = "Interventions chirurgicales"

    def __str__(self):
        return f"{self.type_acte} — {self.patient} ({self.get_statut_display()})"
