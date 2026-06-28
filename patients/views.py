from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Patient
from .serializers import PatientSerializer

# Create your views here.
class PatientViewSet(viewsets.ModelViewSet):
    queryset = Patient.objects.all()
    serializer_class = PatientSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=True, methods=['post'], url_path='ajouter_antecedent')
    def ajouter_antecedent(self, request, pk=None):
        """
        Ajoute un antécédent au dossier du patient sans doublon.
        Body attendu : {"antecedent": "Diabète type 2"}
        """
        patient = self.get_object()
        nouvel_antecedent = (request.data.get('antecedent') or '').strip()

        if not nouvel_antecedent:
            return Response({'detail': "Le champ 'antecedent' est requis."}, status=400)

        existants = [
            a.strip() for a in (patient.antecedents or '').split(',') if a.strip()
        ]

        if nouvel_antecedent not in existants:
            existants.append(nouvel_antecedent)
            patient.antecedents = ', '.join(existants)
            patient.save()

        serializer = self.get_serializer(patient)
        return Response(serializer.data)