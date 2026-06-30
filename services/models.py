from django.db import models

class Service(models.Model):
    nom = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    chef_de_service = models.ForeignKey(
        'comptes.Employe',
        on_delete=models.SET_NULL,
        null=True,blank=True,
        related_name='services_diriges',
        limit_choices_to={'role':'medecin'}
    )
    actif = models.BooleanField(default=True)
    date_creation = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.nom

    class Meta:
        verbose_name = "Service"
        verbose_name_plural = "Services"
        ordering = ['nom']