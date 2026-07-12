from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status
from datetime import date

from .models import Employe


def creer_employe(username, role, password="testpass123"):
    """Helper — crée un User + Employe lié, avec un rôle donné."""
    user = User.objects.create_user(username=username, password=password)
    employe = Employe.objects.create(
        user=user,
        nom="Test",
        prenom=username.capitalize(),
        date_naissance=date(1990, 1, 1),
        sexe="F",
        role=role,
    )
    return user, employe


class EmployeModelTest(TestCase):
    """Tests du modèle Employe"""

    def setUp(self):
        self.user = User.objects.create_user(username="jdupont", password="testpass123")
        self.employe = Employe.objects.create(
            user=self.user,
            nom="Dupont",
            prenom="Jean",
            date_naissance=date(1985, 5, 20),
            sexe="M",
            role="medecin",
        )

    def test_employe_creation(self):
        """Vérifie qu'un employé est bien créé"""
        self.assertEqual(self.employe.nom, "Dupont")
        self.assertEqual(self.employe.role, "medecin")

    def test_employe_str(self):
        """Vérifie la représentation textuelle"""
        self.assertEqual(str(self.employe), "Jean Dupont — Médecin")

    def test_employe_matricule_auto(self):
        """Vérifie que le matricule est généré automatiquement"""
        self.assertTrue(self.employe.matricule.startswith("E"))

    def test_employe_default_actif(self):
        """Vérifie que actif = True par défaut"""
        self.assertTrue(self.employe.actif)


class EmployeAPITest(TestCase):
    """Tests de l'API employés"""

    def setUp(self):
        self.admin_user, self.admin = creer_employe("admin1", "admin")
        self.infirmier_user, self.infirmier = creer_employe("infirmier1", "infirmier", password="ancienMdp123")

        self.client = APIClient()
        self.employe_data = {
            "nom": "Ndiaye",
            "prenom": "Awa",
            "date_naissance": "1992-04-12",
            "sexe": "F",
            "telephone": "770000000",
            "adresse": "Dakar",
            "username": "andiaye",
            "email": "awa@example.com",
            "password": "motdepasse123",
            "role": "infirmier",
        }

    def test_creer_employe_admin(self):
        """Vérifie qu'un admin peut créer un employé (+ le compte user associé)"""
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.post('/api/employes/', self.employe_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['nom'], 'Ndiaye')
        self.assertTrue(User.objects.filter(username='andiaye').exists())

    def test_creer_employe_non_admin_refuse(self):
        """Vérifie qu'un non-admin ne peut pas créer d'employé"""
        self.client.force_authenticate(user=self.infirmier_user)
        response = self.client.post('/api/employes/', self.employe_data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_creer_employe_username_deja_pris(self):
        """Vérifie qu'on ne peut pas créer 2 comptes avec le même username"""
        self.client.force_authenticate(user=self.admin_user)
        data = {**self.employe_data, "username": "admin1"}
        response = self.client.post('/api/employes/', data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_lister_employes(self):
        """Vérifie qu'on peut lister les employés"""
        self.client.force_authenticate(user=self.infirmier_user)
        response = self.client.get('/api/employes/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data), 2)

    def test_detail_employe(self):
        """Vérifie qu'on peut voir le détail d'un employé"""
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get(f'/api/employes/{self.infirmier.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['role'], 'infirmier')

    def test_modifier_employe_admin(self):
        """Vérifie qu'un admin peut modifier un employé"""
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.patch(f'/api/employes/{self.infirmier.id}/', {'specialite': 'Bloc opératoire'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['specialite'], 'Bloc opératoire')

    def test_supprimer_employe_admin(self):
        """Vérifie qu'un admin peut supprimer un employé (+ son compte user)"""
        self.client.force_authenticate(user=self.admin_user)
        user_id = self.infirmier_user.id
        response = self.client.delete(f'/api/employes/{self.infirmier.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(User.objects.filter(id=user_id).exists())

    def test_action_me(self):
        """Vérifie que /employes/me/ renvoie le profil de l'utilisateur connecté"""
        self.client.force_authenticate(user=self.infirmier_user)
        response = self.client.get('/api/employes/me/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['role'], 'infirmier')

    def test_action_change_password_succes(self):
        """Vérifie qu'un employé peut changer son mot de passe"""
        self.client.force_authenticate(user=self.infirmier_user)
        response = self.client.post('/api/employes/change_password/', {
            'ancien_mot_de_passe': 'ancienMdp123',
            'nouveau_mot_de_passe': 'nouveauMdp456',
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_action_change_password_ancien_incorrect(self):
        """Vérifie qu'un mauvais ancien mot de passe est rejeté"""
        self.client.force_authenticate(user=self.infirmier_user)
        response = self.client.post('/api/employes/change_password/', {
            'ancien_mot_de_passe': 'mauvais',
            'nouveau_mot_de_passe': 'nouveauMdp456',
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_action_update_profil(self):
        """Vérifie qu'un employé peut mettre à jour ses propres infos"""
        self.client.force_authenticate(user=self.infirmier_user)
        response = self.client.patch('/api/employes/update_profil/', {'telephone': '779999999'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['telephone'], '779999999')

    def test_acces_sans_token(self):
        """Vérifie qu'un non-connecté est rejeté"""
        client_non_auth = APIClient()
        response = client_non_auth.get('/api/employes/')
        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])