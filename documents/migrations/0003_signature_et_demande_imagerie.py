from django.db import migrations, models


NOUVEAU_JETONS_HELP_TEXT = (
    "Texte du modèle. Jetons disponibles : {{patient.nom}}, {{patient.prenom}}, "
    "{{patient.age}}, {{patient.sexe}}, {{patient.numero_dossier}}, "
    "{{patient.date_naissance}}, {{consultation.motif}}, {{consultation.diagnostic}}, "
    "{{consultation.symptomes}}, {{consultation.ordonnance}}, {{consultation.date}}, "
    "{{medecin.nom}}, {{medecin.prenom}}, {{medecin.signature}}, {{service.nom}}, {{date_jour}}"
)

# (nom du modèle par défaut, ancienne ligne signature, nouvelle ligne avec le jeton)
# — ne touche que les modèles non modifiés par un établissement (cree_par IS NULL),
# comme la migration de seed initiale.
AJOUTS_SIGNATURE = {
    'Compte rendu de consultation': (
        "Dr {{medecin.prenom}} {{medecin.nom}}",
        "Dr {{medecin.prenom}} {{medecin.nom}}\n{{medecin.signature}}",
    ),
    'Ordonnance': (
        "Dr {{medecin.prenom}} {{medecin.nom}}",
        "Dr {{medecin.prenom}} {{medecin.nom}}\n{{medecin.signature}}",
    ),
    'Certificat médical': (
        "Dr {{medecin.prenom}} {{medecin.nom}}",
        "Dr {{medecin.prenom}} {{medecin.nom}}\n{{medecin.signature}}",
    ),
    'Arrêt de travail': (
        "Dr {{medecin.prenom}} {{medecin.nom}}",
        "Dr {{medecin.prenom}} {{medecin.nom}}\n{{medecin.signature}}",
    ),
}

MODELE_DEMANDE_IMAGERIE = {
    'nom': "Demande d'imagerie",
    'type_document': 'demande_imagerie',
    'corps': (
        "DEMANDE D'EXAMEN D'IMAGERIE\n"
        "{{date_jour}}\n\n"
        "Patient : {{patient.prenom}} {{patient.nom}}, {{patient.age}} ans, {{patient.sexe}}\n"
        "N° dossier : {{patient.numero_dossier}}\n\n"
        "Contexte clinique :\n{{consultation.motif}}\n{{consultation.diagnostic}}\n\n"
        "Examen(s) demandé(s) : ___________________________\n"
        "(échographie / radiographie / scanner / IRM — rayer les mentions inutiles)\n\n"
        "Dr {{medecin.prenom}} {{medecin.nom}}\n{{medecin.signature}}\n{{service.nom}}"
    ),
}


def ajouter_signature_et_imagerie(apps, schema_editor):
    ModeleDocument = apps.get_model('documents', 'ModeleDocument')

    for nom, (ancienne_ligne, nouvelle_ligne) in AJOUTS_SIGNATURE.items():
        for modele in ModeleDocument.objects.filter(nom=nom, cree_par__isnull=True):
            if ancienne_ligne in modele.corps and '{{medecin.signature}}' not in modele.corps:
                modele.corps = modele.corps.replace(ancienne_ligne, nouvelle_ligne)
                modele.save(update_fields=['corps'])

    ModeleDocument.objects.get_or_create(
        nom=MODELE_DEMANDE_IMAGERIE['nom'], type_document=MODELE_DEMANDE_IMAGERIE['type_document'],
        defaults={'corps': MODELE_DEMANDE_IMAGERIE['corps'], 'actif': True},
    )


def retirer_signature_et_imagerie(apps, schema_editor):
    ModeleDocument = apps.get_model('documents', 'ModeleDocument')

    for nom, (ancienne_ligne, nouvelle_ligne) in AJOUTS_SIGNATURE.items():
        for modele in ModeleDocument.objects.filter(nom=nom, cree_par__isnull=True):
            if nouvelle_ligne in modele.corps:
                modele.corps = modele.corps.replace(nouvelle_ligne, ancienne_ligne)
                modele.save(update_fields=['corps'])

    ModeleDocument.objects.filter(
        nom=MODELE_DEMANDE_IMAGERIE['nom'], cree_par__isnull=True,
    ).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('documents', '0002_seed_modeles_par_defaut'),
    ]

    operations = [
        migrations.AlterField(
            model_name='modeledocument',
            name='corps',
            field=models.TextField(help_text=NOUVEAU_JETONS_HELP_TEXT),
        ),
        migrations.RunPython(ajouter_signature_et_imagerie, retirer_signature_et_imagerie),
    ]
