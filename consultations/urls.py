from django.urls import path,include
from rest_framework.routers import DefaultRouter
from .views import ConsultViewSet, RdvViewSet, EvenementAdministratifViewSet

router = DefaultRouter()
router.register(r'consultations', ConsultViewSet, basename='consultation')
router.register(r'rendez_vous', RdvViewSet, basename='rdv')
router.register(r'evenements_administratifs', EvenementAdministratifViewSet, basename='evenement-administratif')

urlpatterns = [
    path('',include(router.urls)),
]