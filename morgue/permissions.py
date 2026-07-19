from comptes.permissions import RequiertCapacite
from comptes.capacites import Capacite


class PeutVoirMorgue(RequiertCapacite):
    """
    Lecture des dossiers de décès/autopsie : équipe médicale + secrétariat
    (coordination avec la famille pour la remise du corps). Le laborantin
    n'a pas de raison d'y accéder.
    """
    capacite = Capacite.MORGUE_LIRE


class PeutValiderAutopsiePerioperatoire(RequiertCapacite):
    """
    Validation du rapport d'autopsie (`rapport_valide`) lorsque le décès fait
    suite à une complication chirurgicale. Exclusif au Chef de Chirurgie (+
    superuser). Distinct de PeutVoirMorgue : voir un dossier et le valider
    sont deux capacités différentes.

    NB : ne s'applique qu'aux autopsies liées à une opération — une autopsie
    sans lien chirurgical reste validable par n'importe quel médecin via le
    comportement par défaut (voir morgue/views.py).
    """
    capacite = Capacite.AUTOPSIE_VALIDER_PERIOP