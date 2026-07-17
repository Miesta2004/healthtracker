import random
import string


def generer_identifiant_unique(model_class, field_name: str, prefix: str, nb_chiffres: int, max_tentatives: int = 20) -> str:
    """
    Génère une valeur du type '<prefix><nb_chiffres chiffres aléatoires>' garantie
    unique sur `field_name` de `model_class`, en vérifiant l'absence en base avant
    de la retourner (plutôt que de laisser l'unique constraint échouer au save()
    en espérant ne jamais tomber sur une collision).

    Lève ValueError si aucune valeur libre n'a été trouvée après `max_tentatives`
    essais — un nombre de tentatives élevé qui échoue signale un espace de valeurs
    trop petit pour le volume de données (auquel cas il faut augmenter nb_chiffres,
    pas retenter indéfiniment).
    """
    for _ in range(max_tentatives):
        candidat = prefix + ''.join(random.choices(string.digits, k=nb_chiffres))
        if not model_class.objects.filter(**{field_name: candidat}).exists():
            return candidat

    raise ValueError(
        f"Impossible de générer un identifiant unique pour {model_class.__name__}.{field_name} "
        f"après {max_tentatives} tentatives (espace de valeurs probablement saturé, "
        f"augmenter nb_chiffres)."
    )