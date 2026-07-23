import sys

from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = (
        "Réinitialise puis peuple entièrement la base avec un jeu de données de "
        "démonstration cohérent (services, employés, patients, rendez-vous/planning "
        "médecin, shifts infirmiers, urgences, hospitalisations, décès...). "
        "⚠️ Supprime au préalable toutes les données existantes de ces modèles "
        "(hors superusers Django). Réutilise la logique de seed.py à la racine du "
        "projet, exécutée dans une seule transaction (tout ou rien)."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--yes', '--no-input', action='store_true', dest='confirme',
            help="Ne pas demander de confirmation avant de supprimer les données existantes.",
        )

    def handle(self, *args, **options):
        if not options['confirme']:
            reponse = input(
                "⚠️  Cette opération va SUPPRIMER les données existantes (patients, "
                "rendez-vous, hospitalisations, urgences, employés...) puis les "
                "régénérer. Continuer ? [o/N] "
            )
            if reponse.strip().lower() not in ('o', 'oui', 'y', 'yes'):
                self.stdout.write(self.style.WARNING("Annulé."))
                return

        # seed.py vit à la racine du projet, à côté de manage.py — le répertoire
        # du script lancé par `python manage.py ...` est déjà en tête de
        # sys.path, donc pas de manipulation de chemin nécessaire ici.
        try:
            import seed
        except ImportError as exc:
            self.stderr.write(self.style.ERROR(
                f"Impossible d'importer seed.py depuis la racine du projet : {exc}"
            ))
            sys.exit(1)

        seed.run_seed()

        self.stdout.write(self.style.SUCCESS("\n✅ seed_db terminé avec succès."))