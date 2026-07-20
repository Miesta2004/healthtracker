from rest_framework import serializers
from django.contrib.auth.models import User
from django.utils import timezone
from .models import Employe, HabilitationService, Role
from services.models import Service


class EmployeSerializer(serializers.ModelSerializer):
    username           = serializers.CharField(source='user.username', read_only=True)
    email              = serializers.EmailField(source='user.email', read_only=True)
    role_label         = serializers.CharField(source='get_role_display', read_only=True)
    type_contrat_label = serializers.CharField(source='get_type_contrat_display', read_only=True)
    age                = serializers.IntegerField(read_only=True)
    service_nom        = serializers.CharField(source='service.nom', default=None, read_only=True)
    capacites          = serializers.SerializerMethodField()
    roles_effectifs    = serializers.ListField(read_only=True)

    class Meta:
        model  = Employe
        fields = [
            'id', 'username', 'email',
            'nom', 'prenom', 'date_naissance', 'sexe', 'age',
            'telephone', 'adresse', 'photo_path',
            'role', 'role_label', 'specialite', 'matricule', 'actif', 'est_major',
            'capacites', 'roles_effectifs',
            'service', 'service_nom',
            'type_contrat', 'type_contrat_label',
            'date_debut_contrat', 'date_fin_contrat',
            'description_poste',
            'date_creation',
        ]

    def get_capacites(self, obj):
        """
        Capacités effectives (héritage compris) — le frontend s'appuie
        dessus (hasCapacite) plutôt que de dupliquer CAPACITES_PAR_ROLE/
        HERITE_DE : la logique de mapping reste uniquement côté backend.
        """
        return sorted(obj.capacites)

    def validate(self, data):
        # est_major n'a de sens que pour un infirmier.
        if data.get('est_major'):
            new_role = data.get('role', getattr(self.instance, 'role', None))
            if new_role != 'infirmier':
                raise serializers.ValidationError(
                    {'est_major': "Seul un employé avec le rôle infirmier peut être désigné major."}
                )
        return data

    def update(self, instance, validated_data):
        """
        PATCH partiel — synchronise is_staff si le rôle change vers/depuis admin.
        """
        new_role = validated_data.get('role')
        if new_role is not None and new_role != instance.role:
            instance.user.is_staff = (new_role == 'admin')
            instance.user.save(update_fields=['is_staff'])
            if new_role != 'infirmier' and 'est_major' not in validated_data:
                validated_data['est_major'] = False

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
    role           = serializers.ChoiceField(choices=Role.choices)
    specialite     = serializers.CharField(required=False, allow_blank=True)
    service        = serializers.PrimaryKeyRelatedField(
        queryset=Service.objects.all(), required=False, allow_null=True
    )

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
            service=validated_data.get('service'),
        )
        return employe


class HabilitationServiceSerializer(serializers.ModelSerializer):
    employe_nom    = serializers.CharField(source='employe.nom', read_only=True)
    employe_prenom = serializers.CharField(source='employe.prenom', read_only=True)
    employe_role_label = serializers.CharField(source='employe.get_role_display', read_only=True)
    service_nom    = serializers.CharField(source='service.nom', read_only=True)

    class Meta:
        model = HabilitationService
        fields = [
            'id', 'employe', 'employe_nom', 'employe_prenom', 'employe_role_label',
            'service', 'service_nom',
            'date_debut', 'date_fin', 'actif', 'date_creation',
        ]
        read_only_fields = ['date_creation']

    def validate_employe(self, employe):
        """
        Une habilitation n'a de sens que pour un profil pouvant opérer
        (capacité ACTES_MEDICAUX_GERER) — cf. Operation.chirurgien_principal,
        qui utilise exactement le même filtre. On réutilise la capacité
        plutôt qu'un rôle en dur pour rester cohérent si de nouveaux rôles
        héritant de médecin apparaissent plus tard.
        """
        from .capacites import Capacite
        if not employe.a_la_capacite(Capacite.ACTES_MEDICAUX_GERER):
            raise serializers.ValidationError(
                "Seul un employé pouvant exercer des actes médicaux (médecin ou "
                "rôle en héritant) peut être habilité à opérer dans un service."
            )
        return employe

    def validate(self, data):
        date_debut = data.get('date_debut', getattr(self.instance, 'date_debut', None))
        date_fin = data.get('date_fin', getattr(self.instance, 'date_fin', None))
        if date_debut and date_fin and date_fin < date_debut:
            raise serializers.ValidationError(
                {'date_fin': "La date de fin ne peut pas être antérieure à la date de début."}
            )
        return data