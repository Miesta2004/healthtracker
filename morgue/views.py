from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from comptes.permissions import IsMedecinOuAdmin, get_employe
from .models import Deces, Autopsie, StatutDeces
from .serializers import DecesSerializer, AutopsieSerializer
from .permissions import PeutVoirMorgue, PeutValiderAutopsiePerioperatoire
from .services import enregistrer_deces


class DecesViewSet(viewsets.ModelViewSet):
    """
    Enregistrement des décès. Acte médical : création/modification réservées
    à un médecin ou un admin. La création positionne automatiquement
    `Patient.statut_vital = 'decede'` — c'est le seul endroit de l'app qui le
    fait, pour garder une source de vérité unique.
    """
    queryset = Deces.objects.select_related('patient', 'medecin_constatant', 'autopsie')
    serializer_class = DecesSerializer

    def get_permissions(self):
        if self.request.method in ('GET', 'HEAD', 'OPTIONS'):
            return [PeutVoirMorgue()]
        return [IsMedecinOuAdmin()]

    def perform_create(self, serializer):
        emp = get_employe(self.request.user)
        deces = enregistrer_deces(
            patient=serializer.validated_data['patient'],
            date_deces=serializer.validated_data.get('date_deces'),
            lieu_deces=serializer.validated_data.get('lieu_deces'),
            operation_liee=serializer.validated_data.get('operation_liee'),
            necessite_autopsie=serializer.validated_data.get('necessite_autopsie', False),
            cause_presumee=serializer.validated_data.get('cause_presumee', ''),
            medecin_constatant=serializer.validated_data.get('medecin_constatant') or emp,
        )
        serializer.instance = deces

    @action(detail=True, methods=['post'], url_path='remettre-corps')
    def remettre_corps(self, request, pk=None):
        """Enregistre la remise du corps à la famille/au réclamant."""
        deces = self.get_object()
        deces.reclamant_nom = request.data.get('reclamant_nom', deces.reclamant_nom)
        deces.reclamant_lien = request.data.get('reclamant_lien', deces.reclamant_lien)
        deces.reclamant_telephone = request.data.get('reclamant_telephone', deces.reclamant_telephone)
        deces.date_remise_corps = request.data.get('date_remise_corps') or timezone.now()
        deces.statut = StatutDeces.CORPS_REMIS
        deces.save()
        return Response(DecesSerializer(deces).data)


class AutopsieViewSet(viewsets.ModelViewSet):
    """
    Acte d'autopsie, lié à un décès. Réservé aux médecins/admin. La création
    fait automatiquement passer le décès associé au statut 'autopsie_terminee'.

    Cas particulier de la VALIDATION du rapport (`rapport_valide`) : si le
    décès est péri-opératoire (`deces.operation_liee` renseigné), seul le
    Chef de Chirurgie (capacité AUTOPSIE_VALIDER_PERIOP) peut faire passer
    `rapport_valide` à True — n'importe quel médecin/admin le peut sinon,
    comme avant.
    """
    queryset = Autopsie.objects.select_related('deces', 'deces__patient', 'medecin_legiste')
    serializer_class = AutopsieSerializer

    def get_permissions(self):
        if self.request.method in ('GET', 'HEAD', 'OPTIONS'):
            return [PeutVoirMorgue()]
        return [IsMedecinOuAdmin()]

    def perform_update(self, serializer):
        instance = self.get_object()
        validation_demandee = (
                serializer.validated_data.get('rapport_valide') is True
                and not instance.rapport_valide
        )

        if validation_demandee and instance.deces.operation_liee_id:
            if not PeutValiderAutopsiePerioperatoire().has_permission(self.request, self):
                raise PermissionDenied(
                    "Ce décès est lié à une opération : seul le Chef de Chirurgie "
                    "peut valider ce rapport d'autopsie."
                )

        if validation_demandee:
            serializer.save(date_validation=timezone.now())
        else:
            serializer.save()

    def perform_create(self, serializer):
        autopsie = serializer.save()
        deces = autopsie.deces
        deces.statut = StatutDeces.AUTOPSIE_TERMINEE
        deces.save(update_fields=['statut'])