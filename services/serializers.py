from rest_framework import serializers
from .models import Service


class ServiceSerializer(serializers.ModelSerializer):
    chef_nom    = serializers.CharField(source='chef_de_service.nom', default=None, read_only=True)
    nb_patients = serializers.IntegerField(read_only=True, default=0)
    nb_employes = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model  = Service
        fields = [
            'id', 'nom', 'description', 'actif',
            'chef_de_service', 'chef_nom',
            'nb_patients', 'nb_employes',
            'date_creation',
        ]
