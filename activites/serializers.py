from rest_framework import serializers
from .models import JournalActivite


class JournalActiviteSerializer(serializers.ModelSerializer):
    employe_nom = serializers.CharField(source='employe.nom', read_only=True, default=None)
    employe_prenom = serializers.CharField(source='employe.prenom', read_only=True, default=None)
    employe_role_label = serializers.CharField(source='employe.get_role_display', read_only=True, default=None)
    service_nom = serializers.CharField(source='service.nom', read_only=True, default=None)
    type_objet_label = serializers.CharField(source='get_type_objet_display', read_only=True)
    action_label = serializers.CharField(source='get_action_display', read_only=True)

    class Meta:
        model = JournalActivite
        fields = [
            'id', 'employe', 'employe_nom', 'employe_prenom', 'employe_role_label',
            'service', 'service_nom',
            'type_objet', 'type_objet_label', 'action', 'action_label',
            'description', 'objet_id', 'date_creation',
        ]