from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied

from .models import ModeleDocument, DocumentGenere
from .serializers import ModeleDocumentSerializer, DocumentGenereSerializer
from comptes.permissions import get_employe, PeutGenererDocument, PeutGererModeles
from patients.models import Patient
from consultations.models import Consultation


class ModeleDocumentViewSet(viewsets.ModelViewSet):
    """
    Bibliothèque de modèles de documents (Paramètres > Modèles de documents).

    Lecture : tout le personnel authentifié — un modèle est un référentiel
    global de l'établissement, pas une donnée à filtrer par service comme un
    dossier patient. Écriture (créer/modifier/supprimer) : réservée aux
    profils habilités à gérer la bibliothèque (PeutGererModeles).
    """
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

    @action(detail=True, methods=['post'], url_path='generer', permission_classes=[PeutGenererDocument])
    def generer(self, request, pk=None):
        """
        Génère un DocumentGenere à partir de ce modèle pour un patient (et,
        si fourni, une consultation dont les champs alimentent les jetons
        {{consultation.*}}) — le cœur de la fonctionnalité "le médecin clique
        sur un modèle, HealthTracker génère automatiquement le document".
        """
        modele = self.get_object()

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

        emp = get_employe(request.user)
        contenu = modele.rendre(patient=patient, consultation=consultation, medecin=emp)

        document = DocumentGenere.objects.create(
            patient=patient,
            consultation=consultation,
            modele=modele,
            type_document=modele.type_document,
            titre=f"{modele.nom} — {patient.prenom} {patient.nom}",
            contenu=contenu,
            genere_par=emp,
        )
        return Response(DocumentGenereSerializer(document).data, status=status.HTTP_201_CREATED)


class DocumentGenereViewSet(viewsets.ModelViewSet):
    """
    Documents déjà générés pour un patient. Lecture, modification (titre/
    contenu uniquement, ex. compléter une date d'arrêt de travail après coup)
    et suppression — la création reste exclusive à
    ModeleDocumentViewSet.generer(), pour garantir que le contenu initial est
    toujours calculé côté serveur à partir de données réelles.
    """
    serializer_class = DocumentGenereSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'patch', 'delete', 'head', 'options']

    def get_queryset(self):
        qs = DocumentGenere.objects.select_related('patient', 'consultation', 'modele', 'genere_par')
        patient_id = self.request.query_params.get('patient')
        if patient_id:
            qs = qs.filter(patient_id=patient_id)
        consultation_id = self.request.query_params.get('consultation')
        if consultation_id:
            qs = qs.filter(consultation_id=consultation_id)
        return qs

    def _est_auteur_ou_admin(self, instance):
        emp = get_employe(self.request.user)
        est_auteur = emp is not None and instance.genere_par_id == emp.id
        est_admin = self.request.user.is_superuser or (emp is not None and emp.role == 'admin')
        return est_auteur or est_admin

    def perform_update(self, serializer):
        if not self._est_auteur_ou_admin(serializer.instance):
            raise PermissionDenied("Tu ne peux modifier que les documents que tu as toi-même générés.")
        serializer.save()

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if not self._est_auteur_ou_admin(instance):
            return Response(
                {'detail': "Tu ne peux supprimer que les documents que tu as toi-même générés."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().destroy(request, *args, **kwargs)
