from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import EmployeViewSet

router = DefaultRouter()
router.register(r'employes',EmployeViewSet)
urlpatterns = [path('', include(router.urls))]