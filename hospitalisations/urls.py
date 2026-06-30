from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import HospitalisationViewSet

router = DefaultRouter()
router.register(r'hospitalisations', HospitalisationViewSet, basename='hospitalisation')

urlpatterns = [
    path('', include(router.urls)),
]
