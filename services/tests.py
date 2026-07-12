from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status
from datetime import date

from .models import Service
from comptes.models import Employe


def creer_employe(username, role, service=None):
    """Helper — crée un User + Employe lié, avec un rôle donné."""
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


class ServiceModelTest(TestCase):
    """Tests du modèle Service"""

    def setUp(self):
        self.service = Service.objects.create(
            nom="Cardiologie",
            description="Service de cardiologie",
        )

    def test_service_creation(self):
        """Vérifie qu'un service est bien créé"""
        self.assertEqual(self.service.nom, "Cardiologie")
        self.assertTrue(self.service.actif)

    def test_service_str(self):
        """Vérifie la représentation textuelle"""
        self.assertEqual(str(self.service), "Cardiologie")

    def test_service_default_actif(self):
        """Vérifie que actif = True par défaut"""
        self.assertTrue(self.service.actif)


class ServiceAPITest(TestCase):
    """Tests de l'API services"""

    def setUp(self):
        self.service = Service.objects.create(nom="Urgences")
        self.admin_user, self.admin = creer_employe("admin1", "admin", service=self.service)
        self.medecin_user, self.medecin = creer_employe("medecin1", "medecin", service=self.service)

        self.client = APIClient()
        self.service_data = {"nom": "Pédiatrie", "description": "Service pédiatrie"}

    def test_creer_service_admin(self):
        """Vérifie qu'un admin peut créer un service"""
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.post('/api/services/', self.service_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['nom'], 'Pédiatrie')

    def test_creer_service_non_admin_refuse(self):
        """Vérifie qu'un non-admin ne peut pas créer de service"""
        self.client.force_authenticate(user=self.medecin_user)
        response = self.client.post('/api/services/', self.service_data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_lister_services_scope_par_service(self):
        """Vérifie qu'un employé non-admin ne voit que son propre service"""
        Service.objects.create(nom="Autre service")
        self.client.force_authenticate(user=self.medecin_user)
        response = self.client.get('/api/services/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['id'], self.service.id)

    def test_detail_service(self):
        """Vérifie qu'on peut voir le détail d'un service"""
        self.client.force_authenticate(user=self.medecin_user)
        response = self.client.get(f'/api/services/{self.service.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['nom'], 'Urgences')

    def test_modifier_service_admin(self):
        """Vérifie qu'un admin peut modifier un service"""
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.patch(f'/api/services/{self.service.id}/', {'description': 'MAJ'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['description'], 'MAJ')

    def test_supprimer_service_admin(self):
        """Vérifie qu'un admin peut supprimer un service"""
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.delete(f'/api/services/{self.service.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Service.objects.filter(id=self.service.id).count(), 0)

    def test_action_stats(self):
        """Vérifie que l'action stats renvoie bien les KPI du service"""
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get(f'/api/services/{self.service.id}/stats/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('patients', response.data)
        self.assertIn('employes', response.data)
        self.assertIn('medecins', response.data)

    def test_action_employes(self):
        """Vérifie que l'action employes renvoie les employés actifs du service"""
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get(f'/api/services/{self.service.id}/employes/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        noms = [e['username'] for e in response.data]
        self.assertIn('medecin1', noms)

    def test_acces_sans_token(self):
        """Vérifie qu'un non-connecté est rejeté"""
        client_non_auth = APIClient()
        response = client_non_auth.get('/api/services/')
        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])