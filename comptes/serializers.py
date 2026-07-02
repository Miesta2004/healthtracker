from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Employe


class EmployeSerializer(serializers.ModelSerializer):
    username           = serializers.CharField(source='user.username', read_only=True)
    email              = serializers.EmailField(source='user.email', read_only=True)
    role_label         = serializers.CharField(source='get_role_display', read_only=True)
    type_contrat_label = serializers.CharField(source='get_type_contrat_display', read_only=True)
    age                = serializers.IntegerField(read_only=True)
    service_nom        = serializers.CharField(source='service.nom', default=None, read_only=True)

    class Meta:
        model  = Employe
        fields = [
            'id', 'username', 'email',
            'nom', 'prenom', 'date_naissance', 'sexe', 'age',
            'telephone', 'adresse', 'photo_path',
            'role', 'role_label', 'specialite', 'matricule', 'actif',
            'service', 'service_nom',
            'type_contrat', 'type_contrat_label',
            'date_debut_contrat', 'date_fin_contrat',
            'description_poste',
            'date_creation',
        ]

    def update(self, instance, validated_data):
        """
        PATCH partiel — synchronise is_staff si le rôle change vers/depuis admin.
        """
        new_role = validated_data.get('role')
        if new_role is not None and new_role != instance.role:
            instance.user.is_staff = (new_role == 'admin')
            instance.user.save(update_fields=['is_staff'])

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance


class CreateEmployeSerializer(serializers.Serializer):
    nom            = serializers.CharField()
    prenom         = serializers.CharField()
    date_naissance = serializers.DateField()
    sexe           = serializers.ChoiceField(choices=['M', 'F'])
    telephone      = serializers.CharField(required=True, allow_blank=False)
    adresse        = serializers.CharField(required=True, allow_blank=False)
    username       = serializers.CharField()
    email          = serializers.EmailField()
    password       = serializers.CharField(write_only=True)
    role           = serializers.ChoiceField(
        choices=['admin', 'medecin', 'infirmier', 'secretaire', 'laborantin']
    )
    specialite     = serializers.CharField(required=False, allow_blank=True)

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("Ce nom d'utilisateur existe déjà")
        return value

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data['prenom'],
            last_name=validated_data['nom'],
            is_staff=validated_data['role'] == 'admin',
        )
        employe = Employe.objects.create(
            user=user,
            nom=validated_data['nom'],
            prenom=validated_data['prenom'],
            date_naissance=validated_data['date_naissance'],
            sexe=validated_data['sexe'],
            telephone=validated_data.get('telephone', ''),
            adresse=validated_data.get('adresse', ''),
            role=validated_data['role'],
            specialite=validated_data.get('specialite', ''),
        )
        return employe
