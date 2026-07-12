from django.test import TestCase
from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status
from datetime import date

from .models import Hospitalisation, StatutHospitalisation
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


class HospitalisationModelTest(TestCase):
    """Tests du modèle Hospitalisation"""

    def setUp(self):
        self.patient = Patient.objects.create(
            nom="Gueye", prenom="Modou", date_naissance=date(1970, 3, 3), sexe="M",
        )
        self.hospitalisation = Hospitalisation.objects.create(
            patient=self.patient,
            motif_admission="Chirurgie programmée",
            date_admission=timezone.now(),
        )

    def test_hospitalisation_creation(self):
        """Vérifie qu'une hospitalisation est bien créée"""
        self.assertEqual(self.hospitalisation.motif_admission, "Chirurgie programmée")
        self.assertEqual(self.hospitalisation.statut, StatutHospitalisation.EN_COURS)

    def test_hospitalisation_str(self):
        """Vérifie la représentation textuelle"""
        self.assertIn("Modou", str(self.hospitalisation))

    def test_duree_jours(self):
        """Vérifie que la durée d'hospitalisation est calculée (>= 0)"""
        self.assertGreaterEqual(self.hospitalisation.duree_jours, 0)


class HospitalisationAPITest(TestCase):
    """Tests de l'API hospitalisations"""

    def setUp(self):
        self.service = Service.objects.create(nom="Chirurgie")
        self.medecin_user, self.medecin = creer_employe("medecin1", "medecin", service=self.service)
        self.infirmier_user, self.infirmier = creer_employe("infirmier1", "infirmier", service=self.service)
        self.secretaire_user, self.secretaire = creer_employe("secretaire1", "secretaire", service=self.service)

        self.patient = Patient.objects.create(
            nom="Sarr", prenom="Ousmane", date_naissance=date(1965, 8, 8), sexe="M", service=self.service,
        )
        self.client = APIClient()
        self.hospit_data = {
            "patient": self.patient.id,
            "motif_admission": "Suivi post-opératoire",
            "date_admission": timezone.now().isoformat(),
        }

    def test_creer_hospitalisation_medecin(self):
        """Vérifie qu'un médecin peut admettre un patient"""
        self.client.force_authenticate(user=self.medecin_user)
        response = self.client.post('/api/hospitalisations/', self.hospit_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_creer_hospitalisation_infirmier_refuse(self):
        """Vérifie qu'un infirmier ne peut pas créer d'hospitalisation"""
        self.client.force_authenticate(user=self.infirmier_user)
        response = self.client.post('/api/hospitalisations/', self.hospit_data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_lister_hospitalisations_secretaire_refuse_lecture(self):
        """Vérifie qu'une secrétaire n'a pas accès en lecture aux hospitalisations"""
        self.client.force_authenticate(user=self.secretaire_user)
        response = self.client.get('/api/hospitalisations/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_lister_hospitalisations_infirmier(self):
        """Vérifie qu'un infirmier du service voit les hospitalisations en cours"""
        Hospitalisation.objects.create(
            patient=self.patient, service=self.service,
            motif_admission="Test", date_admission=timezone.now(),
        )
        self.client.force_authenticate(user=self.infirmier_user)
        response = self.client.get('/api/hospitalisations/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_action_sortie(self):
        """Vérifie que l'enregistrement de sortie clôture l'hospitalisation"""
        hospit = Hospitalisation.objects.create(
            patient=self.patient, service=self.service,
            motif_admission="Test", date_admission=timezone.now(),
        )
        self.client.force_authenticate(user=self.medecin_user)
        response = self.client.post(f'/api/hospitalisations/{hospit.id}/sortie/', {
            'diagnostic_sortie': 'Rétablissement complet',
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['statut'], StatutHospitalisation.TERMINEE)

    def test_action_sortie_infirmier_refuse(self):
        """Vérifie qu'un infirmier ne peut pas enregistrer une sortie"""
        hospit = Hospitalisation.objects.create(
            patient=self.patient, service=self.service,
            motif_admission="Test", date_admission=timezone.now(),
        )
        self.client.force_authenticate(user=self.infirmier_user)
        response = self.client.post(f'/api/hospitalisations/{hospit.id}/sortie/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_acces_sans_token(self):
        """Vérifie qu'un non-connecté est rejeté"""
        client_non_auth = APIClient()
        response = client_non_auth.get('/api/hospitalisations/')
        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])