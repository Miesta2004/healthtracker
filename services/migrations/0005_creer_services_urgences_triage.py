from django.db import migrations


SERVICES_A_CREER = [
    {
        'nom': 'Urgences',
        'description': (
            "Service d'accueil des urgences vitales. Destination automatique du mode "
            "'Urgence Vitale / Identité Provisoire' du formulaire d'admission — un "
            "patient y est admis directement au statut 'admis_urgences', sans attendre "
            "de confirmation du secrétariat (contrairement au circuit normal)."
        ),
    },
    {
        'nom': 'Consultation Externe / Triage',
        'description': (
            "Service de repli quand le motif d'admission n'est pas encore défini : "
            "l'agent d'admission y oriente le patient en attendant qu'un premier avis "
            "médical précise vers quel service spécialisé le rediriger."
        ),
    },
]


def creer_services(apps, schema_editor):
    Service = apps.get_model('services', 'Service')
    for data in SERVICES_A_CREER:
        Service.objects.get_or_create(nom=data['nom'], defaults={'description': data['description']})


def supprimer_services(apps, schema_editor):
    Service = apps.get_model('services', 'Service')
    Service.objects.filter(nom__in=[d['nom'] for d in SERVICES_A_CREER]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('services', '0004_service_capacite_lits'),
    ]

    operations = [
        migrations.RunPython(creer_services, supprimer_services),
    ]
