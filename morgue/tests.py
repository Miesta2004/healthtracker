from django.test import TestCase
from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status
from datetime import date

from .models import Deces, Autopsie, StatutDeces
from comptes.models import Employe
from patients.models import Patient


def creer_employe(username, role, specialite=''):
    user = User.objects.create_user(username=username, password="testpass123")
    employe = Employe.objects.create(
        user=user, nom="Test", prenom=username.capitalize(),
        date_naissance=date(1980, 1, 1), sexe="F", role=role, specialite=specialite,
    )
    return user, employe


class DecesModelTest(TestCase):
    def setUp(self):
        self.patient = Patient.objects.create(
            nom="Diouf", prenom="Alassane", date_naissance=date(1950, 1, 1), sexe="M",
        )

    def test_creation_et_str(self):
        deces = Deces.objects.create(patient=self.patient, date_deces=timezone.now())
        self.assertIn("Alassane", str(deces))

    def test_statut_par_defaut_dispense(self):
        deces = Deces.objects.create(patient=self.patient, date_deces=timezone.now())
        self.assertEqual(deces.statut, StatutDeces.DISPENSE_AUTOPSIE)

    def test_un_seul_deces_par_patient(self):
        Deces.objects.create(patient=self.patient, date_deces=timezone.now())
        from django.db import IntegrityError
        with self.assertRaises(IntegrityError):
            Deces.objects.create(patient=self.patient, date_deces=timezone.now())


class DecesAPITest(TestCase):
    def setUp(self):
        self.admin_user, self.admin = creer_employe("admin1", "admin")
        self.medecin_user, self.medecin = creer_employe("medecin1", "medecin")
        self.legiste_user, self.legiste = creer_employe("legiste1", "medecin", specialite="Médecine légale")
        self.secretaire_user, self.secretaire = creer_employe("secretaire1", "secretaire")
        self.infirmier_user, self.infirmier = creer_employe("infirmier1", "infirmier")

        self.patient = Patient.objects.create(
            nom="Kane", prenom="Souleymane", date_naissance=date(1960, 1, 1), sexe="M",
        )
        self.client = APIClient()
        self.deces_data = {
            "patient": self.patient.id,
            "date_deces": timezone.now().isoformat(),
            "necessite_autopsie": True,
        }

    def test_creer_deces_medecin(self):
        """Vérifie qu'un médecin peut enregistrer un décès"""
        self.client.force_authenticate(user=self.medecin_user)
        response = self.client.post('/api/deces/', self.deces_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['statut'], StatutDeces.EN_ATTENTE_AUTOPSIE)

    def test_creer_deces_secretaire_refuse(self):
        """Vérifie qu'une secrétaire ne peut pas enregistrer de décès (acte médical)"""
        self.client.force_authenticate(user=self.secretaire_user)
        response = self.client.post('/api/deces/', self.deces_data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_creer_deces_met_a_jour_statut_vital_patient(self):
        """Vérifie que l'enregistrement du décès bascule automatiquement le patient en 'décédé'"""
        self.client.force_authenticate(user=self.medecin_user)
        self.client.post('/api/deces/', self.deces_data)
        self.patient.refresh_from_db()
        self.assertEqual(self.patient.statut_vital, Patient.StatutVital.DECEDE)

    def test_lecture_infirmier_refuse(self):
        """Vérifie que le laborantin/infirmier n'a pas accès en lecture (pas concernés par la logistique morgue)"""
        self.client.force_authenticate(user=self.infirmier_user)
        response = self.client.get('/api/deces/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_lecture_secretaire_autorisee(self):
        """Vérifie que la secrétaire peut consulter (coordination avec la famille)"""
        self.client.force_authenticate(user=self.medecin_user)
        self.client.post('/api/deces/', self.deces_data)
        self.client.force_authenticate(user=self.secretaire_user)
        response = self.client.get('/api/deces/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_action_remettre_corps(self):
        self.client.force_authenticate(user=self.medecin_user)
        r = self.client.post('/api/deces/', self.deces_data)
        deces_id = r.data['id']
        response = self.client.post(f'/api/deces/{deces_id}/remettre-corps/', {
            'reclamant_nom': 'Mariama Kane', 'reclamant_lien': 'Épouse',
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['statut'], StatutDeces.CORPS_REMIS)
        self.assertIsNotNone(response.data['date_remise_corps'])

    def test_creer_autopsie_met_a_jour_statut_deces(self):
        """Vérifie que la création d'une autopsie fait passer le décès à 'autopsie_terminee'"""
        self.client.force_authenticate(user=self.medecin_user)
        r = self.client.post('/api/deces/', self.deces_data)
        deces_id = r.data['id']

        self.client.force_authenticate(user=self.legiste_user)
        response = self.client.post('/api/autopsies/', {
            'deces': deces_id, 'medecin_legiste': self.legiste.id,
            'type': 'medicale', 'date_autopsie': timezone.now().isoformat(),
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        deces = Deces.objects.get(pk=deces_id)
        self.assertEqual(deces.statut, StatutDeces.AUTOPSIE_TERMINEE)

    def test_autopsie_par_medecin_non_specialise_autorisee(self):
        """Vérifie qu'un médecin sans spécialité 'Médecine légale' peut quand même réaliser une autopsie (réalité terrain)"""
        self.client.force_authenticate(user=self.medecin_user)
        r = self.client.post('/api/deces/', self.deces_data)
        deces_id = r.data['id']
        response = self.client.post('/api/autopsies/', {
            'deces': deces_id, 'medecin_legiste': self.medecin.id,
            'type': 'medicale', 'date_autopsie': timezone.now().isoformat(),
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_acces_sans_token(self):
        client_non_auth = APIClient()
        response = client_non_auth.get('/api/deces/')
        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])
