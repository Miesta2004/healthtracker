from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import EmployeViewSet, HabilitationServiceViewSet, RappelViewSet

router = DefaultRouter()
router.register(r'employes',EmployeViewSet,basename='employes')
router.register(r'habilitations-service', HabilitationServiceViewSet, basename='habilitations-service')
router.register(r'rappels', RappelViewSet, basename='rappels')
urlpatterns = [path('', include(router.urls))]