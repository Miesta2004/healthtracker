from rest_framework.routers import DefaultRouter
from .views import SalleBlocViewSet, InterventionChirurgicaleViewSet

router = DefaultRouter()
router.register('salles-bloc', SalleBlocViewSet, basename='salle-bloc')
router.register('operations', InterventionChirurgicaleViewSet, basename='operation')

urlpatterns = router.urls
