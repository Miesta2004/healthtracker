from datetime import timedelta
from django.utils import timezone
from .models import Shift


def shift_et_date_actuels(now=None):
    """
    Détermine le poste (shift) en cours et sa date "logique".
    Le poste de nuit (23h–7h) traverse minuit : entre 0h et 7h, on est
    encore dans le poste de nuit qui a COMMENCÉ la veille — donc sa date
    logique reste celle de la veille (comme sur un planning papier).
    """
    now = now or timezone.localtime()
    h = now.hour

    if 7 <= h < 15:
        return now.date(), Shift.MATIN
    if 15 <= h < 23:
        return now.date(), Shift.APRES_MIDI
    if h >= 23:
        return now.date(), Shift.NUIT
    return now.date() - timedelta(days=1), Shift.NUIT


def repartir_patients_hospitalises(service_id, date_cible, shift_cible):
    """
    Fallback / démo : répartit round-robin les patients ACTUELLEMENT
    hospitalisés (statut EN_COURS) d'un service entre les infirmiers de ce
    même service, pour un jour et un poste donnés.

    Idempotent — s'appuie sur get_or_create, donc n'écrase et ne duplique
    jamais une assignation déjà décidée par la majeure/chef de service ;
    elle se contente de compléter ce qui manque. Peut être appelée aussi
    bien depuis seed.py, une management command, ou en direct depuis une vue
    (auto-assignation à la connexion d'une infirmière sans shift défini).

    Retourne le nombre d'assignations nouvellement créées.
    """
    from hospitalisations.models import Hospitalisation, StatutHospitalisation
    from comptes.models import Employe
    from .models import AssignationPatient

    if not service_id:
        return 0

    patients_actifs = list(
        Hospitalisation.objects.filter(
            service_id=service_id, statut=StatutHospitalisation.EN_COURS,
        ).select_related('patient').order_by('id')
    )
    if not patients_actifs:
        return 0

    infirmiers_service = list(
        Employe.objects.filter(service_id=service_id, role='infirmier').order_by('id')
    )
    if not infirmiers_service:
        return 0

    nb_infirmiers = len(infirmiers_service)
    creees = 0
    for i, hosp in enumerate(patients_actifs):
        infirmier_cible = infirmiers_service[i % nb_infirmiers]
        _, created = AssignationPatient.objects.get_or_create(
            infirmier=infirmier_cible, patient=hosp.patient,
            date=date_cible, shift=shift_cible,
            defaults={'service_id': service_id},
        )
        if created:
            creees += 1
    return creees