from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import Consultation, RendezVous
from .serializers import ConsultSerializer,RdvSerializer

# Create your views here.
class ConsultViewSet(viewsets.ModelViewSet):
    queryset = Consultation.objects.all()
    serializer_class = ConsultSerializer
    permission_classes = [IsAuthenticated]

class RdvViewSet(viewsets.ModelViewSet):
    queryset = RendezVous.objects.all()
    serializer_class = RdvSerializer
    permission_classes = [IsAuthenticated]
