from rest_framework import serializers
from .models import Service


class ServiceSerializer(serializers.ModelSerializer):
    chef_nom = serializers.SerializerMethodField()
    nb_patients  = serializers.SerializerMethodField()
    nb_employes  = serializers.SerializerMethodField()

    class Meta:
        model  = Service
        fields = [
            'id', 'nom', 'description', 'actif',
            'chef_de_service', 'chef_nom',
            'nb_patients', 'nb_employes',
            'date_creation',
        ]

    def get_chef_nom(self, obj):
        if obj.chef_de_service:
            e = obj.chef_de_service
            return f"{e.prenom} {e.nom}"
        return None

    def get_nb_patients(self, obj):
        return obj.patients.filter(actif=True).count()

    def get_nb_employes(self, obj):
        return obj.employes.filter(actif=True).count()