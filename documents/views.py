from django.http import HttpResponse
from django.template.loader import render_to_string
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied

from .models import ModeleDocument, DocumentGenere, Medicament, TypeDocument, construire_contexte
from .rendu import champs_vides_pour, resumer_donnees
from .serializers import ModeleDocumentSerializer, DocumentGenereSerializer, MedicamentSerializer
from comptes.permissions import get_employe, PeutGenererDocument, PeutGererModeles
from patients.models import Patient
from consultations.models import Consultation

GABARITS_PDF = {
    TypeDocument.ORDONNANCE: 'documents/pdf/ordonnance.html',
    TypeDocument.CERTIFICAT_MEDICAL: 'documents/pdf/certificat_medical.html',
    TypeDocument.DEMANDE_ANALYSE: 'documents/pdf/demande_analyse.html',
    TypeDocument.DEMANDE_IMAGERIE: 'documents/pdf/demande_analyse.html',
    TypeDocument.COMPTE_RENDU_CONSULTATION: 'documents/pdf/compte_rendu_consultation.html',
    TypeDocument.LETTRE_ORIENTATION: 'documents/pdf/lettre_orientation.html',
    TypeDocument.ARRET_TRAVAIL: 'documents/pdf/arret_travail.html',
}


class ModeleDocumentViewSet(viewsets.ModelViewSet):
    """Habillage (en-tête/pied de page) — Paramètres > Modèles de documents."""
    serializer_class = ModeleDocumentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = ModeleDocument.objects.all()
        type_document = self.request.query_params.get('type_document')
        if type_document:
            qs = qs.filter(type_document=type_document)
        if self.request.query_params.get('actifs_seulement') == 'true':
            qs = qs.filter(actif=True)
        return qs

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [PeutGererModeles()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(cree_par=get_employe(self.request.user))


class MedicamentViewSet(viewsets.ReadOnlyModelViewSet):
    """Référentiel de médicaments pour le champ de recherche de l'ordonnance."""
    serializer_class = MedicamentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Medicament.objects.filter(actif=True)
        recherche = self.request.query_params.get('search')
        if recherche:
            qs = qs.filter(nom__icontains=recherche)
        return qs[:20]


class DocumentGenereViewSet(viewsets.ModelViewSet):
    """Documents en cours d'édition (brouillon) ou finalisés."""
    serializer_class = DocumentGenereSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = DocumentGenere.objects.select_related('patient', 'consultation', 'modele', 'genere_par')
        patient_id = self.request.query_params.get('patient')
        if patient_id:
            qs = qs.filter(patient_id=patient_id)
        consultation_id = self.request.query_params.get('consultation')
        if consultation_id:
            qs = qs.filter(consultation_id=consultation_id)
        return qs

    def get_permissions(self):
        if self.action == 'create':
            return [PeutGenererDocument()]
        return [IsAuthenticated()]

    def _est_auteur_ou_admin(self, instance):
        emp = get_employe(self.request.user)
        est_auteur = emp is not None and instance.genere_par_id == emp.id
        est_admin = self.request.user.is_superuser or (emp is not None and emp.role == 'admin')
        return est_auteur or est_admin

    def create(self, request, *args, **kwargs):
        type_document = request.data.get('type_document')
        if type_document not in TypeDocument.values:
            return Response({'detail': "Type de document invalide."}, status=status.HTTP_400_BAD_REQUEST)

        patient_id = request.data.get('patient')
        if not patient_id:
            return Response({'detail': "Le patient est obligatoire."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            patient = Patient.objects.get(pk=patient_id)
        except Patient.DoesNotExist:
            return Response({'detail': "Patient introuvable."}, status=status.HTTP_404_NOT_FOUND)

        consultation = None
        consultation_id = request.data.get('consultation')
        if consultation_id:
            consultation = Consultation.objects.filter(pk=consultation_id).first()

        modele_id = request.data.get('modele')
        if modele_id:
            modele = ModeleDocument.objects.filter(pk=modele_id, type_document=type_document).first()
        else:
            modele = ModeleDocument.objects.filter(type_document=type_document, actif=True).first()

        emp = get_employe(request.user)
        contexte = construire_contexte(patient=patient, consultation=consultation, medecin=emp)
        donnees = {'contexte': contexte, 'champs': champs_vides_pour(type_document)}

        document = DocumentGenere.objects.create(
            patient=patient, consultation=consultation, modele=modele, type_document=type_document,
            titre=f"{dict(TypeDocument.choices)[type_document]} — {patient.prenom} {patient.nom}",
            statut='brouillon', donnees=donnees, contenu='', genere_par=emp,
        )
        return Response(DocumentGenereSerializer(document).data, status=status.HTTP_201_CREATED)

    def perform_update(self, serializer):
        if not self._est_auteur_ou_admin(serializer.instance):
            raise PermissionDenied("Tu ne peux modifier que les documents que tu as toi-même générés.")
        instance = serializer.save()
        nouveau_contenu = resumer_donnees(instance.type_document, instance.donnees)
        if nouveau_contenu != instance.contenu:
            instance.contenu = nouveau_contenu
            instance.save(update_fields=['contenu'])

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if not self._est_auteur_ou_admin(instance):
            return Response(
                {'detail': "Tu ne peux supprimer que les documents que tu as toi-même générés."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['get'], url_path='pdf')
    def pdf(self, request, pk=None):
        document = self.get_object()
        gabarit = GABARITS_PDF.get(document.type_document)
        if not gabarit:
            return Response({'detail': "Export PDF non disponible pour ce type de document."}, status=status.HTTP_400_BAD_REQUEST)

        contexte = (document.donnees or {}).get('contexte', {})
        champs = (document.donnees or {}).get('champs', {})
        entete = document.modele.rendre_entete(contexte) if document.modele else ''
        pied_de_page = document.modele.rendre_pied_de_page(contexte) if document.modele else ''

        html = render_to_string(gabarit, {
            'document': document, 'contexte': contexte, 'champs': champs,
            'entete': entete, 'pied_de_page': pied_de_page,
        })

        try:
            from xhtml2pdf import pisa
        except ImportError:
            return Response(
                {'detail': "Génération PDF indisponible côté serveur : le paquet 'xhtml2pdf' n'est pas installé "
                           "(pip install xhtml2pdf). L'impression navigateur reste utilisable en attendant."},
                status=status.HTTP_501_NOT_IMPLEMENTED,
            )

        response = HttpResponse(content_type='application/pdf')
        nom_fichier = document.titre.replace('/', '-')
        response['Content-Disposition'] = f'inline; filename="{nom_fichier}.pdf"'
        resultat = pisa.CreatePDF(html, dest=response)
        if resultat.err:
            return Response({'detail': "Erreur lors de la génération du PDF."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        return response
