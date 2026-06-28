from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import Consultation, RendezVous
from .serializers import ConsultSerializer,RdvSerializer

# Create your views here.
class ConsultViewSet(viewsets.ModelViewSet):
    queryset = Consultation.objects.all()
    serializer_class = ConsultSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Consultation.objects.all()
        patient_id = self.request.query_params.get('patient')
        if patient_id:
            queryset = queryset.filter(patient_id=patient_id)
        return queryset

class RdvViewSet(viewsets.ModelViewSet):
    queryset = RendezVous.objects.all()
    serializer_class = RdvSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = RendezVous.objects.all()
        patient_id = self.request.query_params.get('patient')
        if patient_id:
            queryset = queryset.filter(patient_id=patient_id)
        return queryset