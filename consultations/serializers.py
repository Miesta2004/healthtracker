from rest_framework import serializers
from .models import Consultation, RendezVous


class ConsultSerializer(serializers.ModelSerializer):
    class Meta:
        model = Consultation
        fields = '__all__'

class RdvSerializer(serializers.ModelSerializer):
    class Meta:
        model = RendezVous
        fields = '__all__'