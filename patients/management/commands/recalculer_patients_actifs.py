from datetime import timedelta

from django.core.management.base import BaseCommand
from django.db.models import Max
from django.utils import timezone

from patients.models import Patient
from consultations.models import Consultation, RendezVous
from hospitalisations.models import Hospitalisation
from signes_vitaux.models import SignesVitaux


class Command(BaseCommand):
    help = (
        "Recalcule le champ 'actif' de chaque patient selon la date de sa dernière "
        "activité connue (consultation, hospitalisation, rendez-vous, signes vitaux). "
        "Un patient sans aucune activité depuis le seuil devient inactif. Les patients "
        "décédés (statut_vital='decede') ne sont jamais touchés — ce champ répond à "
        "une question différente (suivi actif du dossier, pas fait clinique)."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--seuil-jours', type=int, default=365 * 3,
            help="Nombre de jours d'inactivité au-delà duquel un patient devient inactif (défaut : 3 ans).",
        )
        parser.add_argument(
            '--dry-run', action='store_true',
            help="N'applique aucun changement, affiche seulement ce qui serait modifié.",
        )

    def handle(self, *args, **options):
        seuil = timezone.now() - timedelta(days=options['seuil_jours'])
        dry_run = options['dry_run']

        patients = Patient.objects.exclude(statut_vital=Patient.StatutVital.DECEDE)

        nb_passes_inactif = 0
        nb_passes_actif = 0

        for patient in patients:
            dernieres_dates = [
                Consultation.objects.filter(patient=patient).aggregate(m=Max('date'))['m'],
                RendezVous.objects.filter(patient=patient).aggregate(m=Max('date_heure'))['m'],
                Hospitalisation.objects.filter(patient=patient).aggregate(m=Max('date_admission'))['m'],
                SignesVitaux.objects.filter(patient=patient).aggregate(m=Max('date'))['m'],
                patient.date_creation,
            ]
            derniere_activite = max([d for d in dernieres_dates if d is not None])
            devrait_etre_actif = derniere_activite >= seuil

            if devrait_etre_actif != patient.actif:
                if devrait_etre_actif:
                    nb_passes_actif += 1
                else:
                    nb_passes_inactif += 1
                self.stdout.write(
                    f"{'[dry-run] ' if dry_run else ''}{patient} : "
                    f"{'actif' if patient.actif else 'inactif'} → {'actif' if devrait_etre_actif else 'inactif'} "
                    f"(dernière activité : {derniere_activite.date()})"
                )
                if not dry_run:
                    patient.actif = devrait_etre_actif
                    patient.save(update_fields=['actif'])

        self.stdout.write(self.style.SUCCESS(
            f"Terminé. {nb_passes_inactif} patient(s) passé(s) inactif, "
            f"{nb_passes_actif} repassé(s) actif."
            f"{' (dry-run, rien n’a été modifié)' if dry_run else ''}"
        ))
