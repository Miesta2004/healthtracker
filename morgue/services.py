from django.utils import timezone

from .models import Deces, StatutDeces, LieuDeces


def enregistrer_deces(
        *, patient, date_deces=None, lieu_deces=None, operation_liee=None,
        necessite_autopsie=False, cause_presumee='', medecin_constatant=None,
):
    """
    Point d'entrée unique pour enregistrer un décès, quel que soit l'endroit
    du système qui le déclenche (déclaration directe via DecesViewSet, ou
    cascade automatique d'un décès au bloc opératoire — voir
    chirurgie.views.InterventionChirurgicaleViewSet._traiter_deces_au_bloc).

    Centralise l'invariant « Patient.statut_vital passe à 'decede' » : avant
    ce helper, seule DecesViewSet.perform_create le faisait ; le déplacer ici
    permet à chirurgie de déclencher exactement la même logique sans la
    dupliquer (et sans repasser par une requête HTTP interne).
    """
    if lieu_deces is None:
        lieu_deces = LieuDeces.HOPITAL

    statut_initial = (
        StatutDeces.EN_ATTENTE_AUTOPSIE if necessite_autopsie else StatutDeces.DISPENSE_AUTOPSIE
    )

    deces = Deces.objects.create(
        patient=patient,
        date_deces=date_deces or timezone.now(),
        lieu_deces=lieu_deces,
        operation_liee=operation_liee,
        necessite_autopsie=necessite_autopsie,
        cause_presumee=cause_presumee,
        medecin_constatant=medecin_constatant,
        statut=statut_initial,
    )

    patient.statut_vital = patient.StatutVital.DECEDE
    patient.save(update_fields=['statut_vital'])

    return deces
