from django.core.exceptions import ValidationError
from django.db import models

from comptes.capacites import roles_avec_capacite, Capacite


def _roles_actes_medicaux():
    """Callable limit_choices_to — mêmes rôles que chirurgie.models, DRY."""
    return {'role__in': roles_avec_capacite(Capacite.ACTES_MEDICAUX_GERER)}


class LieuDeces(models.TextChoices):
    HOPITAL      = 'hopital',      "À l'hôpital"
    HORS_HOPITAL = 'hors_hopital', "Hors de l'hôpital (transfert)"


class StatutDeces(models.TextChoices):
    EN_ATTENTE_AUTOPSIE = 'en_attente_autopsie', "En attente d'autopsie"
    DISPENSE_AUTOPSIE   = 'dispense_autopsie',   "Autopsie non requise"
    AUTOPSIE_TERMINEE   = 'autopsie_terminee',   "Autopsie terminée"
    CORPS_REMIS         = 'corps_remis',         "Corps remis à la famille"


class Deces(models.Model):
    """
    Enregistrement d'un décès et de sa prise en charge par la morgue.
    Distinct de l'acte médical d'autopsie (voir `Autopsie`, optionnelle et liée) —
    un décès peut très bien ne jamais donner lieu à autopsie (mort naturelle en
    soins, sans caractère suspect).
    """
    patient = models.OneToOneField(
        'patients.Patient', on_delete=models.CASCADE, related_name='deces',
    )
    date_deces  = models.DateTimeField()
    lieu_deces  = models.CharField(max_length=15, choices=LieuDeces.choices, default=LieuDeces.HOPITAL)
    cause_presumee = models.TextField(
        blank=True, help_text="Cause présumée à l'entrée en morgue, avant autopsie éventuelle.",
    )
    necessite_autopsie = models.BooleanField(
        default=False,
        help_text="Mort suspecte / cadre judiciaire, ou demande scientifique/diagnostique.",
    )
    statut = models.CharField(max_length=25, choices=StatutDeces.choices, default=StatutDeces.DISPENSE_AUTOPSIE)

    operation_liee = models.ForeignKey(
        'chirurgie.Operation', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='deces_lies',
        help_text=(
            "À renseigner si le décès fait suite à une complication chirurgicale "
            "péri-opératoire. Conditionne qui peut valider le rapport d'autopsie "
            "(voir Capacite.AUTOPSIE_VALIDER_PERIOP) : le Chef de Chirurgie si "
            "renseigné, n'importe quel médecin sinon."
        ),
    )

    medecin_constatant = models.ForeignKey(
        'comptes.Employe', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='deces_constates', limit_choices_to=_roles_actes_medicaux,
        help_text="Médecin ayant constaté le décès.",
    )

    reclamant_nom       = models.CharField(max_length=150, blank=True)
    reclamant_lien       = models.CharField(max_length=100, blank=True, help_text="Ex : époux, fille, frère...")
    reclamant_telephone = models.CharField(max_length=30, blank=True)
    date_remise_corps    = models.DateTimeField(null=True, blank=True)

    notes = models.TextField(blank=True)

    date_creation     = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)

    def clean(self):
        if self.operation_liee_id and self.patient_id:
            if self.operation_liee.patient_id != self.patient_id:
                raise ValidationError(
                    {'operation_liee': "Cette opération ne concerne pas le patient de ce décès."}
                )

    def __str__(self):
        return f"Décès — {self.patient} ({self.date_deces.strftime('%d/%m/%Y')})"

    class Meta:
        verbose_name = "Décès"
        verbose_name_plural = "Décès"
        ordering = ['-date_deces']


class TypeAutopsie(models.TextChoices):
    JUDICIAIRE = 'judiciaire', 'Judiciaire (réquisition)'
    MEDICALE   = 'medicale',   'Médicale (scientifique / diagnostique)'


class Autopsie(models.Model):
    """
    Acte médico-légal distinct du décès lui-même. N'importe quel médecin peut
    en principe être désigné (la médecine légale est une spécialité à part,
    mais en pratique — surtout hors des grands centres — un médecin non
    spécialisé peut être amené à la réaliser faute de légiste dédié). Le champ
    `Employe.specialite` ("Médecine légale") permet de repérer les médecins
    spécialisés sans bloquer les autres.
    """
    deces = models.OneToOneField(Deces, on_delete=models.CASCADE, related_name='autopsie')

    medecin_legiste = models.ForeignKey(
        'comptes.Employe', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='autopsies_realisees', limit_choices_to=_roles_actes_medicaux,
    )
    type = models.CharField(max_length=12, choices=TypeAutopsie.choices, default=TypeAutopsie.MEDICALE)
    date_autopsie = models.DateTimeField()

    cause_deces_determinee = models.TextField(blank=True)
    constatations          = models.TextField(blank=True)

    rapport_valide    = models.BooleanField(default=False)
    date_validation    = models.DateTimeField(null=True, blank=True)

    date_creation = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Autopsie — {self.deces.patient} ({self.date_autopsie.strftime('%d/%m/%Y')})"

    class Meta:
        verbose_name = "Autopsie"
        verbose_name_plural = "Autopsies"
        ordering = ['-date_autopsie']