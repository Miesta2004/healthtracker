from django.test import TestCase
from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status
from datetime import date, timedelta

from .models import RendezVous, Consultation
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


class ConsultationDemarrageTest(TestCase):
    """
    Tests du parcours démarrage/fin de consultation : started_at/ended_at
    doivent être renseignés automatiquement (et une seule fois) au fil des
    transitions de statut, quel que soit le client qui les déclenche.
    """

    def setUp(self):
        self.patient = Patient.objects.create(
            nom="Ndiaye", prenom="Awa", date_naissance=date(1990, 3, 2), sexe="F",
        )

    def _consultation(self, **kwargs):
        defaults = dict(
            patient=self.patient, date=timezone.now(), motif="Douleurs abdominales",
            decision_orientation="sortie",
        )
        defaults.update(kwargs)
        return Consultation.objects.create(**defaults)

    def test_demarrage_renseigne_started_at(self):
        c = self._consultation(statut='planifiee')
        self.assertIsNone(c.started_at)
        c.statut = 'en_cours'
        c.save()
        self.assertIsNotNone(c.started_at)
        self.assertIsNone(c.ended_at)

    def test_started_at_non_ecrase_si_deja_present(self):
        c = self._consultation(statut='en_cours')
        premier_started_at = c.started_at
        self.assertIsNotNone(premier_started_at)
        c.motif = "Douleurs abdominales — mise à jour"
        c.save()
        c.refresh_from_db()
        self.assertEqual(c.started_at, premier_started_at)

    def test_fin_renseigne_ended_at_et_duree(self):
        c = self._consultation(statut='en_cours')
        self.assertIsNone(c.duree_secondes)
        c.started_at = timezone.now() - timedelta(minutes=5)
        c.statut = 'terminee'
        c.save()
        self.assertIsNotNone(c.ended_at)
        self.assertGreaterEqual(c.duree_secondes, 299)  # ~5 min, marge d'exécution

    def test_duree_secondes_none_avant_fin(self):
        c = self._consultation(statut='en_cours')
        self.assertIsNone(c.duree_secondes)


class ConsultationParcoursAPITest(TestCase):
    """
    Simule le parcours du nouveau frontend : création directement en
    'en_cours' (modale « Nouvelle consultation »), puis fin via l'API avec
    decision_orientation (modale « Terminer la consultation ») — cf. tests
    manuels demandés dans la spec parcours consultation §17.
    """

    def setUp(self):
        self.service = Service.objects.create(nom="Médecine générale")
        self.medecin_user, self.medecin = creer_employe("medecin2", "medecin", service=self.service)
        self.patient = Patient.objects.create(
            nom="Sarr", prenom="Moussa", date_naissance=date(1985, 5, 20), sexe="M", service=self.service,
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.medecin_user)

    def test_creation_directe_en_cours_renseigne_started_at(self):
        response = self.client.post('/api/consultations/', {
            'patient': self.patient.id,
            'type_evenement': 'consultation',
            'type_consultation': 'initiale',
            'date': timezone.now().isoformat(),
            'motif': 'Douleurs abdominales',
            'statut': 'en_cours',
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertIsNotNone(response.data['started_at'])
        self.assertIsNone(response.data['ended_at'])
        self.assertEqual(response.data['type_consultation'], 'initiale')

    def test_terminer_sans_decision_orientation_refuse(self):
        c = Consultation.objects.create(
            patient=self.patient, date=timezone.now(), motif="Test", statut='en_cours',
        )
        response = self.client.patch(f'/api/consultations/{c.id}/', {'statut': 'terminee'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_terminer_avec_decision_orientation_renseigne_duree(self):
        c = Consultation.objects.create(
            patient=self.patient, date=timezone.now(), motif="Test", statut='en_cours',
        )
        response = self.client.patch(f'/api/consultations/{c.id}/', {
            'statut': 'terminee', 'decision_orientation': 'sortie',
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertIsNotNone(response.data['ended_at'])
        self.assertIsNotNone(response.data['duree_secondes'])
        self.assertGreaterEqual(response.data['duree_secondes'], 0)


class ConsultationStatsAPITest(TestCase):
    """Tests de l'action /api/consultations/stats/ (indicateurs d'activité §14)."""

    def setUp(self):
        self.service = Service.objects.create(nom="Médecine générale")
        self.medecin_user, self.medecin = creer_employe("medecin4", "medecin", service=self.service)
        self.patient = Patient.objects.create(
            nom="Diop", prenom="Fatou", date_naissance=date(1995, 1, 1), sexe="F", service=self.service,
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.medecin_user)

    def test_stats_calcule_duree_moyenne_et_repartition(self):
        maintenant = timezone.now()
        Consultation.objects.create(
            patient=self.patient, date=maintenant, motif="A", statut='terminee',
            type_consultation='initiale', decision_orientation='sortie',
            started_at=maintenant - timedelta(minutes=10), ended_at=maintenant,
        )
        Consultation.objects.create(
            patient=self.patient, date=maintenant, motif="B", statut='terminee',
            type_consultation='suivi', decision_orientation='sortie',
            started_at=maintenant - timedelta(minutes=20), ended_at=maintenant,
        )
        # En cours : ne doit pas compter dans les moyennes de durée
        Consultation.objects.create(
            patient=self.patient, date=maintenant, motif="C", statut='en_cours',
        )

        response = self.client.get('/api/consultations/stats/')
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertEqual(response.data['nb_consultations'], 3)
        self.assertEqual(response.data['nb_terminees'], 2)
        self.assertAlmostEqual(response.data['duree_moyenne_secondes'], 900, delta=1)  # (10+20)/2 min
        self.assertEqual(len(response.data['repartition_par_type']), 2)

    def test_stats_sans_donnees_ne_plante_pas(self):
        response = self.client.get('/api/consultations/stats/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['nb_consultations'], 0)
        self.assertIsNone(response.data['duree_moyenne_secondes'])
        self.assertIsNone(response.data['duree_mediane_secondes'])


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