from rest_framework import serializers
from .models import SignesVitaux

class SignesSerializer(serializers.ModelSerializer):
    class Meta:
        model = SignesVitaux
        fields = '__all__'
