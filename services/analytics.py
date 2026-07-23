from datetime import timedelta

from django.db.models import Q
from django.utils import timezone


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


# ═══════════════════════════════════════════════════════════════════════════
# Indicateurs qualité & sécurité (Analytics > onglet Qualité)
#
# Volontairement construits UNIQUEMENT à partir de ce que l'application
# trace déjà réellement — aucun nouveau modèle "événement indésirable"
# générique (chutes, erreurs médicamenteuses...) n'a été créé : ça n'existe
# nulle part dans la base actuelle, et l'inventer produirait des données
# tout aussi fictives qu'avant, juste stockées différemment. Ce qui EST
# réellement tracé :
#   - chirurgie.Operation.statut='complication' + le champ texte
#     `complications` → taux de complications post-opératoires réel
#   - chirurgie.Operation.date_debut_reelle/date_fin_reelle → temps
#     opératoire moyen réel
#   - hospitalisations.Hospitalisation → taux de réadmission à 30 jours,
#     calculé (pas stocké), à partir des vraies admissions/sorties
#   - consultations.RendezVous.statut='annule' → taux d'annulation réel
#   - urgences.PassageUrgence.date_prise_en_charge (nouveau champ, posé
#     automatiquement par l'action prise_en_charge) → temps de prise en
#     charge moyen réel, uniquement sur les passages traités depuis l'ajout
#     du champ (les anciens passages n'ont pas cette donnée rétroactivement
#     — c'est honnête : on ne peut pas savoir quand ils ont été pris en
#     charge si ça n'a jamais été enregistré).
# ═══════════════════════════════════════════════════════════════════════════

def _taux_complications(services_qs, depuis, jusqu_a):
    from chirurgie.models import Operation, StatutOperation
    ops = Operation.objects.filter(
        service_chirurgie__in=services_qs,
        date_heure_prevue__date__range=(depuis, jusqu_a),
        statut__in=[StatutOperation.TERMINEE, StatutOperation.COMPLICATION],
    )
    total = ops.count()
    complications = ops.filter(statut=StatutOperation.COMPLICATION).count()
    taux = round(complications / total * 100, 1) if total else None
    return taux, complications, total


def _taux_readmission(services_qs, depuis, jusqu_a):
    from hospitalisations.models import Hospitalisation
    admissions = Hospitalisation.objects.filter(
        service__in=services_qs, date_admission__date__range=(depuis, jusqu_a),
    ).select_related('patient')
    total = admissions.count()
    if total == 0:
        return None, 0, 0

    readmissions = 0
    for h in admissions:
        prealable = Hospitalisation.objects.filter(
            patient=h.patient, service=h.service,
            date_sortie__isnull=False,
            date_sortie__lt=h.date_admission,
            date_sortie__gte=h.date_admission - timedelta(days=30),
        ).exclude(pk=h.pk).exists()
        if prealable:
            readmissions += 1
    taux = round(readmissions / total * 100, 1)
    return taux, readmissions, total


def _taux_annulation(services_qs, depuis, jusqu_a):
    from consultations.models import RendezVous
    rdv = RendezVous.objects.filter(
        Q(medecin__service__in=services_qs) | Q(patient__service__in=services_qs),
        date_heure__date__range=(depuis, jusqu_a),
        ).distinct()
    total = rdv.count()
    annules = rdv.filter(statut='annule').count()
    taux = round(annules / total * 100, 1) if total else None
    return taux, annules, total


def _temps_operatoire_moyen(services_qs, depuis, jusqu_a):
    from chirurgie.models import Operation, StatutOperation
    ops = Operation.objects.filter(
        service_chirurgie__in=services_qs,
        date_heure_prevue__date__range=(depuis, jusqu_a),
        statut__in=[StatutOperation.TERMINEE, StatutOperation.COMPLICATION],
        date_debut_reelle__isnull=False, date_fin_reelle__isnull=False,
    )
    durees = [(o.date_fin_reelle - o.date_debut_reelle).total_seconds() / 60 for o in ops]
    return round(sum(durees) / len(durees)) if durees else None


def _temps_prise_en_charge_moyen(services_qs, depuis, jusqu_a):
    from urgences.models import PassageUrgence
    passages = PassageUrgence.objects.filter(
        service__in=services_qs,
        date_arrivee__date__range=(depuis, jusqu_a),
        date_prise_en_charge__isnull=False,
    )
    durees = [(p.date_prise_en_charge - p.date_arrivee).total_seconds() / 60 for p in passages]
    return round(sum(durees) / len(durees)) if durees else None


def indicateurs_qualite(services_qs, jours=30):
    """
    KPI de la période en cours + delta vs la période précédente de même
    longueur (ex : 30 derniers jours vs les 30 avant), sur les services
    visibles par l'utilisateur connecté.
    """
    now = timezone.now().date()
    depuis = now - timedelta(days=jours - 1)
    depuis_precedent = depuis - timedelta(days=jours)
    jusqua_precedent = depuis - timedelta(days=1)

    def delta(actuel, precedent):
        if actuel is None or precedent is None:
            return None
        return round(actuel - precedent, 1)

    taux_compl, nb_compl, nb_ops = _taux_complications(services_qs, depuis, now)
    taux_compl_prec, _, _ = _taux_complications(services_qs, depuis_precedent, jusqua_precedent)

    taux_read, nb_read, nb_admissions = _taux_readmission(services_qs, depuis, now)
    taux_read_prec, _, _ = _taux_readmission(services_qs, depuis_precedent, jusqua_precedent)

    taux_annul, nb_annul, nb_rdv = _taux_annulation(services_qs, depuis, now)
    taux_annul_prec, _, _ = _taux_annulation(services_qs, depuis_precedent, jusqua_precedent)

    temps_op = _temps_operatoire_moyen(services_qs, depuis, now)
    temps_op_prec = _temps_operatoire_moyen(services_qs, depuis_precedent, jusqua_precedent)

    temps_pec = _temps_prise_en_charge_moyen(services_qs, depuis, now)
    temps_pec_prec = _temps_prise_en_charge_moyen(services_qs, depuis_precedent, jusqua_precedent)

    return {
        'periode': {'depuis': depuis.isoformat(), 'jusqua': now.isoformat(), 'jours': jours},
        'taux_complications':      {'valeur': taux_compl, 'delta': delta(taux_compl, taux_compl_prec), 'nb': nb_compl, 'total': nb_ops},
        'taux_readmission':        {'valeur': taux_read, 'delta': delta(taux_read, taux_read_prec), 'nb': nb_read, 'total': nb_admissions},
        'taux_annulation':         {'valeur': taux_annul, 'delta': delta(taux_annul, taux_annul_prec), 'nb': nb_annul, 'total': nb_rdv},
        'temps_operatoire_moyen':  {'valeur': temps_op, 'delta': delta(temps_op, temps_op_prec)},
        'temps_prise_en_charge_moyen': {'valeur': temps_pec, 'delta': delta(temps_pec, temps_pec_prec)},
    }


def evolution_qualite_hebdomadaire(services_qs, nb_semaines=8):
    """Les 3 taux, semaine par semaine, pour le graphique de tendance."""
    now = timezone.now().date()
    debut_semaine_courante = now - timedelta(days=now.weekday())
    points = []
    for i in range(nb_semaines - 1, -1, -1):
        debut = debut_semaine_courante - timedelta(weeks=i)
        fin = debut + timedelta(days=6)
        taux_compl, _, _ = _taux_complications(services_qs, debut, fin)
        taux_read, _, _ = _taux_readmission(services_qs, debut, fin)
        taux_annul, _, _ = _taux_annulation(services_qs, debut, fin)
        points.append({
            'semaine': f"S{debut.isocalendar()[1]}",
            'complications': taux_compl,
            'readmission': taux_read,
            'annulation': taux_annul,
        })
    return points


def evenements_qualite_recents(services_qs, limite=15):
    """
    Table "Événements récents" : les opérations réellement terminées avec
    complication — pas d'incidents inventés (chute, erreur médicamenteuse…),
    faute d'un modèle qui les tracerait aujourd'hui.
    """
    from chirurgie.models import Operation, StatutOperation
    ops = (
        Operation.objects
        .filter(service_chirurgie__in=services_qs, statut=StatutOperation.COMPLICATION)
        .select_related('service_chirurgie', 'chirurgien_principal', 'patient')
        .order_by('-date_heure_prevue')[:limite]
    )
    return [
        {
            'date': o.date_heure_prevue.date().isoformat(),
            'intervention': o.type_intervention,
            'service': o.service_chirurgie.nom,
            'chirurgien': f"Dr {o.chirurgien_principal.prenom} {o.chirurgien_principal.nom}",
            'description': o.complications,
        }
        for o in ops
    ]