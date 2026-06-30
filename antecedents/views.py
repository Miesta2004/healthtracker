from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import Antecedent
from .serializers import AntecedentSerializer

class AntecedentViewSet(viewsets.ModelViewSet):
    queryset = Antecedent.objects.select_related('patient','consultation_source').all()
    serializer_class = AntecedentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        patient_id = self.request.query_params.get('patient')
        if patient_id:
            queryset = queryset.filter(patient_id=patient_id)
        statut = self.request.query_params.get('statut')
        if statut:
            queryset = queryset.filter(statut=statut)
        return queryset