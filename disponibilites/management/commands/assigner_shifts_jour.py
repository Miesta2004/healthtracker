from django.core.management.base import BaseCommand

from services.models import Service
from disponibilites.models import Shift
from disponibilites.shifts import shift_et_date_actuels, repartir_patients_hospitalises


class Command(BaseCommand):
    help = (
        "Assigne automatiquement les patients actuellement hospitalisés aux "
        "infirmiers de leur service, pour le poste (shift) en cours — ou pour "
        "les 3 postes de la journée avec --tous-les-postes. "
        "Idempotent : ne touche jamais une assignation déjà décidée par la "
        "majeure/le chef de service, complète seulement ce qui manque. "
        "À exécuter en phase de démo/test pour que la vue « Mes patients » de "
        "l'infirmier(ère) ne soit jamais vide sans avoir à relancer un seed "
        "complet (qui supprimerait toutes les autres données)."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--tous-les-postes', action='store_true',
            help="Remplit les 3 postes (matin/après-midi/nuit) du jour, pas seulement le poste actif à l'instant présent.",
        )
        parser.add_argument(
            '--service', type=str, default=None,
            help="Nom exact d'un service en particulier (défaut : tous les services actifs).",
        )

    def handle(self, *args, **options):
        date_courante, shift_courant = shift_et_date_actuels()
        postes = list(Shift) if options['tous_les_postes'] else [shift_courant]

        services_qs = Service.objects.filter(actif=True)
        if options['service']:
            services_qs = services_qs.filter(nom__iexact=options['service'])
            if not services_qs.exists():
                self.stderr.write(self.style.ERROR(f"Service introuvable : {options['service']}"))
                return

        total = 0
        for service in services_qs:
            for shift in postes:
                nb = repartir_patients_hospitalises(service.id, date_courante, shift)
                if nb:
                    self.stdout.write(f"  {service.nom} — {shift} : +{nb} assignation(s)")
                total += nb

        postes_label = ", ".join(str(p) for p in postes)
        self.stdout.write(self.style.SUCCESS(
            f"\n✅ {total} nouvelle(s) assignation(s) infirmier ↔ patient pour le "
            f"{date_courante} ({postes_label})."
        ))
