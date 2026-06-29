from django.urls import path,include
from rest_framework.routers import DefaultRouter
from .views import ConsultViewSet, RdvViewSet

router = DefaultRouter()
router.register(r'consultations', ConsultViewSet, basename='consultation')
router.register(r'rendez_vous', RdvViewSet, basename='rdv')

urlpatterns = [
    path('',include(router.urls)),
]