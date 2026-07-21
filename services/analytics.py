def occupation_service(service):
    """
    Taux d'occupation réel (lits actuellement occupés / capacité déclarée) et
    durée moyenne de séjour (sur les hospitalisations terminées) d'un service.
    `duree_jours` est une @property Python (pas un champ DB), donc la moyenne
    se calcule ici plutôt que via une agrégation SQL.
    """
    hospitalisations = service.hospitalisations.all()
    lits_occupes = hospitalisations.filter(statut='en_cours').count()

    taux_occupation = None
    if service.capacite_lits:
        taux_occupation = round(lits_occupes / service.capacite_lits * 100, 1)

    terminees = hospitalisations.filter(statut='terminee', date_sortie__isnull=False)
    durees = [h.duree_jours for h in terminees]
    duree_moyenne_sejour = round(sum(durees) / len(durees), 1) if durees else None

    return {
        'capacite_lits': service.capacite_lits,
        'lits_occupes': lits_occupes,
        'taux_occupation': taux_occupation,
        'duree_moyenne_sejour': duree_moyenne_sejour,
    }