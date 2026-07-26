from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CreneauViewSet, ExceptionViewSet, AssignationPatientViewSet, gardes_planning

router = DefaultRouter()
router.register(r'creneaux',     CreneauViewSet,           basename='creneau')
router.register(r'exceptions',   ExceptionViewSet,         basename='exception')
router.register(r'assignations', AssignationPatientViewSet, basename='assignation')

urlpatterns = [
    path('gardes-planning/', gardes_planning, name='gardes-planning'),
    path('', include(router.urls)),
]