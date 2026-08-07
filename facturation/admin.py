from django.contrib import admin
from .models import Facture, LigneFacture, Paiement, EcheancierPaiement, Echeance, TarifActe


class LigneFactureInline(admin.TabularInline):
    model = LigneFacture
    extra = 0
    readonly_fields = ('montant_ligne', 'montant_part_assurance_ligne', 'montant_part_patient_ligne')


class PaiementInline(admin.TabularInline):
    model = Paiement
    extra = 0
    readonly_fields = ('date_paiement',)


@admin.register(Facture)
class FactureAdmin(admin.ModelAdmin):
    list_display = ('numero_facture', 'patient', 'statut', 'montant_total', 'montant_restant', 'date_emission')
    list_filter = ('statut', 'service')
    search_fields = ('numero_facture', 'patient__nom', 'patient__prenom', 'patient__numero_dossier')
    readonly_fields = ('numero_facture', 'montant_total', 'montant_part_assurance', 'montant_part_patient', 'montant_paye', 'montant_restant')
    inlines = [LigneFactureInline, PaiementInline]


@admin.register(TarifActe)
class TarifActeAdmin(admin.ModelAdmin):
    list_display = ('code_acte', 'libelle', 'type_acte', 'prix_unitaire', 'service', 'actif')
    list_filter = ('type_acte', 'actif', 'service')
    search_fields = ('code_acte', 'libelle')


@admin.register(EcheancierPaiement)
class EcheancierPaiementAdmin(admin.ModelAdmin):
    list_display = ('facture', 'montant_total_echeancier', 'nombre_echeances', 'periodicite', 'statut', 'engagement_signe')
    list_filter = ('statut', 'periodicite', 'engagement_signe')


@admin.register(Echeance)
class EcheanceAdmin(admin.ModelAdmin):
    list_display = ('echeancier', 'numero_echeance', 'date_echeance', 'montant_prevu', 'montant_paye', 'statut')
    list_filter = ('statut',)