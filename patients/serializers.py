from rest_framework import serializers
from .models import Patient

class PatientSerializer(serializers.ModelSerializer):
    class Meta:
        model = Patient
        fields = '__all__'


#Python → JSON (quand tu réponds à une requête GET)
# Objet Patient(nom="Gueye", prenom="Saby")
# ↓ serializer
# {"nom": "Gueye", "prenom": "Saby"}
# JSON → Python (quand tu reçois une requête POST)
# {"nom": "Diop", "prenom": "Fatou", "date_naissance": "2000-01-01"}
# ↓ serializer
# Objet Patient → sauvegardé en base
# fields = '__all__' expose tous les champs.
# En production on liste les champs explicitement pour ne pas exposer des données sensibles par accident.