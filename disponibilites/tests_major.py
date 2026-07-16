"""
Tests pour le statut "infirmière major" (Employe.est_major) :
- peut assigner des patients aux infirmiers de son service (comme le chef de service)
- peut valider/rejeter les congés des infirmiers de son service
- ne peut PAS toucher aux médecins/secrétaires/laborantins, même de son service
- reste cantonnée à son service

Lancer uniquement ces tests :
    python manage.py test disponibilites.tests_major
"""
from datetime import date, timedelta

from django.contrib.auth.models import User
from django.db import IntegrityError, transaction
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from comptes.models import Employe
from disponibilites.models import AssignationPatient, ExceptionDisponibilite
from patients.models import Patient
from services.models import Service


def creer_employe(username, role, service=None, est_major=False, password="testpass123"):
    user = User.objects.create_user(username=username, password=password)
    employe = Employe.objects.create(
        user=user, nom="Test", prenom=username.capitalize(),
        date_naissance=date(1990, 1, 1), sexe="F", role=role, service=service,
        est_major=est_major,
    )
    return user, employe


class InfirmiereMajorTest(TestCase):
    def setUp(self):
        self.service_a = Service.objects.create(nom="Cardiologie")
        self.service_b = Service.objects.create(nom="Pédiatrie")

        self.major_user, self.major = creer_employe("majorA", "infirmier", service=self.service_a, est_major=True)
        self.inf_a_user, self.inf_a = creer_employe("infA", "infirmier", service=self.service_a)
        self.inf_b_user, self.inf_b = creer_employe("infB", "infirmier", service=self.service_b)
        self.medecin_a_user, self.medecin_a = creer_employe("medA", "medecin", service=self.service_a)

        self.patient_a = Patient.objects.create(
            nom="Ndiaye", prenom="Fatou", date_naissance=date(1968, 3, 1),
            sexe="F", adresse="Dakar", service=self.service_a,
        )

        self.client = APIClient()

    def test_est_major_impossible_sur_non_infirmier(self):
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                Employe.objects.create(
                    user=User.objects.create_user(username="x"), nom="X", prenom="X",
                    date_naissance=date(1990, 1, 1), sexe="F", role="medecin",
                    service=self.service_a, est_major=True,
                )

    def test_major_peut_assigner_infirmier_de_son_service(self):
        self.client.force_authenticate(user=self.major_user)
        response = self.client.post('/api/assignations/', {
            'infirmier': self.inf_a.id, 'patient': self.patient_a.id,
            'date': '2026-07-14', 'shift': 'matin',
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_major_ne_peut_pas_assigner_infirmier_autre_service(self):
        self.client.force_authenticate(user=self.major_user)
        response = self.client.post('/api/assignations/', {
            'infirmier': self.inf_b.id, 'patient': self.patient_a.id,
            'date': '2026-07-14', 'shift': 'matin',
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_major_peut_valider_conge_dun_infirmier_meme_service(self):
        exception_inf = ExceptionDisponibilite.objects.create(
            employe=self.inf_a, type="conge",
            date_debut=date.today(), date_fin=date.today() + timedelta(days=2),
        )
        self.client.force_authenticate(user=self.major_user)
        response = self.client.post(f'/api/exceptions/{exception_inf.id}/valider/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_major_ne_peut_pas_valider_conge_dun_medecin(self):
        """La major gère les infirmiers, pas les médecins — même de son service."""
        exception_medecin = ExceptionDisponibilite.objects.create(
            employe=self.medecin_a, type="conge",
            date_debut=date.today(), date_fin=date.today() + timedelta(days=2),
        )
        self.client.force_authenticate(user=self.major_user)
        response = self.client.post(f'/api/exceptions/{exception_medecin.id}/valider/')
        self.assertIn(response.status_code, [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND])
        exception_medecin.refresh_from_db()
        self.assertEqual(exception_medecin.statut, 'en_attente')

    def test_infirmier_simple_ne_peut_pas_valider_conge_dun_collegue(self):
        exception_inf = ExceptionDisponibilite.objects.create(
            employe=self.inf_a, type="conge",
            date_debut=date.today(), date_fin=date.today() + timedelta(days=2),
        )
        self.client.force_authenticate(user=self.inf_b_user)
        response = self.client.post(f'/api/exceptions/{exception_inf.id}/valider/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)