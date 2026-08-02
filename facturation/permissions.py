from rest_framework.permissions import IsAuthenticated
from comptes.capacites import Capacite
from comptes.permissions import get_employe, RequiertCapacite


class PeutGererFacturation(RequiertCapacite):
    """
    Créer/modifier une Facture, ses LigneFacture, et mettre en place un
    EcheancierPaiement — rôle 'facturier' (+ admin). AUCUN droit sur
    Paiement : voir PeutEncaisserPaiement, séparation des tâches volontaire
    (cf. comptes/capacites.py).
    """
    capacite = Capacite.FACTURATION_GERER


class PeutEncaisserPaiement(RequiertCapacite):
    """
    Créer un Paiement (+ éditer un reçu) — rôle 'caissier' (+ admin). AUCUN
    droit d'écriture sur Facture/LigneFacture/EcheancierPaiement : voir
    PeutLireFacturation ci-dessous pour la lecture, accordée séparément.
    """
    capacite = Capacite.PAIEMENTS_ENCAISSER


class PeutLireFacturation(IsAuthenticated):
    """
    Lecture d'une Facture (détail complet, lignes comprises) — accordée à
    QUICONQUE a l'une des deux capacités du module (facturier OU caissier),
    par opposition aux permissions d'écriture ci-dessus qui restent
    exclusives à une seule des deux. C'est ce qui permet à un caissier de
    voir le détail d'une facture pour l'expliquer au patient au guichet,
    sans pouvoir la modifier (cf. discussion produit : la séparation des
    tâches porte sur l'écriture, jamais sur la lecture).
    """

    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        if request.user.is_superuser:
            return True
        emp = get_employe(request.user)
        return emp is not None and (
                emp.a_la_capacite(Capacite.FACTURATION_GERER)
                or emp.a_la_capacite(Capacite.PAIEMENTS_ENCAISSER)
        )


    def has_object_permission(self, request, view, obj):
        if request.user.is_superuser:
            return True
        emp = get_employe(request.user)
        if emp is None:
            return False
        # obj peut être un Patient, une Consultation, etc. avec .service ou .patient.service
        service_id = getattr(obj, 'service_id', None)
        if service_id is None:
            patient = getattr(obj, 'patient', None)
            if patient:
                service_id = getattr(patient, 'service_id', None)
        return service_id is not None and service_id == emp.service_id