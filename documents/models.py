from django.db import models
from django.utils import timezone


class TypeDocument(models.TextChoices):
    COMPTE_RENDU_CONSULTATION = 'compte_rendu_consultation', 'Compte rendu de consultation'
    ORDONNANCE                = 'ordonnance',                'Ordonnance'
    CERTIFICAT_MEDICAL        = 'certificat_medical',        'Certificat médical'
    DEMANDE_ANALYSE           = 'demande_analyse',           "Demande d'analyse"
    DEMANDE_IMAGERIE          = 'demande_imagerie',          "Demande d'imagerie"
    LETTRE_ORIENTATION        = 'lettre_orientation',        "Lettre d'orientation"
    ARRET_TRAVAIL             = 'arret_travail',             'Arrêt de travail'
    AUTRE                     = 'autre',                     'Autre'


# Jetons disponibles dans le corps d'un modèle — remplacés par les données
# réelles du patient/de la consultation au moment de la génération. Rendu
# volontairement par simple remplacement de texte (voir ModeleDocument.rendre)
# et non par le moteur de templates Django : le corps d'un modèle vient d'un
# utilisateur métier via Paramètres, pas d'un développeur — lui donner accès
# au moteur Django reviendrait à exposer des attributs Python arbitraires.
JETONS_DISPONIBLES = [
    '{{patient.nom}}', '{{patient.prenom}}', '{{patient.age}}', '{{patient.sexe}}',
    '{{patient.numero_dossier}}', '{{patient.date_naissance}}',
    '{{consultation.motif}}', '{{consultation.diagnostic}}', '{{consultation.symptomes}}',
    '{{consultation.ordonnance}}', '{{consultation.date}}',
    '{{medecin.nom}}', '{{medecin.prenom}}', '{{medecin.signature}}', '{{service.nom}}', '{{date_jour}}',
]


class ModeleDocument(models.Model):
    """
    Modèle de document réutilisable (bibliothèque de modèles, Paramètres >
    Modèles de documents). Le corps contient du texte libre avec des jetons
    {{...}} remplacés à la génération.
    """
    nom = models.CharField(max_length=150)
    type_document = models.CharField(max_length=30, choices=TypeDocument.choices)
    corps = models.TextField(
        help_text="Texte du modèle. Jetons disponibles : " + ', '.join(JETONS_DISPONIBLES)
    )
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

    def rendre(self, *, patient, consultation=None, medecin=None):
        """
        Remplace les jetons {{...}} du corps par les données réelles.
        Un jeton sans valeur disponible (ex. {{consultation.diagnostic}} sans
        consultation fournie) est laissé tel quel plutôt que de faire planter
        la génération — le document reste utilisable, à compléter à la main.
        """
        valeurs = {
            '{{patient.nom}}': patient.nom,
            '{{patient.prenom}}': patient.prenom,
            '{{patient.age}}': str(patient.age) if getattr(patient, 'age', None) is not None else '',
            '{{patient.sexe}}': patient.get_sexe_display() if hasattr(patient, 'get_sexe_display') else (patient.sexe or ''),
            '{{patient.numero_dossier}}': patient.numero_dossier or '',
            '{{patient.date_naissance}}': patient.date_naissance.strftime('%d/%m/%Y') if patient.date_naissance else '',
            '{{date_jour}}': timezone.localdate().strftime('%d/%m/%Y'),
        }
        if consultation is not None:
            valeurs.update({
                '{{consultation.motif}}': consultation.motif or '',
                '{{consultation.diagnostic}}': consultation.diagnostic or '',
                '{{consultation.symptomes}}': consultation.symptomes or '',
                '{{consultation.ordonnance}}': consultation.ordonnance or '',
                '{{consultation.date}}': consultation.date.strftime('%d/%m/%Y %H:%M') if consultation.date else '',
            })
        if medecin is not None:
            valeurs.update({
                '{{medecin.nom}}': medecin.nom,
                '{{medecin.prenom}}': medecin.prenom,
                '{{medecin.signature}}': getattr(medecin, 'signature_medicale', '') or '',
            })
            if getattr(medecin, 'service', None):
                valeurs['{{service.nom}}'] = medecin.service.nom

        texte = self.corps
        for jeton, valeur in valeurs.items():
            texte = texte.replace(jeton, valeur)
        return texte


class DocumentGenere(models.Model):
    """
    Trace d'un document effectivement généré pour un patient — le contenu est
    figé au moment de la génération (indépendant d'une modification ultérieure
    du modèle source), à l'image d'un vrai document imprimé/archivé.
    """
    patient = models.ForeignKey(
        'patients.Patient', on_delete=models.CASCADE, related_name='documents_generes',
    )
    consultation = models.ForeignKey(
        'consultations.Consultation', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='documents_generes',
    )
    modele = models.ForeignKey(
        ModeleDocument, on_delete=models.SET_NULL, null=True,
        related_name='documents_generes',
    )
    # Dénormalisés depuis le modèle au moment T : le document reste lisible
    # et cohérent même si le modèle source est ensuite modifié ou supprimé.
    type_document = models.CharField(max_length=30, choices=TypeDocument.choices)
    titre = models.CharField(max_length=200)
    contenu = models.TextField()

    genere_par = models.ForeignKey(
        'comptes.Employe', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='documents_generes',
    )
    date_creation = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date_creation']
        verbose_name = "Document généré"
        verbose_name_plural = "Documents générés"

    def __str__(self):
        return f"{self.titre} — {self.patient} ({self.date_creation:%d/%m/%Y})"
