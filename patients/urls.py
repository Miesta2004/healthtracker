from django.urls import path,include
from rest_framework.routers import DefaultRouter
from .views import PatientViewSet

router = DefaultRouter()
router.register(r'patients',PatientViewSet,basename='patients')

#Le DefaultRouter génère automatiquement toutes les URLs à partir de ton ViewSet.
# C'est lui qui crée :
#/api/patients/      → liste + création
#/api/patients/1/    → détail + modification + suppression

#Sans le router, tu devrais écrire chaque URL manuellement.
# C'est l'équivalent de @RestController + tous les @GetMapping, @PostMapping etc.
# en Spring — mais en une seule ligne.
urlpatterns = [
    path('',include(router.urls))
]