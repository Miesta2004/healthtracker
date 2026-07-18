from rest_framework.routers import DefaultRouter
from .views import SalleBlocViewSet, OperationViewSet

router = DefaultRouter()
router.register('salles-bloc', SalleBlocViewSet, basename='salle-bloc')
router.register('operations', OperationViewSet, basename='operation')

urlpatterns = router.urls
