from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import SignesVitaux
from .serializers import SignesSerializer

# Create your views here.
class SignesViewSet(viewsets.ModelViewSet):
    queryset = SignesVitaux.objects.all()
    serializer_class = SignesSerializer
    permission_classes = [IsAuthenticated]