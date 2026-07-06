from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CreneauViewSet, ExceptionViewSet

router = DefaultRouter()
router.register(r'creneaux',   CreneauViewSet,   basename='creneau')
router.register(r'exceptions', ExceptionViewSet, basename='exception')

urlpatterns = [path('', include(router.urls))]