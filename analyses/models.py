from django.db import models
from patients.models import Patient
from consultations.models import Consultation


class DemandeAnalyse(models.Model):

    TYPE_CHOICES = [
        ('nfs',             'NFS (numération formule sanguine)'),
        ('glycemie',        'Glycémie'),
        ('bilan_renal',     'Bilan rénal (créatinine, urée)'),
        ('bilan_hepatique', 'Bilan hépatique (ASAT, ALAT)'),
        ('bilan_lipidique', 'Bilan lipidique'),
        ('ionogramme',      'Ionogramme sanguin'),
        ('crp',             'CRP (protéine C-réactive)'),
        ('groupe_sanguin',  'Groupe sanguin / RAI'),
        ('hemostase',       'Hémostase (TP, TCA)'),
        ('urine',           'Examen cytobactériologique des urines'),
        ('parasite',        'Frottis / goutte épaisse (paludisme)'),
        ('autre',           'Autre'),
    ]

    STATUT_CHOICES = [
        ('en_attente', 'En attente'),
        ('en_cours',   'En cours'),
        ('terminee',   'Terminée'),
        ('annulee',    'Annulée'),
    ]

    URGENCE_CHOICES = [
        ('normale',  'Normale'),
        ('urgente',  'Urgente'),
    ]

    patient = models.ForeignKey(
        Patient, on_delete=models.CASCADE,
        related_name='demandes_analyse',
    )
    consultation = models.ForeignKey(
        Consultation, on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='demandes_analyse',
    )
    demandeur = models.ForeignKey(
        'comptes.Employe', on_delete=models.SET_NULL,
        null=True, related_name='demandes_envoyees',
        verbose_name='Médecin demandeur',
    )
    laborantin = models.ForeignKey(
        'comptes.Employe', on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='demandes_traitees',
        verbose_name='Laborantin traitant',
        limit_choices_to={'role': 'laborantin'},
    )

    type_analyse  = models.CharField(max_length=30, choices=TYPE_CHOICES)
    urgence       = models.CharField(max_length=10, choices=URGENCE_CHOICES, default='normale')
    statut        = models.CharField(max_length=15, choices=STATUT_CHOICES, default='en_attente')
    notes_medecin = models.TextField(blank=True)
    resultats     = models.TextField(blank=True)
    valeurs_normales = models.TextField(blank=True)

    date_demande  = models.DateTimeField(auto_now_add=True)
    date_resultat = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.get_type_analyse_display()} — {self.patient} ({self.get_statut_display()})"

    class Meta:
        ordering = ['-date_demande']
        verbose_name = "Demande d'analyse"
        verbose_name_plural = "Demandes d'analyse"