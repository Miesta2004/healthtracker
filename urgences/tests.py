from django.test import TestCase
from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status
from datetime import date

from .models import PassageUrgence, StatutUrgence
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


class PassageUrgenceModelTest(TestCase):
    """Tests du modèle PassageUrgence"""

    def setUp(self):
        self.patient = Patient.objects.create(
            nom="Sow", prenom="Ibrahima", date_naissance=date(1980, 1, 1), sexe="M",
        )
        self.passage = PassageUrgence.objects.create(
            patient=self.patient,
            date_arrivee=timezone.now(),
            motif="Douleur thoracique",
        )

    def test_passage_creation(self):
        """Vérifie qu'un passage aux urgences est bien créé"""
        self.assertEqual(self.passage.motif, "Douleur thoracique")
        self.assertEqual(self.passage.statut, StatutUrgence.EN_ATTENTE)

    def test_passage_str(self):
        """Vérifie la représentation textuelle"""
        self.assertIn("Ibrahima", str(self.passage))

    def test_temps_attente_minutes(self):
        """Vérifie que le temps d'attente est calculé (>= 0)"""
        self.assertGreaterEqual(self.passage.temps_attente_minutes, 0)


class PassageUrgenceAPITest(TestCase):
    """Tests de l'API urgences"""

    def setUp(self):
        self.service = Service.objects.create(nom="Urgences")
        self.infirmier_user, self.infirmier = creer_employe("infirmier1", "infirmier", service=self.service)
        self.medecin_user, self.medecin = creer_employe("medecin1", "medecin", service=self.service)
        self.secretaire_user, self.secretaire = creer_employe("secretaire1", "secretaire", service=self.service)

        self.patient = Patient.objects.create(
            nom="Ba", prenom="Aminata", date_naissance=date(1975, 6, 3), sexe="F", service=self.service,
        )
        self.client = APIClient()
        self.passage_data = {
            "patient": self.patient.id,
            "date_arrivee": timezone.now().isoformat(),
            "motif": "Fièvre élevée",
        }

    def test_creer_passage_infirmier(self):
        """Vérifie qu'un infirmier peut enregistrer une arrivée aux urgences"""
        self.client.force_authenticate(user=self.infirmier_user)
        response = self.client.post('/api/urgences/', self.passage_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_creer_passage_secretaire_refuse(self):
        """Vérifie qu'une secrétaire ne peut pas créer de passage aux urgences"""
        self.client.force_authenticate(user=self.secretaire_user)
        response = self.client.post('/api/urgences/', self.passage_data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_lister_passages_secretaire_refuse_lecture(self):
        """Vérifie qu'une secrétaire n'a pas accès en lecture aux urgences"""
        self.client.force_authenticate(user=self.secretaire_user)
        response = self.client.get('/api/urgences/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_lister_passages_infirmier(self):
        """Vérifie qu'un infirmier du service Urgences voit la file d'attente"""
        PassageUrgence.objects.create(patient=self.patient, date_arrivee=timezone.now(), motif="Test")
        self.client.force_authenticate(user=self.infirmier_user)
        response = self.client.get('/api/urgences/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_action_prise_en_charge(self):
        """Vérifie que la prise en charge assigne le médecin et change le statut"""
        passage = PassageUrgence.objects.create(patient=self.patient, date_arrivee=timezone.now(), motif="Test")
        self.client.force_authenticate(user=self.medecin_user)
        response = self.client.post(f'/api/urgences/{passage.id}/prise_en_charge/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['statut'], StatutUrgence.EN_CONSULTATION)

    def test_action_sortie(self):
        """Vérifie que la sortie clôture le passage"""
        passage = PassageUrgence.objects.create(patient=self.patient, date_arrivee=timezone.now(), motif="Test")
        self.client.force_authenticate(user=self.medecin_user)
        response = self.client.post(f'/api/urgences/{passage.id}/sortie/', {'decision': 'domicile'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['statut'], StatutUrgence.SORTI)

    def test_action_admettre_cree_hospitalisation(self):
        """Vérifie que l'admission transforme le passage en hospitalisation"""
        from hospitalisations.models import Hospitalisation
        passage = PassageUrgence.objects.create(patient=self.patient, date_arrivee=timezone.now(), motif="Test")
        self.client.force_authenticate(user=self.medecin_user)
        response = self.client.post(f'/api/urgences/{passage.id}/admettre/', {'chambre': '203'})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Hospitalisation.objects.count(), 1)

    def test_acces_sans_token(self):
        """Vérifie qu'un non-connecté est rejeté"""
        client_non_auth = APIClient()
        response = client_non_auth.get('/api/urgences/')
        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])