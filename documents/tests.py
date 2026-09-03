from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status
from datetime import date

from .models import ModeleDocument, DocumentGenere, Medicament, construire_contexte
from .rendu import champs_vides_pour, resumer_donnees
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


class ContexteEtRenduTest(TestCase):
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

    def test_construire_contexte_inclut_patient_consultation_medecin(self):
        contexte = construire_contexte(patient=self.patient, consultation=self.consultation, medecin=self.medecin)
        self.assertEqual(contexte['patient']['nom'], "Ba")
        self.assertEqual(contexte['consultation']['motif'], "Douleurs abdominales")
        self.assertEqual(contexte['medecin']['nom'], "Test")
        self.assertEqual(contexte['service']['nom'], "Pédiatrie")

    def test_construire_contexte_sans_consultation_ni_medecin(self):
        contexte = construire_contexte(patient=self.patient)
        self.assertIsNone(contexte['consultation'])
        self.assertIsNone(contexte['medecin'])

    def test_champs_vides_ordonnance(self):
        self.assertEqual(champs_vides_pour('ordonnance'), {'medicaments': [], 'conseils_generaux': ''})

    def test_champs_vides_demande_imagerie_partage_celui_de_demande_analyse(self):
        self.assertEqual(champs_vides_pour('demande_imagerie'), champs_vides_pour('demande_analyse'))

    def test_resumer_donnees_ordonnance(self):
        donnees = {'champs': {'medicaments': [
            {'nom': 'Oméprazole', 'dosage': '20 mg', 'posologie': '1 gélule', 'frequence': 'le matin', 'duree': '14 jours'},
        ], 'conseils_generaux': ''}}
        resume = resumer_donnees('ordonnance', donnees)
        self.assertIn('Oméprazole', resume)
        self.assertIn('20 mg', resume)

    def test_resumer_donnees_vide_ne_plante_pas(self):
        self.assertTrue(resumer_donnees('ordonnance', {}))
        self.assertTrue(resumer_donnees('certificat_medical', None))


class DocumentGenereAPITest(TestCase):
    def setUp(self):
        self.service = Service.objects.create(nom="Pédiatrie")
        self.medecin_user, self.medecin = creer_employe("medecin1", "medecin", service=self.service)
        self.infirmier_user, self.infirmier = creer_employe("infirmier1", "infirmier", service=self.service)
        self.admin_user, self.admin = creer_employe("admin1", "admin", service=self.service)
        self.patient = Patient.objects.create(nom="Ba", prenom="Diariatou", date_naissance=date(1960, 3, 12), sexe="F")
        self.consultation = Consultation.objects.create(patient=self.patient, type_evenement="consultation", motif="Douleurs abdominales")
        self.client = APIClient()

    def test_creer_brouillon_medecin(self):
        self.client.force_authenticate(user=self.medecin_user)
        response = self.client.post('/api/documents-generes/', {
            'patient': self.patient.id, 'consultation': self.consultation.id, 'type_document': 'ordonnance',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['statut'], 'brouillon')
        self.assertEqual(response.data['donnees']['champs']['medicaments'], [])
        self.assertEqual(response.data['donnees']['contexte']['patient']['nom'], 'Ba')

    def test_creer_brouillon_type_invalide_refuse(self):
        self.client.force_authenticate(user=self.medecin_user)
        response = self.client.post('/api/documents-generes/', {'patient': self.patient.id, 'type_document': 'pas_un_type'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_creer_brouillon_infirmier_refuse(self):
        self.client.force_authenticate(user=self.infirmier_user)
        response = self.client.post('/api/documents-generes/', {'patient': self.patient.id, 'type_document': 'ordonnance'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_modifier_champs_et_finaliser(self):
        self.client.force_authenticate(user=self.medecin_user)
        creation = self.client.post('/api/documents-generes/', {'patient': self.patient.id, 'type_document': 'ordonnance'}, format='json')
        doc_id = creation.data['id']
        donnees = creation.data['donnees']
        donnees['champs']['medicaments'] = [{'nom': 'Paracétamol', 'dosage': '1 g', 'posologie': '1 cp', 'frequence': '3x/j', 'duree': '5 jours', 'quantite': '1 boîte', 'conseils': ''}]
        response = self.client.patch(f'/api/documents-generes/{doc_id}/', {'donnees': donnees}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('Paracétamol', response.data['contenu'])
        finalisation = self.client.patch(f'/api/documents-generes/{doc_id}/', {'statut': 'finalise'}, format='json')
        self.assertEqual(finalisation.data['statut'], 'finalise')

    def test_modifier_par_un_autre_refuse(self):
        doc = DocumentGenere.objects.create(patient=self.patient, type_document='ordonnance', titre="Doc", donnees={'contexte': {}, 'champs': {}}, genere_par=self.medecin)
        autre_user, _ = creer_employe("medecin2", "medecin", service=self.service)
        self.client.force_authenticate(user=autre_user)
        response = self.client.patch(f'/api/documents-generes/{doc.id}/', {'statut': 'finalise'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_supprimer_par_son_auteur(self):
        doc = DocumentGenere.objects.create(patient=self.patient, type_document='ordonnance', titre="Doc", donnees={'contexte': {}, 'champs': {}}, genere_par=self.medecin)
        self.client.force_authenticate(user=self.medecin_user)
        response = self.client.delete(f'/api/documents-generes/{doc.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_lister_filtre_par_patient(self):
        autre_patient = Patient.objects.create(nom="Fall", prenom="Awa", date_naissance=date(1990, 1, 1), sexe="F")
        DocumentGenere.objects.create(patient=self.patient, type_document='ordonnance', titre="Doc 1", donnees={}, genere_par=self.medecin)
        DocumentGenere.objects.create(patient=autre_patient, type_document='ordonnance', titre="Doc 2", donnees={}, genere_par=self.medecin)
        self.client.force_authenticate(user=self.medecin_user)
        response = self.client.get(f'/api/documents-generes/?patient={self.patient.id}')
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['titre'], "Doc 1")

    def test_pdf_sans_xhtml2pdf_installe_renvoie_message_clair(self):
        # L'ordonnance n'utilise plus ce circuit HTML → PDF (générée côté client
        # avec @react-pdf/renderer) ; on teste ici un type qui y reste encore.
        doc = DocumentGenere.objects.create(
            patient=self.patient, type_document='certificat_medical', titre="Doc",
            donnees={'contexte': construire_contexte(patient=self.patient), 'champs': champs_vides_pour('certificat_medical')},
            genere_par=self.medecin,
        )
        self.client.force_authenticate(user=self.medecin_user)
        response = self.client.get(f'/api/documents-generes/{doc.id}/pdf/')
        self.assertIn(response.status_code, (status.HTTP_200_OK, status.HTTP_501_NOT_IMPLEMENTED))


class ModeleDocumentAPITest(TestCase):
    def setUp(self):
        self.service = Service.objects.create(nom="Pédiatrie")
        self.medecin_user, self.medecin = creer_employe("medecin1", "medecin", service=self.service)
        self.admin_user, self.admin = creer_employe("admin1", "admin", service=self.service)
        self.client = APIClient()

    def test_creer_modele_medecin_refuse(self):
        self.client.force_authenticate(user=self.medecin_user)
        response = self.client.post('/api/modeles-documents/', {'nom': 'Ordonnance standard', 'type_document': 'ordonnance', 'entete': '', 'pied_de_page': ''})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_creer_modele_admin_ok(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.post('/api/modeles-documents/', {
            'nom': 'Ordonnance standard', 'type_document': 'ordonnance',
            'entete': 'Clinique X — {{service.nom}}', 'pied_de_page': 'Dr {{medecin.prenom}} {{medecin.nom}}',
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_rendre_entete_remplace_les_jetons(self):
        modele = ModeleDocument.objects.create(nom="Test", type_document="ordonnance", entete="Service : {{service.nom}}")
        self.assertEqual(modele.rendre_entete({'service': {'nom': 'Pédiatrie'}}), "Service : Pédiatrie")


class MedicamentAPITest(TestCase):
    def setUp(self):
        self.service = Service.objects.create(nom="Pédiatrie")
        self.medecin_user, _ = creer_employe("medecin1", "medecin", service=self.service)
        Medicament.objects.create(nom="Paracétamol", forme="comprimé")
        Medicament.objects.create(nom="Amoxicilline", forme="gélule")
        self.client = APIClient()

    def test_recherche_medicament(self):
        self.client.force_authenticate(user=self.medecin_user)
        response = self.client.get('/api/medicaments/?search=parac')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['nom'], 'Paracétamol')

    def test_liste_sans_recherche_renvoie_tout(self):
        self.client.force_authenticate(user=self.medecin_user)
        response = self.client.get('/api/medicaments/')
        self.assertEqual(len(response.data), 2)
