from django.db import models
from django.contrib.auth.models import User
from patients.models import Personne

class Role(models.TextChoices):
    ADMIN          = 'admin',          'Administrateur'
    MEDECIN        = 'medecin',        'Médecin'
    INFIRMIER      = 'infirmier',      'Infirmier(ère)'
    SECRETAIRE     = 'secretaire',     'Secrétaire'
    LABORANTIN     = 'laborantin',     'Laborantin'
    CHEF_CHIRURGIE = 'chef_chirurgie', 'Chef de Chirurgie'

class TypeContrat(models.TextChoices):
    CDI       = 'cdi',       'CDI'
    CDD       = 'cdd',       'CDD'
    STAGE     = 'stage',     'Stage'
    VACATION  = 'vacation',  'Vacation'
    BENEVOLAT = 'benevolat', 'Bénévolat'


class Specialite(models.Model):
    """
    Référentiel des spécialités médicales. Remplace progressivement le champ
    texte libre Employe.specialite_libre — permet des requêtes fiables
    (ex. "tous les chirurgiens cardiaques") impossibles à faire correctement
    sur un simple CharField non structuré.
    """
    nom = models.CharField(max_length=100, unique=True)
    est_chirurgicale = models.BooleanField(
        default=False,
        help_text="Coché si cette spécialité pratique des actes chirurgicaux "
                  "(conditionne l'affichage dans les listes de chirurgiens)."
    )

    class Meta:
        ordering = ['nom']
        verbose_name = "Spécialité"
        verbose_name_plural = "Spécialités"

    def __str__(self):
        return self.nom


class Employe(Personne):
    user = models.OneToOneField(
        User, on_delete=models.CASCADE,
        related_name='employe'
    )
    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.INFIRMIER
    )
    specialite  = models.CharField(max_length=100, blank=True)
    specialite_principale = models.ForeignKey(
        Specialite, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='employes',
        help_text="Version structurée de `specialite` (texte libre, conservé "
                  "pour compatibilité). À terme, migrer les valeurs de "
                  "`specialite` vers ce champ puis déprécier l'ancien."
    )
    matricule   = models.CharField(max_length=20, unique=True, blank=True)
    actif       = models.BooleanField(default=True)
    service    = models.ForeignKey(
        'services.Service',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='employes'
    )

    # ── Contrat de travail ──────────────────────────────────────────────────
    type_contrat        = models.CharField(
        max_length=20,
        choices=TypeContrat.choices,
        blank=True, default=''
    )
    date_debut_contrat  = models.DateField(null=True, blank=True)
    date_fin_contrat    = models.DateField(null=True, blank=True)   # null = CDI sans limite
    description_poste   = models.TextField(blank=True)              # résumé des missions

    # ── Profil & Settings ───────────────────────────────────────────────────
    signature_medicale = models.TextField(
        blank=True,
        help_text="Texte affiché en bas des ordonnances et comptes rendus"
    )
    preferences = models.JSONField(
        default=dict,
        blank=True,
        help_text="Préférences utilisateur stockées en JSON"
    )
    est_major = models.BooleanField(
        default=False,
        help_text=(
            "Infirmier(ère) major — responsable de l'organisation des soins "
            "infirmiers de son service (assignation des patients, planning "
            "et congés des infirmiers). Uniquement pertinent si role='infirmier'."
        )
    )

    def save(self, *args, **kwargs):
        # Même correctif que Patient.numero_dossier : vérification d'unicité
        # en base avec retry avant assignation, plutôt qu'un tirage aléatoire
        # à l'aveugle qui pouvait produire un doublon.
        if not self.matricule:
            from healthtracker.identifiers import generer_identifiant_unique
            self.matricule = generer_identifiant_unique(Employe, 'matricule', 'E', 5)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.prenom} {self.nom} — {self.get_role_display()}"

    @property
    def capacites(self) -> set:
        from .capacites import capacites_du_role
        return capacites_du_role(self.role)

    @property
    def roles_effectifs(self) -> list:
        from .capacites import roles_effectifs
        return roles_effectifs(self.role)

    def a_la_capacite(self, capacite: str) -> bool:
        return capacite in self.capacites

    class Meta:
        verbose_name = "Employé"
        verbose_name_plural = "Employés"
        ordering = ['role', 'nom', 'prenom']
        constraints = [
            models.CheckConstraint(
                condition=models.Q(role__in=[r.value for r in Role]),
                name='employe_role_valid',
            ),
            models.CheckConstraint(
                condition=models.Q(sexe__in=['M', 'F']),
                name='employe_sexe_valid',  # ou 'patient_sexe_valid'
            ),
            models.CheckConstraint(
                condition=models.Q(est_major=False) | models.Q(role='infirmier'),
                name='employe_est_major_seulement_infirmier',
            )
        ]


class HabilitationService(models.Model):
    """
    Autorise un employé (typiquement un chirurgien) à intervenir dans un
    service qui n'est PAS son service de rattachement principal
    (Employe.service), sans modifier ce dernier — qui reste la référence
    pour tout le scoping de permissions existant (PatientViewSet,
    SignesVitauxViewSet, etc.).

    Utilisée uniquement pour élargir, au cas par cas, la liste des
    chirurgiens éligibles à opérer dans un service donné (voir
    Operation.clean() dans l'app `chirurgie`).
    """
    employe = models.ForeignKey(
        Employe, on_delete=models.CASCADE,
        related_name='habilitations_services'
    )
    service = models.ForeignKey(
        'services.Service', on_delete=models.CASCADE,
        related_name='chirurgiens_habilites'
    )
    date_debut = models.DateField(null=True, blank=True)
    date_fin = models.DateField(null=True, blank=True)  # null = sans limite dans le temps
    actif = models.BooleanField(default=True)
    date_creation = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('employe', 'service')
        verbose_name = "Habilitation à opérer dans un service"
        verbose_name_plural = "Habilitations à opérer dans un service"

    def __str__(self):
        return f"{self.employe} → {self.service}"


class Rappel(models.Model):
    """
    Pense-bête personnel et simple (pas un événement de calendrier : pas
    d'heure, pas de patient/médecin associé) — affiché à la fois sur le
    Dashboard et dans la colonne latérale du module Calendrier, sur la même
    source de données.
    """
    employe = models.ForeignKey(
        Employe, on_delete=models.CASCADE,
        related_name='rappels'
    )
    texte = models.CharField(max_length=255)
    fait = models.BooleanField(default=False)
    date_echeance = models.DateField(
        null=True, blank=True,
        help_text="Optionnel — date à laquelle le rappel doit être traité."
    )
    date_creation = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['fait', 'date_echeance', '-date_creation']
        verbose_name = "Rappel"
        verbose_name_plural = "Rappels"

    def __str__(self):
        return self.texte