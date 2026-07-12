from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status
from datetime import date

from .models import DemandeAnalyse
from alertes.models import Alerte
from comptes.models import Employe
from patients.models import Patient
from services.models import Service


def creer_employe(username, role, service=None):
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


class DemandeAnalyseModelTest(TestCase):
    """Tests du modèle DemandeAnalyse"""

    def setUp(self):
        self.patient = Patient.objects.create(
            nom="Diallo", prenom="Kadiatou", date_naissance=date(1988, 2, 2), sexe="F",
        )
        self.demande = DemandeAnalyse.objects.create(
            patient=self.patient,
            type_analyse="nfs",
        )

    def test_demande_creation(self):
        """Vérifie qu'une demande d'analyse est bien créée"""
        self.assertEqual(self.demande.type_analyse, "nfs")
        self.assertEqual(self.demande.statut, "en_attente")

    def test_demande_str(self):
        """Vérifie la représentation textuelle"""
        self.assertIn("Kadiatou", str(self.demande))


class DemandeAnalyseAPITest(TestCase):
    """Tests de l'API analyses (laboratoire)"""

    def setUp(self):
        self.service = Service.objects.create(nom="Médecine générale")
        self.medecin_user, self.medecin = creer_employe("medecin1", "medecin", service=self.service)
        self.labo_user, self.labo = creer_employe("labo1", "laborantin")
        self.secretaire_user, self.secretaire = creer_employe("secretaire1", "secretaire")

        self.patient = Patient.objects.create(
            nom="Camara", prenom="Seydou", date_naissance=date(1979, 9, 9), sexe="M", service=self.service,
        )
        self.client = APIClient()
        self.demande_data = {"patient": self.patient.id, "type_analyse": "glycemie"}

    def test_creer_demande_medecin(self):
        """Vérifie qu'un médecin peut créer une demande d'analyse"""
        self.client.force_authenticate(user=self.medecin_user)
        response = self.client.post('/api/analyses/', self.demande_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['demandeur'], self.medecin.id)

    def test_creer_demande_secretaire_refuse(self):
        """Vérifie qu'une secrétaire ne peut pas créer de demande d'analyse"""
        self.client.force_authenticate(user=self.secretaire_user)
        response = self.client.post('/api/analyses/', self.demande_data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_lister_demandes_secretaire_vide(self):
        """Vérifie qu'une secrétaire ne voit aucune demande (accès en lecture non bloqué mais queryset vide)"""
        DemandeAnalyse.objects.create(patient=self.patient, type_analyse="nfs")
        self.client.force_authenticate(user=self.secretaire_user)
        response = self.client.get('/api/analyses/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

    def test_lister_demandes_laborantin(self):
        """Vérifie qu'un laborantin voit les demandes en attente/en cours/terminées"""
        DemandeAnalyse.objects.create(patient=self.patient, type_analyse="nfs")
        self.client.force_authenticate(user=self.labo_user)
        response = self.client.get('/api/analyses/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_action_prendre_en_charge(self):
        """Vérifie qu'un laborantin peut s'assigner une demande"""
        demande = DemandeAnalyse.objects.create(patient=self.patient, type_analyse="nfs")
        self.client.force_authenticate(user=self.labo_user)
        response = self.client.post(f'/api/analyses/{demande.id}/prendre-en-charge/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['statut'], 'en_cours')

    def test_action_prendre_en_charge_refuse_pour_non_labo(self):
        """Vérifie qu'un médecin ne peut pas prendre en charge une demande"""
        demande = DemandeAnalyse.objects.create(patient=self.patient, type_analyse="nfs")
        self.client.force_authenticate(user=self.medecin_user)
        response = self.client.post(f'/api/analyses/{demande.id}/prendre-en-charge/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_action_annuler(self):
        """Vérifie qu'un médecin peut annuler une demande"""
        demande = DemandeAnalyse.objects.create(patient=self.patient, type_analyse="nfs", demandeur=self.medecin)
        self.client.force_authenticate(user=self.medecin_user)
        response = self.client.post(f'/api/analyses/{demande.id}/annuler/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['statut'], 'annulee')

    def test_action_soumettre_resultats_cree_alerte(self):
        """Vérifie que la soumission de résultats 'terminée' génère une alerte patient"""
        demande = DemandeAnalyse.objects.create(
            patient=self.patient, type_analyse="nfs", laborantin=self.labo, statut="en_cours",
        )
        self.client.force_authenticate(user=self.labo_user)
        response = self.client.post(f'/api/analyses/{demande.id}/soumettre-resultats/', {
            'resultats': 'Hémoglobine 13g/dL',
            'statut': 'terminee',
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Alerte.objects.filter(patient=self.patient, type='resultat_analyse').count(), 1)

    def test_acces_sans_token(self):
        """Vérifie qu'un non-connecté est rejeté"""
        client_non_auth = APIClient()
        response = client_non_auth.get('/api/analyses/')
        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])