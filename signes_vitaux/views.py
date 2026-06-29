from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated , SAFE_METHODS
from comptes.permissions import IsMedecinOuInfirmier,IsAdminRole,IsLectureAutorisee
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

    def get_permissions(self):
        if self.request.method in SAFE_METHODS:
            # GET, HEAD, OPTIONS → médecin, infirmier, laborantin, admin
            return [IsLectureAutorisee()]
        if self.action == 'destroy':
            # DELETE → admin uniquement
            return [IsAdminRole()]
        # POST, PUT, PATCH → médecin ou infirmier
        return [IsMedecinOuInfirmier()]
