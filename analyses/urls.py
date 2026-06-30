from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DemandeAnalyseViewSet

router = DefaultRouter()
router.register(r'analyses', DemandeAnalyseViewSet, basename='analyse')

urlpatterns = [path('', include(router.urls))]