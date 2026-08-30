"""Schémas de champs et rendu texte pour l'éditeur de documents structuré."""
from .models import TypeDocument

CHAMPS_VIDES = {
    TypeDocument.ORDONNANCE: {'medicaments': [], 'conseils_generaux': ''},
    TypeDocument.CERTIFICAT_MEDICAL: {
        'motif': '', 'constat': '', 'duree_repos_jours': None,
        'date_debut': '', 'date_fin': '', 'observations': '',
    },
    TypeDocument.DEMANDE_ANALYSE: {
        'examens': [], 'indication_clinique': '', 'urgence': 'normale', 'commentaires': '',
    },
    TypeDocument.COMPTE_RENDU_CONSULTATION: {'resume': '', 'evolution': '', 'recommandations': ''},
    TypeDocument.LETTRE_ORIENTATION: {
        'destinataire': '', 'motif_orientation': '', 'elements_cliniques': '', 'conclusion': '',
    },
    TypeDocument.ARRET_TRAVAIL: {'motif_medical': '', 'date_debut': '', 'date_fin': '', 'duree_jours': None},
    TypeDocument.AUTRE: {'texte_libre': ''},
}
CHAMPS_VIDES[TypeDocument.DEMANDE_IMAGERIE] = CHAMPS_VIDES[TypeDocument.DEMANDE_ANALYSE]


def champs_vides_pour(type_document):
    return dict(CHAMPS_VIDES.get(type_document, CHAMPS_VIDES[TypeDocument.AUTRE]))


def resumer_donnees(type_document, donnees):
    """Résumé texte lisible, recalculé côté serveur à chaque sauvegarde."""
    champs = (donnees or {}).get('champs', {}) or {}

    if type_document == TypeDocument.ORDONNANCE:
        lignes = []
        for m in champs.get('medicaments', []):
            morceaux = [m.get('nom', ''), m.get('dosage', ''), m.get('posologie', ''), m.get('frequence', '')]
            if m.get('duree'):
                morceaux.append(f"pendant {m['duree']}")
            lignes.append(' '.join(p for p in morceaux if p))
        texte = '\n'.join(f"- {l}" for l in lignes if l)
        if champs.get('conseils_generaux'):
            texte += f"\n\nConseils : {champs['conseils_generaux']}"
        return texte or "Ordonnance vide."

    if type_document == TypeDocument.CERTIFICAT_MEDICAL:
        parties = [champs.get('motif', ''), champs.get('constat', '')]
        if champs.get('duree_repos_jours'):
            parties.append(f"Repos de {champs['duree_repos_jours']} jour(s)")
        return ' — '.join(p for p in parties if p) or "Certificat médical vide."

    if type_document in (TypeDocument.DEMANDE_ANALYSE, TypeDocument.DEMANDE_IMAGERIE):
        noms = [e.get('nom', '') for e in champs.get('examens', [])]
        texte = ', '.join(n for n in noms if n)
        if champs.get('indication_clinique'):
            texte += f" — {champs['indication_clinique']}"
        return texte or "Demande d'examen vide."

    if type_document == TypeDocument.COMPTE_RENDU_CONSULTATION:
        return champs.get('resume', '') or "Compte rendu vide."

    if type_document == TypeDocument.LETTRE_ORIENTATION:
        parties = [champs.get('motif_orientation', ''), champs.get('destinataire', '')]
        return ' — '.join(p for p in parties if p) or "Lettre d'orientation vide."

    if type_document == TypeDocument.ARRET_TRAVAIL:
        if champs.get('date_debut') and champs.get('date_fin'):
            return f"Arrêt du {champs['date_debut']} au {champs['date_fin']}"
        return champs.get('motif_medical', '') or "Arrêt de travail vide."

    return champs.get('texte_libre', '') or ''
