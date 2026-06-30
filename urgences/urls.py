from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PassageUrgenceViewSet

router = DefaultRouter()
router.register(r'urgences', PassageUrgenceViewSet, basename='urgence')

urlpatterns = [
    path('', include(router.urls)),
]
