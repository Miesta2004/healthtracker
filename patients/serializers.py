from rest_framework import serializers
from .models import Patient


class PatientSerializer(serializers.ModelSerializer):
    age              = serializers.IntegerField(read_only=True)
    service_nom      = serializers.SerializerMethodField()
    medecin_nom      = serializers.SerializerMethodField()

    class Meta:
        model  = Patient
        fields = '__all__'

    def get_service_nom(self, obj):
        return obj.service.nom if obj.service else None

    def get_medecin_nom(self, obj):
        if obj.medecin_referent:
            e = obj.medecin_referent
            return f"Dr {e.prenom} {e.nom}"
        return None


class PatientLaboSerializer(serializers.ModelSerializer):
    """Serializer restreint pour le laborantin — infos minimales uniquement."""
    age = serializers.IntegerField(read_only=True)

    class Meta:
        model  = Patient
        fields = [
            'id', 'nom', 'prenom', 'age', 'sexe',
            'groupe_sanguin', 'allergies', 'numero_dossier',
        ]
        read_only_fields = fields

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