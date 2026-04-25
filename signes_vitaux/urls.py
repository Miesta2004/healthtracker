from django.urls import path,include
from rest_framework.routers import DefaultRouter
from .views import SignesViewSet

router = DefaultRouter()
router.register(r'signes_vitaux',SignesViewSet)


urlpatterns = [
    path('',include(router.urls))
]