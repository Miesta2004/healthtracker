from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CreneauViewSet, ExceptionViewSet, AssignationPatientViewSet

router = DefaultRouter()
router.register(r'creneaux',     CreneauViewSet,           basename='creneau')
router.register(r'exceptions',   ExceptionViewSet,         basename='exception')
router.register(r'assignations', AssignationPatientViewSet, basename='assignation')

urlpatterns = [path('', include(router.urls))]