from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ModeleDocumentViewSet, DocumentGenereViewSet

router = DefaultRouter()
router.register(r'modeles-documents', ModeleDocumentViewSet, basename='modele-document')
router.register(r'documents-generes', DocumentGenereViewSet, basename='document-genere')

urlpatterns = [path('', include(router.urls))]
