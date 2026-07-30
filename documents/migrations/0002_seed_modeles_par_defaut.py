from django.db import migrations


MODELES_PAR_DEFAUT = [
    {
        'nom': 'Compte rendu de consultation',
        'type_document': 'compte_rendu_consultation',
        'corps': (
            "COMPTE RENDU DE CONSULTATION\n"
            "Date : {{consultation.date}}\n\n"
            "Patient : {{patient.prenom}} {{patient.nom}}\n"
            "Né(e) le {{patient.date_naissance}} — {{patient.age}} ans — {{patient.sexe}}\n"
            "N° dossier : {{patient.numero_dossier}}\n\n"
            "Motif de consultation :\n{{consultation.motif}}\n\n"
            "Observations :\n{{consultation.symptomes}}\n\n"
            "Diagnostic :\n{{consultation.diagnostic}}\n\n"
            "Fait à {{service.nom}}, le {{date_jour}}\n"
            "Dr {{medecin.prenom}} {{medecin.nom}}"
        ),
    },
    {
        'nom': 'Ordonnance',
        'type_document': 'ordonnance',
        'corps': (
            "ORDONNANCE\n"
            "{{service.nom}} — {{date_jour}}\n\n"
            "Patient : {{patient.prenom}} {{patient.nom}}, {{patient.age}} ans\n\n"
            "Prescription :\n{{consultation.ordonnance}}\n\n"
            "Dr {{medecin.prenom}} {{medecin.nom}}"
        ),
    },
    {
        'nom': 'Certificat médical',
        'type_document': 'certificat_medical',
        'corps': (
            "CERTIFICAT MÉDICAL\n\n"
            "Je soussigné(e) Dr {{medecin.prenom}} {{medecin.nom}}, certifie avoir examiné ce jour "
            "{{patient.prenom}} {{patient.nom}}, né(e) le {{patient.date_naissance}}.\n\n"
            "Constatations :\n{{consultation.diagnostic}}\n\n"
            "Certificat établi à la demande de l'intéressé(e) pour faire valoir ce que de droit.\n\n"
            "Fait à {{service.nom}}, le {{date_jour}}\n"
            "Dr {{medecin.prenom}} {{medecin.nom}}"
        ),
    },
    {
        'nom': "Demande d'analyse",
        'type_document': 'demande_analyse',
        'corps': (
            "DEMANDE D'ANALYSE DE LABORATOIRE\n"
            "{{date_jour}}\n\n"
            "Patient : {{patient.prenom}} {{patient.nom}}, {{patient.age}} ans, {{patient.sexe}}\n"
            "N° dossier : {{patient.numero_dossier}}\n\n"
            "Contexte clinique :\n{{consultation.motif}}\n{{consultation.diagnostic}}\n\n"
            "Analyses demandées : ___________________________\n\n"
            "Dr {{medecin.prenom}} {{medecin.nom}} — {{service.nom}}"
        ),
    },
    {
        'nom': "Lettre d'orientation",
        'type_document': 'lettre_orientation',
        'corps': (
            "Cher confrère, chère consœur,\n\n"
            "Je vous adresse {{patient.prenom}} {{patient.nom}}, {{patient.age}} ans, "
            "que je suis actuellement pour : {{consultation.motif}}.\n\n"
            "Éléments cliniques :\n{{consultation.diagnostic}}\n{{consultation.symptomes}}\n\n"
            "Je vous remercie de l'attention que vous porterez à ce patient.\n\n"
            "Confraternellement,\n"
            "Dr {{medecin.prenom}} {{medecin.nom}} — {{service.nom}}, le {{date_jour}}"
        ),
    },
    {
        'nom': 'Arrêt de travail',
        'type_document': 'arret_travail',
        'corps': (
            "AVIS D'ARRÊT DE TRAVAIL\n\n"
            "Patient : {{patient.prenom}} {{patient.nom}}\n"
            "Né(e) le {{patient.date_naissance}}\n\n"
            "Motif médical :\n{{consultation.diagnostic}}\n\n"
            "Durée de l'arrêt : du __/__/____ au __/__/____\n\n"
            "Fait à {{service.nom}}, le {{date_jour}}\n"
            "Dr {{medecin.prenom}} {{medecin.nom}}"
        ),
    },
]


def creer_modeles_par_defaut(apps, schema_editor):
    ModeleDocument = apps.get_model('documents', 'ModeleDocument')
    for data in MODELES_PAR_DEFAUT:
        ModeleDocument.objects.get_or_create(
            nom=data['nom'], type_document=data['type_document'],
            defaults={'corps': data['corps'], 'actif': True},
        )


def supprimer_modeles_par_defaut(apps, schema_editor):
    ModeleDocument = apps.get_model('documents', 'ModeleDocument')
    noms = [d['nom'] for d in MODELES_PAR_DEFAUT]
    ModeleDocument.objects.filter(nom__in=noms, cree_par__isnull=True).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('documents', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(creer_modeles_par_defaut, supprimer_modeles_par_defaut),
    ]
