from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status
from .models import Patient
from datetime import date

# Create your tests here.
class PatientModelTest(TestCase):
    """ Tests du modèle Patient """

    def setUp(self):
        #setUp = s'ecécute avant chaque test
        self.patient = Patient.objects.create(
            nom="Diop",
            prenom="Fatou",
            date_naissance=date(1995, 3, 15),
            sexe="F",
            groupe_sanguin="A+",
            telephone="771234567"
        )

    def test_patient_creation(self):
        """Vérifie qu'un patient est bien créé"""
        self.assertEqual(self.patient.nom, "Diop")
        self.assertEqual(self.patient.prenom, "Fatou")
        self.assertTrue(self.patient.actif)

    def test_patient_str(self):
        """Vérifie la représentation textuelle"""
        self.assertEqual(str(self.patient),"Fatou Diop")

    def test_patient_default_actif(self):
        """Vérifie que actif = True par défaut"""
        self.assertTrue(self.patient.actif)

class PatientAPITest(TestCase):
    """Test de l'API patients"""

    def setUp(self):
        #Créer un utilisateur de test
        self.user = User.objects.create_user(
            username="testuser",
            password="testpass123"
        )


        #Créer un client API (comme Postman mais en code)
        self.client = APIClient()

        #Authentifie le client avec JWT
        self.client.force_authenticate(user=self.user)
        self.patient_data = {
            "nom": "Ndiaye",
            "prenom": "Moussa",
            "date_naissance": "1990-06-20",
            "sexe": "M",
            "groupe_sanguin": "O+",
            "telephone": "780000000"
        }

        def test_creer_patient(self):
            """Vérifie qu'on peut créer un patient via API"""
            response = self.client.post('/api/patients',self.patient_data)
            self.assertEqual(response.status_code,status.HTTP_201_CREATED)
            self.assertEqual(Patient.objects.count(),1)
            self.assertEqual(response.data['nom'],'Ndiaye')

        def test_lister_patients(self):
            """Vérifie qu'on peut lister les patients"""
            Patient.objects.create(
                nom="Fall",prénom="Awa",
                date_naissance=date(1998, 1, 1),sexe="F"
            )
            response = self.client.get('/api/patients')
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            self.assertEqual(len(response.data),1)

        def test_acces_sans_authentification(self):
            """Vérifie qu'un nom-connecté ne peut pas accéder"""
            client_non_auth = APIClient()
            response = client_non_auth.get('/api/patients')
            self.assertEqual(response.status_code,status.HTTP_401_UNAUTHORIZED)

        def test_detail_patient(self):
            """Vérifie qu'on peut voir un patient spécifique"""
            response = self.client.post('/api/patients',self.patient_data)
            patient_id = response.data['id']
            response = self.client.get(f'/api/patients/{patient_id}')
            self.assertEqual(response.status_code,status.HTTP_200_OK)
            self.assertEqual(response.data['nom'],'Ndiaye')

        def test_modifier_patient(self):
            """Vérifie qu'on peut modifier un patient"""
            response = self.client.post('/api/patients',self.patient_data)
            patient_id = response.data['id']
            response = self.client.patch(
                f'/api/patients/{patient_id}/',
                {'telephone':'781111111'}
            )
            self.assertEqual(response.status_code,status.HTTP_200_OK)
            self.assertEqual(response.data['telephone'],'781111111')

            def test_supprimer_patient(self):
                """Vérifie qu'on peut supprimer un patient"""
                response = self.clientpost('/api/patients/',self.patient_data)
                patient_id = response.data['id']
                response = self.client.delete(f'/api/patients/{patient_id}')
                self.assertEqual(response.status_code,status.HTTP_204_NO_CONTENT)
                self.asserEqual(Patient.objects.count(),0)