from django.test import TestCase
from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status
from datetime import date, timedelta

from .models import RendezVous
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


class RendezVousModelTest(TestCase):
    """Tests du modèle RendezVous"""

    def setUp(self):
        self.patient = Patient.objects.create(
            nom="Faye", prenom="Bineta", date_naissance=date(1992, 7, 14), sexe="F",
        )
        self.rdv = RendezVous.objects.create(
            patient=self.patient,
            date_heure=timezone.now() + timedelta(days=1),
            motif="Consultation de suivi",
        )

    def test_rdv_creation(self):
        """Vérifie qu'un rendez-vous est bien créé"""
        self.assertEqual(self.rdv.motif, "Consultation de suivi")
        self.assertEqual(self.rdv.statut, "planifie")

    def test_rdv_str(self):
        """Vérifie la représentation textuelle"""
        self.assertIn("Bineta", str(self.rdv))


class RendezVousAPITest(TestCase):
    """Tests de l'API rendez-vous"""

    def setUp(self):
        self.service = Service.objects.create(nom="Médecine générale")
        self.secretaire_user, self.secretaire = creer_employe("secretaire1", "secretaire", service=self.service)
        self.medecin_user, self.medecin = creer_employe("medecin1", "medecin", service=self.service)
        self.labo_user, self.labo = creer_employe("labo1", "laborantin")
        self.admin_user, self.admin = creer_employe("admin1", "admin", service=self.service)

        self.patient = Patient.objects.create(
            nom="Thiam", prenom="Cheikh", date_naissance=date(1983, 11, 21), sexe="M", service=self.service,
        )
        self.client = APIClient()
        self.rdv_data = {
            "patient": self.patient.id,
            "date_heure": (timezone.now() + timedelta(days=2)).isoformat(),
            "motif": "Contrôle tension",
        }

    def test_creer_rdv_secretaire(self):
        """Vérifie qu'une secrétaire peut créer un rendez-vous"""
        self.client.force_authenticate(user=self.secretaire_user)
        response = self.client.post('/api/rendez_vous/', self.rdv_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_lister_rdv_secretaire(self):
        """Vérifie qu'une secrétaire voit les RDV des patients de son service"""
        RendezVous.objects.create(patient=self.patient, date_heure=timezone.now(), motif="Test")
        self.client.force_authenticate(user=self.secretaire_user)
        response = self.client.get('/api/rendez_vous/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_lister_rdv_laborantin_refuse_lecture(self):
        """Vérifie qu'un laborantin n'a pas accès en lecture aux rendez-vous"""
        self.client.force_authenticate(user=self.labo_user)
        response = self.client.get('/api/rendez_vous/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_modifier_rdv_secretaire(self):
        """Vérifie qu'une secrétaire peut modifier (ex: confirmer) un rendez-vous"""
        rdv = RendezVous.objects.create(patient=self.patient, date_heure=timezone.now(), motif="Test")
        self.client.force_authenticate(user=self.secretaire_user)
        response = self.client.patch(f'/api/rendez_vous/{rdv.id}/', {'statut': 'confirme'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['statut'], 'confirme')

    def test_supprimer_rdv_non_admin_refuse(self):
        """Vérifie que seul un admin peut supprimer un rendez-vous"""
        rdv = RendezVous.objects.create(patient=self.patient, date_heure=timezone.now(), motif="Test")
        self.client.force_authenticate(user=self.secretaire_user)
        response = self.client.delete(f'/api/rendez_vous/{rdv.id}/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_supprimer_rdv_admin(self):
        """Vérifie qu'un admin peut supprimer un rendez-vous"""
        rdv = RendezVous.objects.create(patient=self.patient, date_heure=timezone.now(), motif="Test")
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.delete(f'/api/rendez_vous/{rdv.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_acces_sans_token(self):
        """Vérifie qu'un non-connecté est rejeté"""
        client_non_auth = APIClient()
        response = client_non_auth.get('/api/rendez_vous/')
        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])