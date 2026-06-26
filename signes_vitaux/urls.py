from django.urls import path,include
from rest_framework.routers import DefaultRouter
from .views import SignesVitauxViewSet

router = DefaultRouter()
router.register(r'signes_vitaux', SignesVitauxViewSet, basename='signesvitaux')



urlpatterns = [
    path('',include(router.urls))
]