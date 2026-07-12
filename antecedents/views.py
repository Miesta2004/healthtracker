from rest_framework import viewsets
from .models import Antecedent
from .serializers import AntecedentSerializer
from comptes.permissions import IsMedecinOuInfirmier

class AntecedentViewSet(viewsets.ModelViewSet):
    queryset = Antecedent.objects.select_related('patient','consultation_source').all()
    serializer_class = AntecedentSerializer
    # Antécédents médicaux : réservés à l'équipe clinique (admin, médecin, infirmier).
    # La secrétaire et le laborantin n'y ont pas accès — cohérent avec la restriction
    # déjà appliquée côté frontend (PatientDetail > AntecedentsPanel).
    permission_classes = [IsMedecinOuInfirmier]

    def get_queryset(self):
        queryset = super().get_queryset()
        patient_id = self.request.query_params.get('patient')
        if patient_id:
            queryset = queryset.filter(patient_id=patient_id)
        statut = self.request.query_params.get('statut')
        if statut:
            queryset = queryset.filter(statut=statut)
        return queryset