from rest_framework import serializers
from .models import Consultation, RendezVous


class ConsultSerializer(serializers.ModelSerializer):
    # source= évite le SerializerMethodField + requête séparée
    patient_nom    = serializers.CharField(source='patient.nom', read_only=True)
    patient_prenom = serializers.CharField(source='patient.prenom', read_only=True)
    statut_label   = serializers.CharField(source='get_statut_display', read_only=True)

    class Meta:
        model  = Consultation
        fields = '__all__'


class RdvSerializer(serializers.ModelSerializer):
    patient_nom     = serializers.CharField(source='patient.nom', read_only=True)
    patient_prenom  = serializers.CharField(source='patient.prenom', read_only=True)
    patient_dossier = serializers.CharField(source='patient.numero_dossier', read_only=True)
    statut_label    = serializers.CharField(source='get_statut_display', read_only=True)
    medecin_nom     = serializers.CharField(source='medecin.nom', read_only=True, default=None)
    medecin_prenom  = serializers.CharField(source='medecin.prenom', read_only=True, default=None)

    class Meta:
        model  = RendezVous
        fields = '__all__'

    def validate(self, data):
        medecin    = data.get('medecin', getattr(self.instance, 'medecin', None))
        date_heure = data.get('date_heure', getattr(self.instance, 'date_heure', None))

        if medecin and date_heure:
            conflit = RendezVous.objects.filter(
                medecin=medecin, date_heure=date_heure
            ).exclude(statut='annule')
            if self.instance:
                conflit = conflit.exclude(pk=self.instance.pk)
            if conflit.exists():
                raise serializers.ValidationError(
                    "Ce créneau est déjà réservé pour ce médecin. "
                    "Merci de choisir un autre horaire."
                )
        return data
