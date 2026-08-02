import calendar
from datetime import timedelta
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import models

from patients.models import Patient


# ─── Choices ─────────────────────────────────────────────────────────────────

class StatutFacture(models.TextChoices):
    BROUILLON            = 'brouillon',            'Brouillon'
    OUVERTE              = 'ouverte',               'Ouverte (séjour en cours)'
    EN_ATTENTE           = 'en_attente',            'En attente de paiement'
    PAYEE_PARTIELLEMENT  = 'payee_partiellement',   'Payée partiellement'
    PAYEE                = 'payee',                 'Payée'
    ANNULEE              = 'annulee',               'Annulée'


class TypeActe(models.TextChoices):
    CONSULTATION        = 'consultation',        'Consultation'
    HOSPITALISATION     = 'hospitalisation',     'Hospitalisation (nuitée)'
    EXAMEN_LABORATOIRE  = 'examen_laboratoire',  'Examen de laboratoire'
    ACTE_CHIRURGICAL    = 'acte_chirurgical',    'Acte chirurgical'
    MEDICAMENT          = 'medicament',          'Médicament / Pharmacie'
    AUTRE               = 'autre',               'Autre'


class StatutValidationAssurance(models.TextChoices):
    NON_SOUMIS      = 'non_soumis',      'Non soumis'
    SOUMIS          = 'soumis',          "Soumis à l'assurance"
    VALIDE          = 'valide',          "Validé par l'assurance"
    REJETE_PARTIEL  = 'rejete_partiel',  'Rejeté partiellement'
    REJETE          = 'rejete',          'Rejeté'


class ModePaiement(models.TextChoices):
    ESPECES                    = 'especes',                    'Espèces'
    CARTE_BANCAIRE              = 'carte_bancaire',              'Carte bancaire'
    MOBILE_MONEY                = 'mobile_money',                'Mobile Money'
    VIREMENT                    = 'virement',                    'Virement'
    PRISE_EN_CHARGE_ASSURANCE   = 'prise_en_charge_assurance',   'Prise en charge assurance'


class OperateurMobileMoney(models.TextChoices):
    WAVE          = 'wave',          'Wave'
    ORANGE_MONEY  = 'orange_money',  'Orange Money'
    FREE_MONEY    = 'free_money',    'Free Money'
    AUTRE         = 'autre',         'Autre'


class PeriodiciteEcheance(models.TextChoices):
    HEBDOMADAIRE  = 'hebdomadaire',  'Hebdomadaire'
    MENSUELLE     = 'mensuelle',     'Mensuelle'
    BIMENSUELLE   = 'bimensuelle',   'Bimensuelle'


class StatutEcheancier(models.TextChoices):
    ACTIF      = 'actif',      'Actif'
    SOLDE      = 'solde',      'Soldé'
    EN_DEFAUT  = 'en_defaut',  'En défaut'
    ANNULE     = 'annule',     'Annulé'


class StatutEcheance(models.TextChoices):
    A_VENIR    = 'a_venir',    'À venir'
    PAYEE      = 'payee',      'Payée'
    EN_RETARD  = 'en_retard',  'En retard'
    IMPAYEE    = 'impayee',    'Impayée'  # jamais posé automatiquement — escalade manuelle après échec de recouvrement, voir Echeance.recalculer_statut()


# ─── Facture ─────────────────────────────────────────────────────────────────

class Facture(models.Model):
    """
    En-tête de facture. Les 5 montants agrégés (montant_total,
    montant_part_assurance, montant_part_patient, montant_paye,
    montant_restant) sont TOUJOURS recalculés par recalculer_montants() —
    jamais saisis à la main ni exposés en écriture côté serializer — pour
    rester l'unique source de vérité consommée par le frontend (cf.
    interface Facture dans frontend/src/types/facturation.ts).

    Séparation des tâches (cf. comptes/capacites.py) : FACTURATION_GERER
    donne le droit de créer/modifier Facture/LigneFacture/EcheancierPaiement.
    PAIEMENTS_ENCAISSER donne le droit de créer un Paiement ET la lecture de
    Facture (mais aucune écriture sur ce modèle) — appliqué au niveau des
    permissions DRF, pas ici.
    """

    numero_facture = models.CharField(max_length=20, unique=True, blank=True)

    patient = models.ForeignKey(
        Patient, on_delete=models.PROTECT, related_name='factures',
        help_text="PROTECT plutôt que CASCADE : on ne supprime jamais une "
                  "facture par ricochet en supprimant un patient — c'est une "
                  "pièce comptable, pas un simple historique médical.",
    )
    service = models.ForeignKey(
        'services.Service', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='factures',
    )
    # Facture "vivante" pendant un séjour — renseigné uniquement si
    # statut == OUVERTE. Voir Hospitalisation.sortie() (views.py) pour la
    # clôture automatique (passage à EN_ATTENTE) quand le patient sort.
    hospitalisation = models.ForeignKey(
        'hospitalisations.Hospitalisation', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='factures',
    )

    statut = models.CharField(
        max_length=20, choices=StatutFacture.choices, default=StatutFacture.BROUILLON,
    )

    date_emission = models.DateTimeField(auto_now_add=True)
    date_echeance = models.DateTimeField(null=True, blank=True)

    # Ventilation assurance / tiers payant — repris de Patient.mutuelle par
    # défaut à la création (voir save()), modifiable ensuite sur la facture
    # sans toucher au dossier patient (une mutuelle peut changer entre deux
    # séjours, l'historique de facturation ne doit pas être réécrit).
    mutuelle_nom    = models.CharField(max_length=150, blank=True)
    numero_mutuelle = models.CharField(max_length=50, blank=True)
    part_assurance_pourcentage_defaut = models.DecimalField(
        max_digits=5, decimal_places=2, default=0,
        help_text="Taux appliqué par défaut aux lignes sans taux propre "
                  "(LigneFacture.taux_prise_en_charge_assurance) — 0 si "
                  "patient non couvert. Le taux réel appliqué varie PAR "
                  "LIGNE (ex: 80% consultation, 50% pharmacie).",
    )

    # Montants agrégés — colonnes dénormalisées, mises à jour uniquement par
    # recalculer_montants(). Pas de champ correspondant en écriture côté
    # FactureSerializer.
    montant_total           = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    montant_part_assurance   = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    montant_part_patient     = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    montant_paye             = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    montant_restant          = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    notes = models.TextField(blank=True)

    date_creation     = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)

    cree_par = models.ForeignKey(
        'comptes.Employe', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='factures_creees',
    )

    def save(self, *args, **kwargs):
        if not self.numero_facture:
            from healthtracker.identifiers import generer_identifiant_unique
            self.numero_facture = generer_identifiant_unique(Facture, 'numero_facture', 'FAC', 8)

        # Reprend la couverture du patient par défaut, UNIQUEMENT à la
        # création (une facture existante ne doit pas être réécrite si le
        # patient change de mutuelle après coup).
        if self._state.adding and not self.mutuelle_nom and self.patient_id:
            self.mutuelle_nom    = self.patient.mutuelle
            self.numero_mutuelle = self.patient.numero_mutuelle

        super().save(*args, **kwargs)

    def recalculer_montants(self):
        """
        Recalcule les 5 montants agrégés à partir des lignes et paiements
        actuels. Appelé par LigneFacture.save()/delete() et Paiement.save()/
        delete() — jamais directement par une vue ou le frontend.
        """
        lignes = list(self.lignes.all())
        self.montant_total          = sum((l.montant_ligne for l in lignes), Decimal('0'))
        self.montant_part_assurance = sum((l.montant_part_assurance_ligne for l in lignes), Decimal('0'))
        self.montant_part_patient   = sum((l.montant_part_patient_ligne for l in lignes), Decimal('0'))
        self.montant_paye           = sum((p.montant for p in self.paiements.all()), Decimal('0'))
        self.montant_restant        = max(self.montant_part_patient - self.montant_paye, Decimal('0'))

        # Statut dérivé automatiquement du paiement — jamais si la facture
        # est encore ouverte (séjour en cours), un brouillon (pas encore
        # validée) ou annulée (ne doit plus bouger).
        if self.statut not in (StatutFacture.OUVERTE, StatutFacture.BROUILLON, StatutFacture.ANNULEE):
            if self.montant_part_patient > 0 and self.montant_restant <= 0:
                self.statut = StatutFacture.PAYEE
            elif self.montant_paye > 0:
                self.statut = StatutFacture.PAYEE_PARTIELLEMENT
            else:
                self.statut = StatutFacture.EN_ATTENTE

        super(Facture, self).save(update_fields=[
            'montant_total', 'montant_part_assurance', 'montant_part_patient',
            'montant_paye', 'montant_restant', 'statut',
        ])

    def __str__(self):
        return f"Facture {self.numero_facture} — {self.patient}"

    class Meta:
        verbose_name = "Facture"
        verbose_name_plural = "Factures"
        ordering = ['-date_emission']
        constraints = [
            models.CheckConstraint(
                condition=models.Q(part_assurance_pourcentage_defaut__gte=0)
                          & models.Q(part_assurance_pourcentage_defaut__lte=100),
                name='facture_taux_assurance_defaut_valide',
            ),
        ]


# ─── LigneFacture ────────────────────────────────────────────────────────────

class LigneFacture(models.Model):
    """
    Une ligne = un acte facturé. Le montant et la ventilation assurance sont
    calculés à CHAQUE save() — jamais confiés au frontend, qui n'envoie que
    quantite / prix_unitaire / taux_prise_en_charge_assurance (voir
    NouvelleLigneFacturePayload côté TS).
    """

    facture = models.ForeignKey(Facture, on_delete=models.CASCADE, related_name='lignes')

    type_acte    = models.CharField(max_length=20, choices=TypeActe.choices)
    description  = models.CharField(max_length=255)
    code_acte    = models.CharField(max_length=30, blank=True)

    # Lien optionnel vers la source de l'acte — un seul rempli selon
    # type_acte. Sert à la traçabilité et, plus tard, à empêcher la
    # double-facturation d'un même acte (contrainte à ajouter au niveau vue).
    consultation     = models.ForeignKey('consultations.Consultation', on_delete=models.SET_NULL, null=True, blank=True, related_name='lignes_facture')
    hospitalisation  = models.ForeignKey('hospitalisations.Hospitalisation', on_delete=models.SET_NULL, null=True, blank=True, related_name='lignes_facture')
    demande_analyse  = models.ForeignKey('analyses.DemandeAnalyse', on_delete=models.SET_NULL, null=True, blank=True, related_name='lignes_facture')

    quantite       = models.DecimalField(max_digits=8, decimal_places=2, default=1)
    prix_unitaire  = models.DecimalField(max_digits=12, decimal_places=2)
    montant_ligne  = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    # Taux PAR LIGNE — null = hérite de Facture.part_assurance_pourcentage_defaut.
    # Volontairement distinct de 0 (0 = explicitement "non couvert pour cet
    # acte précis", ex: un dépassement d'honoraires non remboursable).
    taux_prise_en_charge_assurance = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    montant_part_assurance_ligne   = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    montant_part_patient_ligne     = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    statut_assurance = models.CharField(
        max_length=20, choices=StatutValidationAssurance.choices,
        default=StatutValidationAssurance.NON_SOUMIS,
    )
    motif_rejet = models.TextField(blank=True)
    date_soumission_assurance = models.DateTimeField(null=True, blank=True)
    date_reponse_assurance    = models.DateTimeField(null=True, blank=True)

    date_acte = models.DateTimeField()
    notes = models.TextField(blank=True)

    def save(self, *args, **kwargs):
        self.montant_ligne = (self.quantite * self.prix_unitaire).quantize(Decimal('0.01'))

        taux = self.taux_prise_en_charge_assurance
        if taux is None:
            taux = self.facture.part_assurance_pourcentage_defaut
        self.montant_part_assurance_ligne = (self.montant_ligne * taux / 100).quantize(Decimal('0.01'))
        self.montant_part_patient_ligne   = self.montant_ligne - self.montant_part_assurance_ligne

        super().save(*args, **kwargs)
        self.facture.recalculer_montants()

    def delete(self, *args, **kwargs):
        facture = self.facture
        super().delete(*args, **kwargs)
        facture.recalculer_montants()

    def __str__(self):
        return f"{self.get_type_acte_display()} — {self.description} ({self.montant_ligne})"

    class Meta:
        verbose_name = "Ligne de facture"
        verbose_name_plural = "Lignes de facture"
        ordering = ['date_acte']
        constraints = [
            models.CheckConstraint(condition=models.Q(quantite__gt=0), name='ligne_facture_quantite_positive'),
            models.CheckConstraint(
                condition=models.Q(taux_prise_en_charge_assurance__isnull=True)
                          | (models.Q(taux_prise_en_charge_assurance__gte=0) & models.Q(taux_prise_en_charge_assurance__lte=100)),
                name='ligne_facture_taux_valide',
            ),
        ]


# ─── Paiement ────────────────────────────────────────────────────────────────

class Paiement(models.Model):
    """
    Un encaissement, potentiellement partiel. Réservé au rôle 'caissier' (+
    'admin') côté permissions — cf. Capacite.PAIEMENTS_ENCAISSER. Ne modifie
    jamais Facture/LigneFacture directement : ne touche qu'aux montants
    dénormalisés via recalculer_montants().
    """

    facture  = models.ForeignKey(Facture, on_delete=models.CASCADE, related_name='paiements')
    echeance = models.ForeignKey(
        'Echeance', on_delete=models.SET_NULL, null=True, blank=True, related_name='paiements',
        help_text="Renseigné si ce paiement règle une échéance précise d'un EcheancierPaiement.",
    )

    montant = models.DecimalField(max_digits=12, decimal_places=2)
    mode_paiement = models.CharField(max_length=30, choices=ModePaiement.choices)
    operateur_mobile_money = models.CharField(max_length=20, choices=OperateurMobileMoney.choices, blank=True)
    reference_transaction  = models.CharField(max_length=100, blank=True)

    date_paiement = models.DateTimeField(auto_now_add=True)
    encaisse_par = models.ForeignKey(
        'comptes.Employe', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='paiements_encaisses',
    )

    notes = models.TextField(blank=True)

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        self.facture.recalculer_montants()
        if self.echeance_id:
            self.echeance.recalculer_statut()

    def delete(self, *args, **kwargs):
        facture, echeance = self.facture, self.echeance
        super().delete(*args, **kwargs)
        facture.recalculer_montants()
        if echeance:
            echeance.recalculer_statut()

    def __str__(self):
        return f"Paiement {self.montant} — {self.get_mode_paiement_display()} ({self.facture.numero_facture})"

    class Meta:
        verbose_name = "Paiement"
        verbose_name_plural = "Paiements"
        ordering = ['-date_paiement']
        constraints = [
            models.CheckConstraint(condition=models.Q(montant__gt=0), name='paiement_montant_positif'),
        ]


# ─── Échéancier de paiement ──────────────────────────────────────────────────

def _ajouter_periode(date_base, periodicite, n):
    """
    Ajoute n périodes à date_base selon periodicite — sans python-dateutil
    (absent de requirements.txt). Gère le débordement de jour pour la
    mensualité (ex: 31 janvier + 1 mois -> 28/29 février) en retombant sur
    le dernier jour du mois cible plutôt que de planter.
    """
    if periodicite == PeriodiciteEcheance.HEBDOMADAIRE:
        return date_base + timedelta(weeks=n)
    if periodicite == PeriodiciteEcheance.BIMENSUELLE:
        return date_base + timedelta(weeks=2 * n)

    mois_total = date_base.month - 1 + n
    annee = date_base.year + mois_total // 12
    mois = mois_total % 12 + 1
    dernier_jour_du_mois = calendar.monthrange(annee, mois)[1]
    jour = min(date_base.day, dernier_jour_du_mois)
    return date_base.replace(year=annee, month=mois, day=jour)


class EcheancierPaiement(models.Model):
    """
    Paiement fractionné — porte UNIQUEMENT sur Facture.montant_part_patient,
    JAMAIS sur la part assurance (qui suit son propre circuit de facturation
    à l'assureur, sur un cycle mensuel séparé). Deux cas d'usage réels :
    - patient "payant direct" sans assurance qui ne peut pas régler le solde
      en une fois à la sortie → engagement de paiement signé, avec garant
      pour les montants importants ;
    - patient assuré dont le ticket modérateur reste lourd (hospitalisation,
      chirurgie) → même mécanisme sur un montant plus petit, engagement
      signé optionnel.
    """

    facture = models.OneToOneField(Facture, on_delete=models.CASCADE, related_name='echeancier')

    montant_total_echeancier = models.DecimalField(max_digits=12, decimal_places=2)
    nombre_echeances = models.PositiveIntegerField()
    periodicite = models.CharField(max_length=15, choices=PeriodiciteEcheance.choices)
    date_premiere_echeance = models.DateField()

    statut = models.CharField(max_length=15, choices=StatutEcheancier.choices, default=StatutEcheancier.ACTIF)

    engagement_signe   = models.BooleanField(default=False)
    date_signature     = models.DateTimeField(null=True, blank=True)
    document_signe_url = models.CharField(max_length=255, blank=True)

    garant_nom       = models.CharField(max_length=150, blank=True)
    garant_telephone = models.CharField(max_length=20, blank=True)
    garant_cni       = models.CharField(max_length=30, blank=True)

    cree_par = models.ForeignKey(
        'comptes.Employe', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='echeanciers_crees',
    )
    date_creation = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True)

    def clean(self):
        # Garde-fou explicite de la règle métier : impossible de fractionner
        # plus que le ticket modérateur — la part assurance n'est jamais
        # concernée par un échéancier.
        if self.montant_total_echeancier is not None and self.facture_id:
            if self.montant_total_echeancier > self.facture.montant_part_patient:
                raise ValidationError(
                    "Le montant de l'échéancier ne peut pas dépasser la part "
                    "patient de la facture (montant_part_patient) — la part "
                    "assurance suit son propre circuit de facturation."
                )

    def generer_echeances(self):
        """
        Crée les N Echeance à intervalle régulier. À appeler UNE SEULE FOIS,
        juste après la création de l'échéancier (voir EcheancierPaiementViewSet
        .perform_create() à venir) — pas dans save(), pour ne jamais
        régénérer les échéances si l'échéancier est modifié ensuite (ex:
        signature ajoutée après coup).
        """
        montant_par_echeance = (self.montant_total_echeancier / self.nombre_echeances).quantize(Decimal('0.01'))
        cumule = Decimal('0')

        for i in range(self.nombre_echeances):
            montant = montant_par_echeance
            if i == self.nombre_echeances - 1:
                # Dernière échéance : absorbe l'écart d'arrondi pour retomber
                # exactement sur montant_total_echeancier.
                montant = self.montant_total_echeancier - cumule
            cumule += montant

            Echeance.objects.create(
                echeancier=self,
                numero_echeance=i + 1,
                date_echeance=_ajouter_periode(self.date_premiere_echeance, self.periodicite, i),
                montant_prevu=montant,
            )

    def __str__(self):
        return f"Échéancier {self.facture.numero_facture} — {self.nombre_echeances} échéances"

    class Meta:
        verbose_name = "Échéancier de paiement"
        verbose_name_plural = "Échéanciers de paiement"


class Echeance(models.Model):
    echeancier = models.ForeignKey(EcheancierPaiement, on_delete=models.CASCADE, related_name='echeances')
    numero_echeance = models.PositiveIntegerField()

    date_echeance  = models.DateField()
    montant_prevu  = models.DecimalField(max_digits=12, decimal_places=2)
    montant_paye   = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    statut = models.CharField(max_length=15, choices=StatutEcheance.choices, default=StatutEcheance.A_VENIR)

    def recalculer_statut(self):
        """
        Recalcule montant_paye et le statut à partir des Paiement liés.
        N'assigne JAMAIS StatutEcheance.IMPAYEE automatiquement — ce statut
        est une escalade manuelle (après échec de recouvrement), posée par
        le facturier/l'agent des affaires financières, pas déduite d'une
        date dépassée.
        """
        from django.utils import timezone

        self.montant_paye = sum((p.montant for p in self.paiements.all()), Decimal('0'))
        if self.montant_paye >= self.montant_prevu:
            self.statut = StatutEcheance.PAYEE
        elif self.date_echeance < timezone.now().date() and self.statut != StatutEcheance.IMPAYEE:
            self.statut = StatutEcheance.EN_RETARD
        elif self.statut not in (StatutEcheance.IMPAYEE,):
            self.statut = StatutEcheance.A_VENIR

        self.save(update_fields=['montant_paye', 'statut'])

        # Une fois toutes les échéances soldées, l'échéancier passe à SOLDE.
        if self.echeancier.echeances.exclude(statut=StatutEcheance.PAYEE).count() == 0:
            self.echeancier.statut = StatutEcheancier.SOLDE
            self.echeancier.save(update_fields=['statut'])

    def __str__(self):
        return f"Échéance {self.numero_echeance}/{self.echeancier.nombre_echeances} — {self.date_echeance}"

    class Meta:
        verbose_name = "Échéance"
        verbose_name_plural = "Échéances"
        ordering = ['numero_echeance']
        constraints = [
            models.UniqueConstraint(fields=['echeancier', 'numero_echeance'], name='echeance_numero_unique_par_echeancier'),
        ]