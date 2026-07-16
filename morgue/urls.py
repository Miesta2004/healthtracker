from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DecesViewSet, AutopsieViewSet

router = DefaultRouter()
router.register(r'deces', DecesViewSet, basename='deces')
router.register(r'autopsies', AutopsieViewSet, basename='autopsie')

urlpatterns = [
    path('', include(router.urls)),
]
