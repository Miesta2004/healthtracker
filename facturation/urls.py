from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    FactureViewSet, LigneFactureViewSet, PaiementViewSet,
    EcheancierPaiementViewSet, EcheanceViewSet, TarifActeViewSet,
)

router = DefaultRouter()
router.register(r'factures', FactureViewSet, basename='facture')
router.register(r'lignes-facture', LigneFactureViewSet, basename='ligne-facture')
router.register(r'paiements', PaiementViewSet, basename='paiement')
router.register(r'echeanciers-paiement', EcheancierPaiementViewSet, basename='echeancier-paiement')
router.register(r'echeances', EcheanceViewSet, basename='echeance')
router.register(r'tarifs-actes', TarifActeViewSet, basename='tarif-acte')

urlpatterns = [
    path('', include(router.urls)),
]