from rest_framework import serializers
from .models import SalleBloc, Operation


class SalleBlocSerializer(serializers.ModelSerializer):
    service_nom = serializers.CharField(source='service.nom', read_only=True)

    class Meta:
        model = SalleBloc
        fields = ['id', 'nom', 'service', 'service_nom', 'actif']


class OperationSerializer(serializers.ModelSerializer):
    patient_nom          = serializers.CharField(source='patient.nom', read_only=True)
    patient_prenom       = serializers.CharField(source='patient.prenom', read_only=True)
    service_chirurgie_nom = serializers.CharField(source='service_chirurgie.nom', read_only=True)
    salle_nom             = serializers.CharField(source='salle.nom', default=None, read_only=True)
    chirurgien_nom        = serializers.CharField(source='chirurgien_principal.nom', read_only=True)
    chirurgien_prenom     = serializers.CharField(source='chirurgien_principal.prenom', read_only=True)
    statut_label           = serializers.CharField(source='get_statut_display', read_only=True)

    class Meta:
        model = Operation
        fields = [
            'id', 'patient', 'patient_nom', 'patient_prenom',
            'consultation_indication', 'hospitalisation',
            'service_chirurgie', 'service_chirurgie_nom',
            'salle', 'salle_nom',
            'chirurgien_principal', 'chirurgien_nom', 'chirurgien_prenom', 'equipe',
            'type_intervention', 'date_heure_prevue', 'duree_estimee_min',
            'date_debut_reelle', 'date_fin_reelle',
            'statut', 'statut_label',
            'compte_rendu_operatoire', 'complications',
            'date_creation', 'date_modification',
        ]
        read_only_fields = ['date_creation', 'date_modification']

    def validate(self, data):
        """
        Réutilise Operation.clean() (habilitation du chirurgien + absence de
        chevauchement de salle) — DRF n'appelle pas automatiquement les
        validateurs de modèle Django, donc on construit une instance
        temporaire pour forcer cette vérification avant l'écriture en base.
        """
        instance = Operation(**{
            **{k: v for k, v in data.items() if k != 'equipe'},
            'pk': self.instance.pk if self.instance else None,
        })
        try:
            instance.clean()
        except Exception as exc:
            raise serializers.ValidationError(getattr(exc, 'message', str(exc)))
        return data
