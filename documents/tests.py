from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status
from datetime import date

from .models import ModeleDocument, DocumentGenere
from comptes.models import Employe
from consultations.models import Consultation
from patients.models import Patient
from services.models import Service


def creer_employe(username, role, service=None):
    user = User.objects.create_user(username=username, password="testpass123")
    employe = Employe.objects.create(
        user=user, nom="Test", prenom=username.capitalize(),
        date_naissance=date(1990, 1, 1), sexe="F", role=role, service=service,
    )
    return user, employe


class ModeleDocumentModelTest(TestCase):
    """Tests du rendu de modèle (remplacement des jetons {{...}})"""

    def setUp(self):
        self.service = Service.objects.create(nom="Pédiatrie")
        self.medecin_user, self.medecin = creer_employe("medecin1", "medecin", service=self.service)
        self.patient = Patient.objects.create(
            nom="Ba", prenom="Diariatou", date_naissance=date(1960, 3, 12), sexe="F",
            numero_dossier="P381124",
        )
        self.consultation = Consultation.objects.create(
            patient=self.patient, type_evenement="consultation",
            motif="Douleurs abdominales", diagnostic="Suspicion d'appendicite",
        )
        self.modele = ModeleDocument.objects.create(
            nom="Test modèle",
            type_document="compte_rendu_consultation",
            corps="Patient {{patient.prenom}} {{patient.nom}}, motif : {{consultation.motif}}. Dr {{medecin.nom}}.",
        )

    def test_rendre_remplace_les_jetons_connus(self):
        """Vérifie que les jetons patient/consultation/médecin sont bien remplacés"""
        texte = self.modele.rendre(patient=self.patient, consultation=self.consultation, medecin=self.medecin)
        self.assertIn("Diariatou Ba", texte)
        self.assertIn("Douleurs abdominales", texte)
        self.assertIn("Test", texte)  # nom de l'employé de test
        self.assertNotIn("{{", texte)

    def test_rendre_sans_consultation_laisse_le_jeton_tel_quel(self):
        """Un jeton sans donnée disponible ne fait pas planter le rendu"""
        modele = ModeleDocument.objects.create(
            nom="Avec diagnostic", type_document="autre",
            corps="Diagnostic : {{consultation.diagnostic}}",
        )
        texte = modele.rendre(patient=self.patient)
        self.assertIn("{{consultation.diagnostic}}", texte)


class DocumentsAPITest(TestCase):
    """Tests de l'API modèles + génération de documents"""

    def setUp(self):
        self.service = Service.objects.create(nom="Pédiatrie")
        self.medecin_user, self.medecin = creer_employe("medecin1", "medecin", service=self.service)
        self.infirmier_user, self.infirmier = creer_employe("infirmier1", "infirmier", service=self.service)
        self.admin_user, self.admin = creer_employe("admin1", "admin", service=self.service)

        self.patient = Patient.objects.create(
            nom="Ba", prenom="Diariatou", date_naissance=date(1960, 3, 12), sexe="F",
        )
        self.modele = ModeleDocument.objects.create(
            nom="Certificat", type_document="certificat_medical",
            corps="Certificat pour {{patient.prenom}} {{patient.nom}}.",
        )
        self.client = APIClient()

    def test_lister_modeles_authentifie(self):
        """Tout utilisateur authentifié peut lister les modèles"""
        self.client.force_authenticate(user=self.infirmier_user)
        response = self.client.get('/api/modeles-documents/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_creer_modele_medecin_refuse(self):
        """Un médecin ne peut pas créer de modèle — réservé à la gestion de la bibliothèque (admin)"""
        self.client.force_authenticate(user=self.medecin_user)
        response = self.client.post('/api/modeles-documents/', {
            'nom': 'Nouveau', 'type_document': 'autre', 'corps': 'Contenu',
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_creer_modele_admin_ok(self):
        """Un admin (chef de service) peut créer un modèle"""
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.post('/api/modeles-documents/', {
            'nom': 'Nouveau', 'type_document': 'autre', 'corps': 'Contenu',
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['cree_par'], self.admin.id)

    def test_generer_document_medecin(self):
        """Un médecin peut générer un document à partir d'un modèle"""
        self.client.force_authenticate(user=self.medecin_user)
        response = self.client.post(f'/api/modeles-documents/{self.modele.id}/generer/', {
            'patient': self.patient.id,
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("Diariatou Ba", response.data['contenu'])
        self.assertEqual(DocumentGenere.objects.count(), 1)
        self.assertEqual(DocumentGenere.objects.first().genere_par, self.medecin)

    def test_generer_document_infirmier_refuse(self):
        """Un infirmier ne peut pas générer de document (pas la capacité DOCUMENTS_GENERER)"""
        self.client.force_authenticate(user=self.infirmier_user)
        response = self.client.post(f'/api/modeles-documents/{self.modele.id}/generer/', {
            'patient': self.patient.id,
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_generer_sans_patient_refuse(self):
        """Le patient est obligatoire pour générer un document"""
        self.client.force_authenticate(user=self.medecin_user)
        response = self.client.post(f'/api/modeles-documents/{self.modele.id}/generer/', {})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_lister_documents_generes_filtre_par_patient(self):
        """?patient= filtre bien les documents générés"""
        autre_patient = Patient.objects.create(nom="Fall", prenom="Awa", date_naissance=date(1990, 1, 1), sexe="F")
        DocumentGenere.objects.create(
            patient=self.patient, modele=self.modele, type_document='certificat_medical',
            titre="Doc 1", contenu="...", genere_par=self.medecin,
        )
        DocumentGenere.objects.create(
            patient=autre_patient, modele=self.modele, type_document='certificat_medical',
            titre="Doc 2", contenu="...", genere_par=self.medecin,
        )
        self.client.force_authenticate(user=self.medecin_user)
        response = self.client.get(f'/api/documents-generes/?patient={self.patient.id}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['titre'], "Doc 1")

    def test_creation_directe_document_genere_interdite(self):
        """On ne peut pas POST directement sur /documents-generes/ — seul generer() peut créer"""
        self.client.force_authenticate(user=self.medecin_user)
        response = self.client.post('/api/documents-generes/', {
            'patient': self.patient.id, 'titre': 'Fabriqué', 'contenu': 'Texte libre', 'type_document': 'autre',
        })
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_supprimer_document_par_son_auteur(self):
        """L'auteur d'un document généré peut le supprimer"""
        doc = DocumentGenere.objects.create(
            patient=self.patient, modele=self.modele, type_document='certificat_medical',
            titre="Doc", contenu="...", genere_par=self.medecin,
        )
        self.client.force_authenticate(user=self.medecin_user)
        response = self.client.delete(f'/api/documents-generes/{doc.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_supprimer_document_par_un_autre_refuse(self):
        """Un autre médecin (pas l'auteur, pas admin) ne peut pas supprimer le document"""
        autre_user, _ = creer_employe("medecin2", "medecin", service=self.service)
        doc = DocumentGenere.objects.create(
            patient=self.patient, modele=self.modele, type_document='certificat_medical',
            titre="Doc", contenu="...", genere_par=self.medecin,
        )
        self.client.force_authenticate(user=autre_user)
        response = self.client.delete(f'/api/documents-generes/{doc.id}/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
