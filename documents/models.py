from django.db import models
from django.utils import timezone


class TypeDocument(models.TextChoices):
    COMPTE_RENDU_CONSULTATION = 'compte_rendu_consultation', 'Compte rendu de consultation'
    ORDONNANCE                = 'ordonnance',                'Ordonnance'
    CERTIFICAT_MEDICAL        = 'certificat_medical',        'Certificat médical'
    DEMANDE_ANALYSE           = 'demande_analyse',           "Demande d'examen"
    DEMANDE_IMAGERIE          = 'demande_imagerie',          "Demande d'imagerie"
    LETTRE_ORIENTATION        = 'lettre_orientation',        "Lettre d'orientation"
    ARRET_TRAVAIL             = 'arret_travail',             'Arrêt de travail'
    AUTRE                     = 'autre',                     'Autre'

    @classmethod
    def types_editeur_structure(cls):
        """
        Les 6 types couverts par l'éditeur structuré (formulaire + aperçu A4).
        DEMANDE_IMAGERIE partage l'éditeur de DEMANDE_ANALYSE (liste d'examens
        unifiée biologie + imagerie) plutôt que de dupliquer un écran quasi
        identique.
        """
        return [
            cls.ORDONNANCE, cls.CERTIFICAT_MEDICAL, cls.DEMANDE_ANALYSE,
            cls.COMPTE_RENDU_CONSULTATION, cls.LETTRE_ORIENTATION, cls.ARRET_TRAVAIL,
        ]


class StatutDocument(models.TextChoices):
    BROUILLON = 'brouillon', 'Brouillon'
    FINALISE  = 'finalise',  'Finalisé'


JETONS_DISPONIBLES = [
    '{{patient.nom}}', '{{patient.prenom}}', '{{patient.age}}', '{{patient.sexe}}',
    '{{patient.numero_dossier}}', '{{patient.date_naissance}}',
    '{{consultation.motif}}', '{{consultation.diagnostic}}', '{{consultation.symptomes}}',
    '{{consultation.ordonnance}}', '{{consultation.date}}',
    '{{medecin.nom}}', '{{medecin.prenom}}', '{{medecin.signature}}', '{{service.nom}}', '{{date_jour}}',
]


def construire_contexte(*, patient, consultation=None, medecin=None):
    """Instantané des données réelles au moment de la génération — préremplissage
    formulaire + jetons en-tête/pied de page. Figé dans donnees['contexte']."""
    contexte = {
        'patient': {
            'nom': patient.nom,
            'prenom': patient.prenom,
            'age': patient.age if getattr(patient, 'age', None) is not None else None,
            'sexe': patient.get_sexe_display() if hasattr(patient, 'get_sexe_display') else (patient.sexe or ''),
            'numero_dossier': patient.numero_dossier or '',
            'date_naissance': patient.date_naissance.strftime('%d/%m/%Y') if patient.date_naissance else '',
            'allergies': patient.allergies or '',
        },
        'consultation': None,
        'medecin': None,
        'service': None,
        'date_jour': timezone.localdate().strftime('%d/%m/%Y'),
    }
    if consultation is not None:
        contexte['consultation'] = {
            'motif': consultation.motif or '',
            'diagnostic': consultation.diagnostic or '',
            'symptomes': consultation.symptomes or '',
            'date': consultation.date.strftime('%d/%m/%Y %H:%M') if consultation.date else '',
        }
    if medecin is not None:
        contexte['medecin'] = {
            'nom': medecin.nom,
            'prenom': medecin.prenom,
            'signature': getattr(medecin, 'signature_medicale', '') or '',
        }
        if getattr(medecin, 'service', None):
            contexte['service'] = {'nom': medecin.service.nom}
    return contexte


def _rendre_jetons(texte, contexte):
    if not texte:
        return ''
    patient = contexte.get('patient') or {}
    consultation = contexte.get('consultation') or {}
    medecin = contexte.get('medecin') or {}
    service = contexte.get('service') or {}
    valeurs = {
        '{{patient.nom}}': patient.get('nom', ''),
        '{{patient.prenom}}': patient.get('prenom', ''),
        '{{patient.age}}': str(patient.get('age') or ''),
        '{{patient.sexe}}': patient.get('sexe', ''),
        '{{patient.numero_dossier}}': patient.get('numero_dossier', ''),
        '{{patient.date_naissance}}': patient.get('date_naissance', ''),
        '{{consultation.motif}}': consultation.get('motif', ''),
        '{{consultation.diagnostic}}': consultation.get('diagnostic', ''),
        '{{consultation.date}}': consultation.get('date', ''),
        '{{medecin.nom}}': medecin.get('nom', ''),
        '{{medecin.prenom}}': medecin.get('prenom', ''),
        '{{medecin.signature}}': medecin.get('signature', ''),
        '{{service.nom}}': service.get('nom', ''),
        '{{date_jour}}': contexte.get('date_jour', ''),
    }
    for jeton, valeur in valeurs.items():
        texte = texte.replace(jeton, valeur)
    return texte


class ModeleDocument(models.Model):
    """Habillage par établissement (en-tête/pied de page) — la structure des
    champs (formulaire + aperçu A4) est fixe par type_document en code."""
    nom = models.CharField(max_length=150)
    type_document = models.CharField(max_length=30, choices=TypeDocument.choices)
    entete = models.TextField(
        blank=True,
        help_text="Texte affiché en haut du document. Jetons disponibles : " + ', '.join(JETONS_DISPONIBLES),
    )
    pied_de_page = models.TextField(
        blank=True,
        help_text="Mentions légales / signature affichées en bas du document. Mêmes jetons que l'en-tête.",
    )
    corps = models.TextField(blank=True, null=True)  # historique, plus utilisé
    actif = models.BooleanField(default=True)
    cree_par = models.ForeignKey(
        'comptes.Employe', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='modeles_crees',
    )
    date_creation = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['type_document', 'nom']
        verbose_name = "Modèle de document"
        verbose_name_plural = "Modèles de document"

    def __str__(self):
        return f"{self.nom} ({self.get_type_document_display()})"

    def rendre_entete(self, contexte):
        return _rendre_jetons(self.entete, contexte)

    def rendre_pied_de_page(self, contexte):
        return _rendre_jetons(self.pied_de_page, contexte)


class DocumentGenere(models.Model):
    """Document en cours d'édition ou finalisé — le contenu médical vit dans
    `donnees` (JSON structuré, schéma par type dans documents/rendu.py)."""
    patient = models.ForeignKey(
        'patients.Patient', on_delete=models.CASCADE, related_name='documents_generes',
    )
    consultation = models.ForeignKey(
        'consultations.Consultation', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='documents_generes',
    )
    modele = models.ForeignKey(
        ModeleDocument, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='documents_generes',
        help_text="Modèle (en-tête/pied de page) utilisé pour l'habillage — optionnel.",
    )
    # Dénormalisés depuis le modèle au moment T : le document reste lisible
    # et cohérent même si le modèle source est ensuite modifié ou supprimé.
    type_document = models.CharField(max_length=30, choices=TypeDocument.choices)
    titre = models.CharField(max_length=200)
    statut = models.CharField(max_length=10, choices=StatutDocument.choices, default=StatutDocument.BROUILLON)
    donnees = models.JSONField(default=dict, blank=True)
    contenu = models.TextField(blank=True)
    genere_par = models.ForeignKey(
        'comptes.Employe', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='documents_generes',
    )
    date_creation = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date_creation']
        verbose_name = "Document généré"
        verbose_name_plural = "Documents générés"

    def __str__(self):
        return f"{self.titre} — {self.patient} ({self.date_creation:%d/%m/%Y})"


class Medicament(models.Model):
    """Référentiel de médicaments — pensé pour qu'une future app Pharmacie
    puisse s'y accrocher par FK sans remodeler l'ordonnance."""
    nom = models.CharField(max_length=150, db_index=True)
    dci = models.CharField(max_length=150, blank=True)
    forme = models.CharField(max_length=100, blank=True)
    dosages_courants = models.CharField(max_length=200, blank=True)
    actif = models.BooleanField(default=True)

    class Meta:
        ordering = ['nom']
        verbose_name = "Médicament"
        verbose_name_plural = "Médicaments"

    def __str__(self):
        return self.nom
