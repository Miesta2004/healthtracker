from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import SignesVitaux
from .serializers import SignesSerializer

# Create your views here.
class SignesVitauxViewSet(viewsets.ModelViewSet):
    serializer_class = SignesSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        patient_id = self.kwargs.get('patient_pk')
        if patient_id:
            return SignesVitaux.objects.filter(patient_id=patient_id)
        return SignesVitaux.objects.all()