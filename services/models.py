from django.db import models

class Service(models.Model):
    nom = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    # Le chef de service est en principe un médecin. Exception : le service
    # Laboratoire n'a pas de médecin (seulement des laborantins) — on autorise
    # donc aussi le rôle 'laborantin', qui joue dans ce cas le rôle de
    # responsable technique (équivalent d'un biologiste médical senior).
    chef_de_service = models.ForeignKey(
        'comptes.Employe',
        on_delete=models.SET_NULL,
        null=True,blank=True,
        related_name='services_diriges',
        limit_choices_to={'role__in': ['medecin', 'laborantin']}
    )
    actif = models.BooleanField(default=True)
    capacite_lits = models.PositiveIntegerField(
        null=True, blank=True,
        help_text="Nombre de lits du service — sert à calculer le taux d'occupation. Laisser vide si non pertinent (ex: service sans hospitalisation)."
    )
    date_creation = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.nom

    class Meta:
        verbose_name = "Service"
        verbose_name_plural = "Services"
        ordering = ['nom']