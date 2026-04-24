from django.db import models

# Create your models here.
#models.Model = @Entity
class Patient(models.Model):
    SEXE_CHOICES = [
        ('M','Masculin'),
        ('F','Féminin')
    ]

    GROUPE_SANGUIN_CHOICES = [
        ('A+', 'A+'), ('A-', 'A-'),
        ('B+', 'B+'), ('B-', 'B-'),
        ('AB+', 'AB+'), ('AB-', 'AB-'),
        ('O+', 'O+'), ('O-', 'O-'),
    ]

    #Informations personnelles
    nom = models.CharField(max_length=100) #models.CharField = String + @Column
    prenom = models.CharField(max_length=100)
    date_naissance = models.DateField()
    sexe = models.CharField(max_length=1,choices=SEXE_CHOICES) #choices=enum
    groupe_sanguin = models.CharField(max_length=3,choices=GROUPE_SANGUIN_CHOICES,blank=True)

    #Coordonnées
    telephone = models.CharField(max_length=30,blank=True) #blank=True = champ optionnel
    adresse = models.TextField(blank=True)

    #Informations médicales
    allergies = models.TextField(blank=True)
    antecedents = models.TextField(blank=True)

    #Métadonnées
    date_creation = models.DateTimeField(auto_now_add=True) #auto_now_add=True = @CreatedDate
    date_modification = models.DateTimeField(auto_now=True) #auto_now=True = @LastModifiedDate
    actif = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.prenom} {self.nom}"


    class Meta: #class Meta = config JPA
        ordering = ['nom','prenom']
        verbose_name = "Patient"
        verbose_name_plural = "Patients"

