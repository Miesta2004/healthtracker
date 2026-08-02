from django.db import models
from comptes.models import Employe
from services.models import Service


class JournalActivite(models.Model):
    """
    Journal d'activité — trace qui a fait quoi, où et quand, pour la
    traçabilité (bloc "activité récente" du Dashboard + page dédiée avec
    filtres/recherche).

    Volontairement CURÉ, pas générique : on ne branche `journaliser()` que
    sur les actions métier qui ont une valeur de traçabilité (RDV,
    consultations, interventions, admissions, changements de rôle...),
    pas sur chaque `save()` de chaque modèle — sinon ce journal devient
    illisible en quelques jours d'usage réel. La liste des événements
    tracés s'étoffe au fur et à mesure de la nécessité.

    Scope : chaque employé ne voit que l'activité de SON service (cf.
    JournalActiviteViewSet.get_queryset), à l'exception du superuser.
    Une vue "hôpital entier" pour un futur rôle directeur reste à
    concevoir séparément — pas encore de modélisation ici.
    """
    TYPE_CHOICES = [
        ('rendez_vous', 'Rendez-vous'),
        ('consultation', 'Consultation'),
        ('intervention', 'Intervention chirurgicale'),
        ('patient', 'Patient'),
        ('hospitalisation', 'Hospitalisation'),
        ('urgence', 'Urgence'),
        ('employe', 'Employé'),
        ('autre', 'Autre'),
    ]
    ACTION_CHOICES = [
        ('creation', 'Création'),
        ('modification', 'Modification'),
        ('suppression', 'Suppression'),
        ('annulation', 'Annulation'),
        ('autre', 'Autre'),
    ]

    employe = models.ForeignKey(
        Employe, on_delete=models.SET_NULL, null=True, related_name='activites'
    )
    # Dénormalisé plutôt que dérivé de `employe.service` à la lecture : un
    # employé peut changer de service, l'activité doit rester rattachée au
    # service où l'action a eu lieu.
    service = models.ForeignKey(
        Service, on_delete=models.SET_NULL, null=True, blank=True, related_name='activites'
    )
    type_objet = models.CharField(max_length=20, choices=TYPE_CHOICES)
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    description = models.CharField(max_length=255)
    objet_id = models.PositiveIntegerField(null=True, blank=True)
    date_creation = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date_creation']
        verbose_name = "Activité"
        verbose_name_plural = "Activités"
        indexes = [
            models.Index(fields=['service', '-date_creation']),
        ]

    def __str__(self):
        return f"{self.description} — {self.employe}"


def journaliser(employe, type_objet, action, description, objet_id=None):
    """
    Point d'entrée unique pour tracer un événement métier dans le journal
    d'activité. À appeler depuis perform_create/perform_update/
    perform_destroy des vues concernées — jamais depuis un signal
    générique (cf. docstring de JournalActivite sur le choix d'un journal
    curé plutôt qu'automatique).

    `employe` peut être None (ex. action système) : l'entrée est alors
    créée sans service, elle n'apparaîtra dans aucun planning de service —
    acceptable pour les quelques cas système, à revoir si ça devient
    fréquent.
    """
    JournalActivite.objects.create(
        employe=employe,
        service=employe.service if employe else None,
        type_objet=type_objet,
        action=action,
        description=description,
        objet_id=objet_id,
    )