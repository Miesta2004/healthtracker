from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AntecedentViewSet

router = DefaultRouter()
router.register(r'antecedents', AntecedentViewSet)
urlpatterns = [path('', include(router.urls))]
