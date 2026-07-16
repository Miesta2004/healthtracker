"""
Tests pour l'assignation infirmier(ère) ↔ patient par poste (shift).

Lancer uniquement ces tests :
    python manage.py test disponibilites.tests_assignation
"""
from datetime import date

from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from comptes.models import Employe
from disponibilites.models import AssignationPatient
from disponibilites.shifts import shift_et_date_actuels
from patients.models import Patient
from services.models import Service


def creer_employe(username, role, service=None, password="testpass123"):
    user = User.objects.create_user(username=username, password=password)
    employe = Employe.objects.create(
        user=user, nom="Test", prenom=username.capitalize(),
        date_naissance=date(1990, 1, 1), sexe="F", role=role, service=service,
    )
    return user, employe


class AssignationPatientTest(TestCase):
    def setUp(self):
        self.service_a = Service.objects.create(nom="Cardiologie")
        self.service_b = Service.objects.create(nom="Pédiatrie")

        self.chef_a_user, self.chef_a = creer_employe("chefA", "admin", service=self.service_a)
        self.inf_a_user,  self.inf_a  = creer_employe("infA",  "infirmier", service=self.service_a)
        self.inf_b_user,  self.inf_b  = creer_employe("infB",  "infirmier", service=self.service_b)

        self.patient_a = Patient.objects.create(
            nom="Ndiaye", prenom="Fatou", date_naissance=date(1968, 3, 1),
            sexe="F", adresse="Dakar", service=self.service_a,
        )
        self.patient_b = Patient.objects.create(
            nom="Sow", prenom="Awa", date_naissance=date(1990, 1, 1),
            sexe="F", adresse="Dakar", service=self.service_b,
        )

        self.client = APIClient()

    def test_chef_assigne_infirmier_meme_service(self):
        self.client.force_authenticate(user=self.chef_a_user)
        response = self.client.post('/api/assignations/', {
            'infirmier': self.inf_a.id, 'patient': self.patient_a.id,
            'date': '2026-07-14', 'shift': 'matin',
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(AssignationPatient.objects.count(), 1)
        self.assertEqual(AssignationPatient.objects.first().service_id, self.service_a.id)

    def test_chef_ne_peut_pas_assigner_infirmier_autre_service(self):
        self.client.force_authenticate(user=self.chef_a_user)
        response = self.client.post('/api/assignations/', {
            'infirmier': self.inf_b.id, 'patient': self.patient_a.id,
            'date': '2026-07-14', 'shift': 'matin',
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_chef_ne_peut_pas_assigner_a_patient_autre_service(self):
        self.client.force_authenticate(user=self.chef_a_user)
        response = self.client.post('/api/assignations/', {
            'infirmier': self.inf_a.id, 'patient': self.patient_b.id,
            'date': '2026-07-14', 'shift': 'matin',
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_infirmier_ne_peut_pas_sassigner_lui_meme(self):
        self.client.force_authenticate(user=self.inf_a_user)
        response = self.client.post('/api/assignations/', {
            'infirmier': self.inf_a.id, 'patient': self.patient_a.id,
            'date': '2026-07-14', 'shift': 'matin',
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_deux_infirmiers_meme_patient_shifts_differents_ok(self):
        _, inf_a2 = creer_employe("infA2", "infirmier", service=self.service_a)
        self.client.force_authenticate(user=self.chef_a_user)
        r1 = self.client.post('/api/assignations/', {
            'infirmier': self.inf_a.id, 'patient': self.patient_a.id,
            'date': '2026-07-14', 'shift': 'matin',
        })
        r2 = self.client.post('/api/assignations/', {
            'infirmier': inf_a2.id, 'patient': self.patient_a.id,
            'date': '2026-07-14', 'shift': 'nuit',
        })
        self.assertEqual(r1.status_code, status.HTTP_201_CREATED)
        self.assertEqual(r2.status_code, status.HTTP_201_CREATED)
        self.assertEqual(AssignationPatient.objects.filter(patient=self.patient_a).count(), 2)

    def test_mes_patients_renvoie_le_shift_en_cours(self):
        date_courante, shift_courant = shift_et_date_actuels()
        AssignationPatient.objects.create(
            infirmier=self.inf_a, patient=self.patient_a, service=self.service_a,
            date=date_courante, shift=shift_courant,
        )
        # Un autre jour/shift ne doit pas apparaître
        AssignationPatient.objects.create(
            infirmier=self.inf_a, patient=self.patient_a, service=self.service_a,
            date=date(2020, 1, 1), shift='matin',
        )

        self.client.force_authenticate(user=self.inf_a_user)
        response = self.client.get('/api/assignations/mes-patients/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['assignations']), 1)
        self.assertEqual(response.data['assignations'][0]['patient'], self.patient_a.id)

    def test_infirmier_ne_voit_pas_les_patients_dun_autre(self):
        AssignationPatient.objects.create(
            infirmier=self.inf_b, patient=self.patient_b, service=self.service_b,
            date=date.today(), shift='matin',
        )
        self.client.force_authenticate(user=self.inf_a_user)
        response = self.client.get('/api/assignations/?patient=' + str(self.patient_b.id))
        self.assertEqual(len(response.data), 0)