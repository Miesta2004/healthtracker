from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import JournalActiviteViewSet

router = DefaultRouter()
router.register(r'activites', JournalActiviteViewSet, basename='activite')

urlpatterns = [
    path('', include(router.urls))
]