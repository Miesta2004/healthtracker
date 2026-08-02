from datetime import date, timedelta
from decimal import Decimal

from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from comptes.models import Employe
from patients.models import Patient
from services.models import Service

from .models import (
    Facture, LigneFacture, Paiement, EcheancierPaiement, Echeance,
    StatutFacture, StatutEcheance, TypeActe, ModePaiement, PeriodiciteEcheance,
)


def creer_employe(username, role, service=None):
    """Même helper que hospitalisations/tests.py, pour rester cohérent."""
    user = User.objects.create_user(username=username, password="testpass123")
    employe = Employe.objects.create(
        user=user,
        nom="Test",
        prenom=username.capitalize(),
        date_naissance=date(1990, 1, 1),
        sexe="F",
        role=role,
        service=service,
    )
    return user, employe


def creer_patient(service=None, mutuelle="", numero_mutuelle=""):
    return Patient.objects.create(
        nom="Diop", prenom="Awa", date_naissance=date(1985, 5, 5), sexe="F",
        service=service, mutuelle=mutuelle, numero_mutuelle=numero_mutuelle,
    )


# ─── Tests modèles ───────────────────────────────────────────────────────────

class FactureModelTest(TestCase):
    def setUp(self):
        self.service = Service.objects.create(nom="Cardiologie")
        self.patient = creer_patient(service=self.service, mutuelle="IPM Sénégal", numero_mutuelle="IPM-001")
        self.facture = Facture.objects.create(patient=self.patient, service=self.service)

    def test_numero_facture_auto_genere_et_unique(self):
        self.assertTrue(self.facture.numero_facture.startswith("FAC"))
        autre = Facture.objects.create(patient=self.patient, service=self.service)
        self.assertNotEqual(self.facture.numero_facture, autre.numero_facture)

    def test_mutuelle_reprise_du_patient_a_la_creation(self):
        self.assertEqual(self.facture.mutuelle_nom, "IPM Sénégal")
        self.assertEqual(self.facture.numero_mutuelle, "IPM-001")

    def test_mutuelle_facture_ne_suit_pas_un_changement_ulterieur_du_patient(self):
        """La facture ne doit PAS être réécrite si le patient change de mutuelle après coup."""
        self.patient.mutuelle = "Nouvelle Mutuelle"
        self.patient.save()
        self.facture.refresh_from_db()
        self.assertEqual(self.facture.mutuelle_nom, "IPM Sénégal")

    def test_statut_par_defaut_brouillon(self):
        self.assertEqual(self.facture.statut, StatutFacture.BROUILLON)

    def test_str(self):
        self.assertIn(self.facture.numero_facture, str(self.facture))


class LigneFactureVentilationTest(TestCase):
    """Le cœur métier : calcul du montant et de la ventilation assurance PAR LIGNE."""

    def setUp(self):
        self.patient = creer_patient()
        self.facture = Facture.objects.create(
            patient=self.patient, part_assurance_pourcentage_defaut=Decimal("80.00"),
        )

    def _ligne(self, **kwargs):
        defaults = dict(
            facture=self.facture, type_acte=TypeActe.CONSULTATION,
            description="Consultation", quantite=1, prix_unitaire=Decimal("10000"),
            date_acte=timezone.now(),
        )
        defaults.update(kwargs)
        return LigneFacture.objects.create(**defaults)

    def test_montant_ligne_quantite_fois_prix(self):
        ligne = self._ligne(quantite=3, prix_unitaire=Decimal("5000"))
        self.assertEqual(ligne.montant_ligne, Decimal("15000.00"))

    def test_ventilation_herite_du_taux_par_defaut_de_la_facture(self):
        ligne = self._ligne(prix_unitaire=Decimal("10000"))  # pas de taux propre -> hérite 80%
        self.assertEqual(ligne.montant_part_assurance_ligne, Decimal("8000.00"))
        self.assertEqual(ligne.montant_part_patient_ligne, Decimal("2000.00"))

    def test_ventilation_taux_propre_a_la_ligne_prime_sur_le_defaut(self):
        """ex: 80% consultation mais 50% pharmacie — le taux varie PAR LIGNE."""
        ligne = self._ligne(
            type_acte=TypeActe.MEDICAMENT, prix_unitaire=Decimal("10000"),
            taux_prise_en_charge_assurance=Decimal("50.00"),
        )
        self.assertEqual(ligne.montant_part_assurance_ligne, Decimal("5000.00"))
        self.assertEqual(ligne.montant_part_patient_ligne, Decimal("5000.00"))

    def test_taux_zero_explicite_differe_de_taux_non_renseigne(self):
        """taux=0 (acte explicitement non couvert) doit rester à 0, pas hériter du défaut."""
        ligne = self._ligne(prix_unitaire=Decimal("10000"), taux_prise_en_charge_assurance=Decimal("0"))
        self.assertEqual(ligne.montant_part_assurance_ligne, Decimal("0.00"))
        self.assertEqual(ligne.montant_part_patient_ligne, Decimal("10000.00"))

    def test_facture_recalcule_a_chaque_ajout_de_ligne(self):
        self._ligne(prix_unitaire=Decimal("10000"))
        self._ligne(prix_unitaire=Decimal("20000"), taux_prise_en_charge_assurance=Decimal("50.00"))
        self.facture.refresh_from_db()

        self.assertEqual(self.facture.montant_total, Decimal("30000.00"))
        # Ligne 1 : 80% de 10000 = 8000 ; Ligne 2 : 50% de 20000 = 10000
        self.assertEqual(self.facture.montant_part_assurance, Decimal("18000.00"))
        # Ligne 1 : 2000 ; Ligne 2 : 10000
        self.assertEqual(self.facture.montant_part_patient, Decimal("12000.00"))

    def test_facture_recalcule_a_la_suppression_d_une_ligne(self):
        ligne1 = self._ligne(prix_unitaire=Decimal("10000"))
        self._ligne(prix_unitaire=Decimal("20000"))
        ligne1.delete()
        self.facture.refresh_from_db()
        self.assertEqual(self.facture.montant_total, Decimal("20000.00"))


class FacturePaiementTest(TestCase):
    """Encaissement, montant_restant, et transitions de statut dérivées."""

    def setUp(self):
        self.patient = creer_patient()
        self.facture = Facture.objects.create(patient=self.patient, statut=StatutFacture.EN_ATTENTE)
        LigneFacture.objects.create(
            facture=self.facture, type_acte=TypeActe.CONSULTATION, description="Consultation",
            quantite=1, prix_unitaire=Decimal("10000"), date_acte=timezone.now(),
        )
        # part_assurance_pourcentage_defaut = 0 -> toute la ligne est part patient (10000)

    def test_paiement_partiel_statut_payee_partiellement(self):
        Paiement.objects.create(facture=self.facture, montant=Decimal("4000"), mode_paiement=ModePaiement.ESPECES)
        self.facture.refresh_from_db()
        self.assertEqual(self.facture.montant_paye, Decimal("4000.00"))
        self.assertEqual(self.facture.montant_restant, Decimal("6000.00"))
        self.assertEqual(self.facture.statut, StatutFacture.PAYEE_PARTIELLEMENT)

    def test_paiement_complet_statut_payee(self):
        Paiement.objects.create(facture=self.facture, montant=Decimal("10000"), mode_paiement=ModePaiement.ESPECES)
        self.facture.refresh_from_db()
        self.assertEqual(self.facture.montant_restant, Decimal("0.00"))
        self.assertEqual(self.facture.statut, StatutFacture.PAYEE)

    def test_deux_paiements_partiels_cumulent(self):
        Paiement.objects.create(facture=self.facture, montant=Decimal("3000"), mode_paiement=ModePaiement.ESPECES)
        Paiement.objects.create(facture=self.facture, montant=Decimal("7000"), mode_paiement=ModePaiement.MOBILE_MONEY,
                                operateur_mobile_money="wave")
        self.facture.refresh_from_db()
        self.assertEqual(self.facture.montant_paye, Decimal("10000.00"))
        self.assertEqual(self.facture.statut, StatutFacture.PAYEE)

    def test_statut_ouverte_jamais_ecrase_par_un_paiement(self):
        """Une facture 'ouverte' (séjour en cours) ne doit pas basculer payee/en_attente toute seule."""
        self.facture.statut = StatutFacture.OUVERTE
        self.facture.save(update_fields=['statut'])
        Paiement.objects.create(facture=self.facture, montant=Decimal("10000"), mode_paiement=ModePaiement.ESPECES)
        self.facture.refresh_from_db()
        self.assertEqual(self.facture.statut, StatutFacture.OUVERTE)

    def test_suppression_paiement_recalcule_le_restant(self):
        p = Paiement.objects.create(facture=self.facture, montant=Decimal("10000"), mode_paiement=ModePaiement.ESPECES)
        p.delete()
        self.facture.refresh_from_db()
        self.assertEqual(self.facture.montant_restant, Decimal("10000.00"))
        self.assertEqual(self.facture.statut, StatutFacture.EN_ATTENTE)


class EcheancierPaiementTest(TestCase):
    """Paiement fractionné — jamais sur la part assurance."""

    def setUp(self):
        self.patient = creer_patient()
        self.facture = Facture.objects.create(patient=self.patient, statut=StatutFacture.EN_ATTENTE)
        LigneFacture.objects.create(
            facture=self.facture, type_acte=TypeActe.HOSPITALISATION, description="Nuitées",
            quantite=1, prix_unitaire=Decimal("100000"), date_acte=timezone.now(),
        )
        self.facture.refresh_from_db()  # montant_part_patient = 100000 (taux défaut 0)

    def test_montant_superieur_a_la_part_patient_rejete(self):
        echeancier = EcheancierPaiement(
            facture=self.facture, montant_total_echeancier=Decimal("150000"),
            nombre_echeances=3, periodicite=PeriodiciteEcheance.MENSUELLE,
            date_premiere_echeance=date.today(),
        )
        with self.assertRaises(Exception):
            echeancier.full_clean()

    def test_generer_echeances_repartit_le_montant(self):
        echeancier = EcheancierPaiement.objects.create(
            facture=self.facture, montant_total_echeancier=Decimal("100000"),
            nombre_echeances=3, periodicite=PeriodiciteEcheance.MENSUELLE,
            date_premiere_echeance=date(2026, 1, 31),
        )
        echeancier.generer_echeances()
        echeances = list(echeancier.echeances.order_by('numero_echeance'))

        self.assertEqual(len(echeances), 3)
        # 100000 / 3 = 33333.33 -> la dernière absorbe l'écart d'arrondi
        self.assertEqual(echeances[0].montant_prevu, Decimal("33333.33"))
        self.assertEqual(echeances[1].montant_prevu, Decimal("33333.33"))
        self.assertEqual(echeances[2].montant_prevu, Decimal("33333.34"))
        total = sum((e.montant_prevu for e in echeances), Decimal("0"))
        self.assertEqual(total, Decimal("100000.00"))

    def test_generer_echeances_mensuelle_gere_le_debordement_de_jour(self):
        """31 janvier + 1 mois -> 28/29 février, pas une exception."""
        echeancier = EcheancierPaiement.objects.create(
            facture=self.facture, montant_total_echeancier=Decimal("100000"),
            nombre_echeances=2, periodicite=PeriodiciteEcheance.MENSUELLE,
            date_premiere_echeance=date(2026, 1, 31),
        )
        echeancier.generer_echeances()
        echeances = list(echeancier.echeances.order_by('numero_echeance'))
        self.assertEqual(echeances[0].date_echeance, date(2026, 1, 31))
        self.assertEqual(echeances[1].date_echeance, date(2026, 2, 28))  # 2026 n'est pas bissextile

    def test_generer_echeances_hebdomadaire(self):
        echeancier = EcheancierPaiement.objects.create(
            facture=self.facture, montant_total_echeancier=Decimal("30000"),
            nombre_echeances=3, periodicite=PeriodiciteEcheance.HEBDOMADAIRE,
            date_premiere_echeance=date(2026, 3, 2),
        )
        echeancier.generer_echeances()
        dates = [e.date_echeance for e in echeancier.echeances.order_by('numero_echeance')]
        self.assertEqual(dates, [date(2026, 3, 2), date(2026, 3, 9), date(2026, 3, 16)])

    def test_paiement_sur_echeance_la_marque_payee(self):
        echeancier = EcheancierPaiement.objects.create(
            facture=self.facture, montant_total_echeancier=Decimal("100000"),
            nombre_echeances=2, periodicite=PeriodiciteEcheance.MENSUELLE,
            date_premiere_echeance=date.today(),
        )
        echeancier.generer_echeances()
        echeance1 = echeancier.echeances.get(numero_echeance=1)

        Paiement.objects.create(
            facture=self.facture, echeance=echeance1,
            montant=echeance1.montant_prevu, mode_paiement=ModePaiement.ESPECES,
        )
        echeance1.refresh_from_db()
        self.assertEqual(echeance1.statut, StatutEcheance.PAYEE)

    def test_toutes_echeances_payees_solde_l_echeancier(self):
        echeancier = EcheancierPaiement.objects.create(
            facture=self.facture, montant_total_echeancier=Decimal("100000"),
            nombre_echeances=2, periodicite=PeriodiciteEcheance.MENSUELLE,
            date_premiere_echeance=date.today(),
        )
        echeancier.generer_echeances()
        for echeance in echeancier.echeances.all():
            Paiement.objects.create(
                facture=self.facture, echeance=echeance,
                montant=echeance.montant_prevu, mode_paiement=ModePaiement.ESPECES,
            )
        echeancier.refresh_from_db()
        self.assertEqual(echeancier.statut, 'solde')

    def test_echeance_en_retard_si_date_depassee_et_impayee(self):
        echeancier = EcheancierPaiement.objects.create(
            facture=self.facture, montant_total_echeancier=Decimal("50000"),
            nombre_echeances=1, periodicite=PeriodiciteEcheance.MENSUELLE,
            date_premiere_echeance=date.today() - timedelta(days=5),
        )
        echeancier.generer_echeances()
        echeance = echeancier.echeances.first()
        echeance.recalculer_statut()
        self.assertEqual(echeance.statut, StatutEcheance.EN_RETARD)

    def test_statut_impayee_jamais_pose_automatiquement(self):
        """recalculer_statut() ne doit jamais mettre 'impayee' tout seul, même très en retard."""
        echeancier = EcheancierPaiement.objects.create(
            facture=self.facture, montant_total_echeancier=Decimal("50000"),
            nombre_echeances=1, periodicite=PeriodiciteEcheance.MENSUELLE,
            date_premiere_echeance=date.today() - timedelta(days=200),
        )
        echeancier.generer_echeances()
        echeance = echeancier.echeances.first()
        echeance.recalculer_statut()
        self.assertNotEqual(echeance.statut, StatutEcheance.IMPAYEE)


# ─── Tests API / permissions ────────────────────────────────────────────────

class FacturationPermissionsAPITest(TestCase):
    """
    Vérifie la séparation des tâches facturier / caissier : chacun ne peut
    écrire que dans son périmètre, mais les deux peuvent lire en entier.
    """

    def setUp(self):
        self.service_a = Service.objects.create(nom="Cardiologie")
        self.service_b = Service.objects.create(nom="Pédiatrie")

        self.facturier_user, self.facturier = creer_employe("facturier1", "facturier", service=self.service_a)
        self.caissier_user, self.caissier = creer_employe("caissier1", "caissier", service=self.service_a)
        self.secretaire_user, self.secretaire = creer_employe("secretaire1", "secretaire", service=self.service_a)
        self.admin_user, self.admin = creer_employe("admin1", "admin", service=self.service_a)

        self.patient = creer_patient(service=self.service_a)
        self.facture = Facture.objects.create(patient=self.patient, service=self.service_a, statut=StatutFacture.EN_ATTENTE)
        LigneFacture.objects.create(
            facture=self.facture, type_acte=TypeActe.CONSULTATION, description="Consultation",
            quantite=1, prix_unitaire=Decimal("10000"), date_acte=timezone.now(),
        )

        self.client = APIClient()

    # --- Écriture Facture / Lignes : réservée au facturier ---

    def test_facturier_peut_creer_une_facture(self):
        self.client.force_authenticate(user=self.facturier_user)
        response = self.client.post('/api/factures/', {'patient': self.patient.id})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_caissier_ne_peut_pas_creer_une_facture(self):
        self.client.force_authenticate(user=self.caissier_user)
        response = self.client.post('/api/factures/', {'patient': self.patient.id})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_secretaire_refuse_lecture_facture(self):
        self.client.force_authenticate(user=self.secretaire_user)
        response = self.client.get(f'/api/factures/{self.facture.id}/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_caissier_ne_peut_pas_ajouter_une_ligne(self):
        self.client.force_authenticate(user=self.caissier_user)
        response = self.client.post(
            f'/api/factures/{self.facture.id}/ajouter-ligne/',
            {
                'type_acte': TypeActe.EXAMEN_LABORATOIRE, 'description': 'NFS',
                'quantite': 1, 'prix_unitaire': '5000', 'date_acte': timezone.now().isoformat(),
            },
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    # --- Lecture : accordée aux deux rôles ---

    def test_facturier_peut_lire_le_detail_complet(self):
        self.client.force_authenticate(user=self.facturier_user)
        response = self.client.get(f'/api/factures/{self.facture.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('lignes', response.data)

    def test_caissier_peut_lire_le_detail_complet(self):
        """Le caissier voit tout le détail (pour l'expliquer au patient), même sans droit d'écriture."""
        self.client.force_authenticate(user=self.caissier_user)
        response = self.client.get(f'/api/factures/{self.facture.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['lignes']), 1)

    # --- Écriture Paiement : réservée au caissier ---

    def test_caissier_peut_encaisser(self):
        self.client.force_authenticate(user=self.caissier_user)
        response = self.client.post('/api/paiements/', {
            'facture': self.facture.id, 'montant': '5000', 'mode_paiement': ModePaiement.ESPECES,
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_facturier_ne_peut_pas_encaisser(self):
        self.client.force_authenticate(user=self.facturier_user)
        response = self.client.post('/api/paiements/', {
            'facture': self.facture.id, 'montant': '5000', 'mode_paiement': ModePaiement.ESPECES,
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_paiement_non_modifiable_meme_par_admin_via_patch_standard(self):
        """Un paiement se corrige par suppression, jamais par édition — seul destroy est ouvert à l'admin."""
        paiement = Paiement.objects.create(facture=self.facture, montant=Decimal("5000"), mode_paiement=ModePaiement.ESPECES)
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.patch(f'/api/paiements/{paiement.id}/', {'montant': '9999'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)  # admin autorisé...
        # ... mais un caissier, lui, ne peut pas :
        self.client.force_authenticate(user=self.caissier_user)
        response = self.client.patch(f'/api/paiements/{paiement.id}/', {'montant': '1'})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    # --- Scoping par service (facturier uniquement — la caisse est centralisée) ---

    def test_facturier_ne_voit_pas_les_factures_d_un_autre_service(self):
        patient_b = creer_patient(service=self.service_b)
        Facture.objects.create(patient=patient_b, service=self.service_b)

        self.client.force_authenticate(user=self.facturier_user)
        response = self.client.get('/api/factures/')
        numeros = [f['id'] for f in response.data]
        self.assertNotIn(
            Facture.objects.filter(service=self.service_b).first().id, numeros,
        )

    def test_caissier_voit_les_factures_de_tous_les_services(self):
        """La caisse est centralisée : pas de restriction par service."""
        patient_b = creer_patient(service=self.service_b)
        facture_b = Facture.objects.create(patient=patient_b, service=self.service_b)

        self.client.force_authenticate(user=self.caissier_user)
        response = self.client.get('/api/factures/')
        ids = [f['id'] for f in response.data]
        self.assertIn(facture_b.id, ids)

    # --- Verrouillage des lignes une fois la facture non modifiable ---

    def test_impossible_d_ajouter_une_ligne_a_une_facture_payee(self):
        self.facture.statut = StatutFacture.PAYEE
        self.facture.save(update_fields=['statut'])

        self.client.force_authenticate(user=self.facturier_user)
        response = self.client.post(
            f'/api/factures/{self.facture.id}/ajouter-ligne/',
            {
                'type_acte': TypeActe.MEDICAMENT, 'description': 'Paracétamol',
                'quantite': 1, 'prix_unitaire': '1000', 'date_acte': timezone.now().isoformat(),
            },
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_annulation_impossible_si_deja_paiement(self):
        Paiement.objects.create(facture=self.facture, montant=Decimal("5000"), mode_paiement=ModePaiement.ESPECES)
        self.client.force_authenticate(user=self.facturier_user)
        response = self.client.post(f'/api/factures/{self.facture.id}/annuler/')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_echeancier_rejete_si_montant_depasse_part_patient(self):
        self.client.force_authenticate(user=self.facturier_user)
        response = self.client.post(f'/api/factures/{self.facture.id}/echeancier/', {
            'montant_total_echeancier': '999999', 'nombre_echeances': 3,
            'periodicite': PeriodiciteEcheance.MENSUELLE, 'date_premiere_echeance': str(date.today()),
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_caissier_ne_peut_pas_marquer_une_echeance_impayee(self):
        """L'escalade manuelle vers 'impayee' relève de la gestion de facturation, pas de la caisse."""
        echeancier = EcheancierPaiement.objects.create(
            facture=self.facture, montant_total_echeancier=Decimal("10000"),
            nombre_echeances=1, periodicite=PeriodiciteEcheance.MENSUELLE,
            date_premiere_echeance=date.today() - timedelta(days=10),
        )
        echeancier.generer_echeances()
        echeance = echeancier.echeances.first()

        self.client.force_authenticate(user=self.caissier_user)
        response = self.client.post(f'/api/echeances/{echeance.id}/marquer-impayee/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)