from django.core.management.base import BaseCommand

from facturation.nuitees import generer_nuitees_manquantes


class Command(BaseCommand):
    help = (
        "Ajoute une ligne de facturation 'nuitée' pour chaque nuit déjà "
        "passée par un patient hospitalisé (Hospitalisation en_cours, "
        "Facture liée ouverte) et pas encore facturée. Idempotent : "
        "n'ajoute jamais deux fois la même nuit, ne modifie jamais une "
        "ligne déjà créée. À exécuter une fois par jour (cron / tâche "
        "planifiée), par exemple juste après minuit — même principe que "
        "assigner_shifts_jour dans disponibilites."
    )

    def handle(self, *args, **options):
        resultat = generer_nuitees_manquantes()

        if resultat['ajoutees']:
            self.stdout.write(self.style.SUCCESS(
                f"✅ {resultat['ajoutees']} ligne(s) de nuitée ajoutée(s)."
            ))
        else:
            self.stdout.write("Aucune nouvelle nuitée à facturer.")

        for avertissement in resultat['avertissements']:
            self.stderr.write(self.style.WARNING(f"⚠ {avertissement}"))