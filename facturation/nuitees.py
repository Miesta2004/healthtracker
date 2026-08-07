"""
Génération automatique des lignes de facturation "nuitée" pour les patients
hospitalisés — remplace la saisie manuelle quotidienne du facturier.

Convention hôtelière standard (déjà utilisée par Hospitalisation.duree_jours) :
le jour d'admission compte comme une nuit facturable, le jour de sortie non
(le patient est facturé pour les nuits passées, pas les journées calendaires).

Idempotent : n'ajoute jamais deux fois la même nuit pour la même
hospitalisation (vérifié par date_acte), et ne modifie/supprime jamais une
ligne déjà créée même si le tarif de nuitée a changé depuis — même principe
de "photo au moment de la création" que pour TarifActe en général (voir
LigneFacture.save()).

Ne fabrique JAMAIS un prix : si aucun TarifActe de type 'hospitalisation'
n'existe (pour le service concerné ou en générique), la nuit est signalée en
avertissement et laissée à ajouter manuellement plutôt que facturée à un
montant inventé.
"""

import datetime as dt

from django.utils import timezone

from .models import Facture, LigneFacture, TarifActe, TypeActe, StatutFacture


def _tarif_nuitee(hospitalisation):
    """
    Tarif spécifique au service de l'hospitalisation en priorité, sinon un
    tarif générique (service=None). None si aucun des deux n'existe.
    """
    return (
            TarifActe.objects.filter(
                type_acte=TypeActe.HOSPITALISATION, service=hospitalisation.service, actif=True,
            ).first()
            or TarifActe.objects.filter(
        type_acte=TypeActe.HOSPITALISATION, service__isnull=True, actif=True,
    ).first()
    )


def _debut_de_journee(date_civile: dt.date) -> dt.datetime:
    moment = dt.datetime.combine(date_civile, dt.time.min)
    return timezone.make_aware(moment) if timezone.is_naive(moment) else moment


def generer_nuitees_manquantes(date_reference=None, facture_id=None) -> dict:
    """
    Ajoute une LigneFacture pour chaque nuit déjà passée et pas encore
    facturée, sur toutes les Facture 'ouverte' liées à une Hospitalisation
    'en_cours' — ou une seule si facture_id est fourni (déclenchement manuel
    depuis l'UI, cf. FactureViewSet.actualiser_nuitees).

    Retourne {'ajoutees': int, 'avertissements': [str, ...]}.
    """
    reference = date_reference or timezone.now()

    factures = Facture.objects.filter(
        statut=StatutFacture.OUVERTE,
        hospitalisation__statut='en_cours',
    ).select_related('hospitalisation', 'hospitalisation__service')
    if facture_id is not None:
        factures = factures.filter(id=facture_id)

    ajoutees = 0
    avertissements = []

    for facture in factures:
        hosp = facture.hospitalisation
        if hosp is None:
            continue

        nb_nuits = (reference.date() - hosp.date_admission.date()).days
        if nb_nuits <= 0:
            continue  # admis aujourd'hui même — aucune nuit encore passée

        dates_existantes = {
            date_acte.date() for date_acte in
            facture.lignes.filter(hospitalisation=hosp, type_acte=TypeActe.HOSPITALISATION)
            .values_list('date_acte', flat=True)
        }

        tarif = _tarif_nuitee(hosp)

        for i in range(nb_nuits):
            date_nuit = hosp.date_admission.date() + dt.timedelta(days=i)
            if date_nuit in dates_existantes:
                continue

            if tarif is None:
                nom_service = hosp.service.nom if hosp.service else '—'
                avertissements.append(
                    f"Aucun tarif de nuitée configuré pour le service « {nom_service} » "
                    f"— facture {facture.numero_facture} incomplète à partir du {date_nuit.strftime('%d/%m/%Y')}."
                )
                break  # inutile de retenter les nuits suivantes de cette facture, même souci

            description = f"Nuitée du {date_nuit.strftime('%d/%m/%Y')}"
            if hosp.chambre:
                description += f" — chambre {hosp.chambre}"

            LigneFacture.objects.create(
                facture=facture, tarif_acte=tarif, hospitalisation=hosp,
                description=description, quantite=1, date_acte=_debut_de_journee(date_nuit),
            )
            ajoutees += 1

    return {'ajoutees': ajoutees, 'avertissements': avertissements}