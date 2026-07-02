from rest_framework import serializers
from .models import Patient


class PatientListSerializer(serializers.ModelSerializer):
    """Serializer léger pour la liste — champs minimaux, pas de SerializerMethodField lourd."""
    age         = serializers.IntegerField(read_only=True)
    service_nom = serializers.CharField(source='service.nom', default=None, read_only=True)

    class Meta:
        model  = Patient
        fields = [
            'id', 'nom', 'prenom', 'age', 'sexe', 'telephone',
            'groupe_sanguin', 'allergies', 'antecedents', 'actif',
            'numero_dossier', 'date_creation', 'service_nom',
        ]


class PatientSerializer(serializers.ModelSerializer):
    """Serializer complet pour le détail d'un patient."""
    age         = serializers.IntegerField(read_only=True)
    service_nom = serializers.SerializerMethodField()
    medecin_nom = serializers.SerializerMethodField()

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
