"""
Tests d'étanchéité entre chefs de service (rôle `admin` scopé à un service).

Scénario couvert : deux comptes `admin` (chefA / chefB) dans deux services
différents (Cardiologie / Pédiatrie) ne doivent jamais pouvoir voir ou agir
sur les données de l'autre service — que ce soit les employés, les créneaux
de disponibilité, les demandes de congé, ou la création de nouveaux services
(réservée au superuser = admin général).

Lancer uniquement ces tests :
    python manage.py test comptes.tests_service_scoping
"""
from datetime import date, time, timedelta

from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from comptes.models import Employe
from disponibilites.models import CreneauDisponibilite, ExceptionDisponibilite
from services.models import Service


def creer_employe(username, role, service=None, password="testpass123"):
    """Helper — crée un User + Employe lié, avec un rôle et un service donnés."""
    user = User.objects.create_user(username=username, password=password)
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


class ChefDeServiceScopingTest(TestCase):
    def setUp(self):
        self.service_a = Service.objects.create(nom="Cardiologie")
        self.service_b = Service.objects.create(nom="Pédiatrie")

        self.admin_a_user, self.admin_a = creer_employe("chefA", "admin", service=self.service_a)
        self.admin_b_user, self.admin_b = creer_employe("chefB", "admin", service=self.service_b)

        self.emp_a_user, self.emp_a = creer_employe("infA", "infirmier", service=self.service_a)
        self.emp_b_user, self.emp_b = creer_employe("infB", "infirmier", service=self.service_b)

        self.superuser = User.objects.create_superuser(username="direction", password="testpass123")

        self.client = APIClient()

    # ── Employés ─────────────────────────────────────────────────────────
    def test_chef_peut_modifier_employe_meme_service(self):
        self.client.force_authenticate(user=self.admin_a_user)
        response = self.client.patch(f'/api/employes/{self.emp_a.id}/', {'specialite': 'Bloc'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_chef_ne_peut_pas_modifier_employe_autre_service(self):
        self.client.force_authenticate(user=self.admin_a_user)
        response = self.client.patch(f'/api/employes/{self.emp_b.id}/', {'specialite': 'Bloc'})
        self.assertIn(response.status_code, [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND])

    def test_chef_ne_peut_pas_supprimer_employe_autre_service(self):
        self.client.force_authenticate(user=self.admin_a_user)
        response = self.client.delete(f'/api/employes/{self.emp_b.id}/')
        self.assertIn(response.status_code, [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND])
        self.assertTrue(User.objects.filter(id=self.emp_b_user.id).exists())

    def test_creation_force_le_service_du_chef_meme_si_payload_different(self):
        """Un chef qui tente d'assigner un autre service à la création se fait ignorer."""
        self.client.force_authenticate(user=self.admin_a_user)
        payload = {
            "nom": "Sow", "prenom": "Awa", "date_naissance": "1992-04-12",
            "sexe": "F", "telephone": "770000000", "adresse": "Dakar",
            "username": "asow", "email": "awa@example.com", "password": "motdepasse123",
            "role": "infirmier", "service": self.service_b.id,  # tentative
        }
        response = self.client.post('/api/employes/', payload)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        nouvel_employe = Employe.objects.get(user__username="asow")
        self.assertEqual(nouvel_employe.service_id, self.service_a.id)

    def test_chef_ne_peut_pas_deplacer_employe_vers_autre_service(self):
        self.client.force_authenticate(user=self.admin_a_user)
        response = self.client.patch(f'/api/employes/{self.emp_a.id}/', {'service': self.service_b.id})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.emp_a.refresh_from_db()
        self.assertEqual(self.emp_a.service_id, self.service_a.id)  # inchangé

    def test_superuser_peut_agir_sur_nimporte_quel_service(self):
        self.client.force_authenticate(user=self.superuser)
        response = self.client.patch(f'/api/employes/{self.emp_b.id}/', {'specialite': 'Bloc'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    # ── Services ─────────────────────────────────────────────────────────
    def test_chef_ne_peut_pas_creer_un_nouveau_service(self):
        self.client.force_authenticate(user=self.admin_a_user)
        response = self.client.post('/api/services/', {'nom': 'Urgences'})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_superuser_peut_creer_un_service(self):
        self.client.force_authenticate(user=self.superuser)
        response = self.client.post('/api/services/', {'nom': 'Urgences'})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_chef_ne_voit_que_son_service_dans_la_liste(self):
        self.client.force_authenticate(user=self.admin_a_user)
        response = self.client.get('/api/services/')
        ids = [s['id'] for s in response.data]
        self.assertIn(self.service_a.id, ids)
        self.assertNotIn(self.service_b.id, ids)

    # ── Créneaux de disponibilité ───────────────────────────────────────
    def test_chef_ne_voit_que_les_creneaux_de_son_service(self):
        CreneauDisponibilite.objects.create(
            employe=self.emp_a, jour=0, heure_debut=time(8, 0), heure_fin=time(16, 0),
        )
        CreneauDisponibilite.objects.create(
            employe=self.emp_b, jour=0, heure_debut=time(8, 0), heure_fin=time(16, 0),
        )
        self.client.force_authenticate(user=self.admin_a_user)
        response = self.client.get('/api/creneaux/')
        employe_ids = {c['employe'] for c in response.data}
        self.assertEqual(employe_ids, {self.emp_a.id})

    def test_filtrer_creneaux_par_employe_autre_service_ne_renvoie_rien(self):
        CreneauDisponibilite.objects.create(
            employe=self.emp_b, jour=0, heure_debut=time(8, 0), heure_fin=time(16, 0),
        )
        self.client.force_authenticate(user=self.admin_a_user)
        response = self.client.get(f'/api/creneaux/?employe={self.emp_b.id}')
        self.assertEqual(len(response.data), 0)

    # ── Congés / exceptions ─────────────────────────────────────────────
    def test_chef_peut_valider_conge_meme_service(self):
        exception_a = ExceptionDisponibilite.objects.create(
            employe=self.emp_a, type="conge",
            date_debut=date.today(), date_fin=date.today() + timedelta(days=2),
        )
        self.client.force_authenticate(user=self.admin_a_user)
        response = self.client.post(f'/api/exceptions/{exception_a.id}/valider/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        exception_a.refresh_from_db()
        self.assertEqual(exception_a.statut, 'valide')

    def test_chef_ne_peut_pas_valider_conge_autre_service(self):
        exception_b = ExceptionDisponibilite.objects.create(
            employe=self.emp_b, type="conge",
            date_debut=date.today(), date_fin=date.today() + timedelta(days=2),
        )
        self.client.force_authenticate(user=self.admin_a_user)
        response = self.client.post(f'/api/exceptions/{exception_b.id}/valider/')
        self.assertIn(response.status_code, [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND])
        exception_b.refresh_from_db()
        self.assertEqual(exception_b.statut, 'en_attente')

    def test_chef_ne_voit_que_les_exceptions_de_son_service(self):
        ExceptionDisponibilite.objects.create(
            employe=self.emp_a, type="conge",
            date_debut=date.today(), date_fin=date.today() + timedelta(days=2),
        )
        ExceptionDisponibilite.objects.create(
            employe=self.emp_b, type="conge",
            date_debut=date.today(), date_fin=date.today() + timedelta(days=2),
        )
        self.client.force_authenticate(user=self.admin_a_user)
        response = self.client.get('/api/exceptions/')
        employe_ids = {e['employe'] for e in response.data}
        self.assertEqual(employe_ids, {self.emp_a.id})