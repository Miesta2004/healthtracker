from rest_framework import serializers
from .models import SalleBloc, InterventionChirurgicale


class SalleBlocSerializer(serializers.ModelSerializer):
    service_nom = serializers.CharField(source='service.nom', read_only=True)
    statut_label = serializers.CharField(source='get_statut_display', read_only=True)

    class Meta:
        model = SalleBloc
        fields = ['id', 'nom', 'service', 'service_nom', 'statut', 'statut_label']


class InterventionChirurgicaleSerializer(serializers.ModelSerializer):
    patient_nom            = serializers.CharField(source='patient.nom', read_only=True)
    patient_prenom         = serializers.CharField(source='patient.prenom', read_only=True)
    patient_age            = serializers.IntegerField(source='patient.age', read_only=True)
    patient_sexe           = serializers.CharField(source='patient.sexe', read_only=True)
    patient_numero_dossier = serializers.CharField(source='patient.numero_dossier', read_only=True)
    service_chirurgie_nom  = serializers.CharField(source='service_chirurgie.nom', read_only=True)
    salle_nom              = serializers.CharField(source='salle.nom', default=None, read_only=True)
    chirurgien_nom         = serializers.CharField(source='chirurgien_principal.nom', read_only=True)
    chirurgien_prenom      = serializers.CharField(source='chirurgien_principal.prenom', read_only=True)
    statut_label           = serializers.CharField(source='get_statut_display', read_only=True)
    equipe_detail          = serializers.SerializerMethodField()

    class Meta:
        model = InterventionChirurgicale
        fields = [
            'id', 'patient', 'patient_nom', 'patient_prenom',
            'patient_age', 'patient_sexe', 'patient_numero_dossier',
            'consultation_indication', 'hospitalisation',
            'service_chirurgie', 'service_chirurgie_nom',
            'salle', 'salle_nom',
            'chirurgien_principal', 'chirurgien_nom', 'chirurgien_prenom',
            'equipe', 'equipe_detail',
            'type_acte', 'heure_debut', 'heure_fin',
            'date_debut_reelle', 'date_fin_reelle',
            'statut', 'statut_label',
            'compte_rendu_operatoire', 'complications',
            'date_creation', 'date_modification',
        ]
        read_only_fields = ['date_creation', 'date_modification']

    def get_equipe_detail(self, obj):
        """
        Détail nom/rôle de chaque membre de l'équipe pour l'affichage du
        panneau de détail — cf. commentaire sur `equipe` dans models.py : le
        rôle affiché vient de `specialite_principale` (référentiel qui
        couvre anesthésiste, infirmier de bloc, etc.), pas d'un modèle de
        rattachement dédié.
        """
        return [
            {
                'id': membre.id,
                'nom': membre.nom,
                'prenom': membre.prenom,
                'role': membre.role,
                'role_label': membre.get_role_display(),
                'specialite_principale_nom': membre.get_specialite_principale_display() if membre.specialite_principale else None,
            }
            for membre in obj.equipe.all()
        ]

    def validate(self, data):
        """
        Réutilise InterventionChirurgicale.clean() (chevauchement d'horaires,
        chevauchement de salle, habilitation du chirurgien) — DRF n'appelle
        pas automatiquement les validateurs de modèle Django, donc on
        construit une instance temporaire pour forcer cette vérification
        avant l'écriture en base.

        Important en mise à jour partielle (PATCH — ex. glisser-déposer dans
        le planning, qui n'envoie que `salle` + une heure) : on part de
        l'état actuel en base et on superpose seulement les champs modifiés,
        sinon `clean()` reçoit `chirurgien_principal=None`/`heure_fin=None`
        pour tout champ absent de la requête et saute silencieusement ses
        vérifications (elles sont gardées par `if self.champ_id and ...`).
        """
        if self.instance:
            champs = [f.name for f in InterventionChirurgicale._meta.fields]
            valeurs = {champ: getattr(self.instance, champ, None) for champ in champs}
            valeurs.update({k: v for k, v in data.items() if k != 'equipe'})
            instance = InterventionChirurgicale(**valeurs)
        else:
            instance = InterventionChirurgicale(**{k: v for k, v in data.items() if k != 'equipe'})
        try:
            instance.clean()
        except Exception as exc:
            raise serializers.ValidationError(getattr(exc, 'message', str(exc)))
        return data
