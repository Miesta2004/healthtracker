from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import Alerte
from .serializers import AlerteSerializer

# Create your views here.
class AlerteViewSet(viewsets.ModelViewSet):
    queryset = Alerte.objects.all()
    serializer_class = AlerteSerializer
    permission_classes = [IsAuthenticated]