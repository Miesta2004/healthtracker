"""
URL configuration for healthtracker project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path,include
from rest_framework_simplejwt.views import (
    TokenObtainPairView,   # Vue pour le LOGIN → reçoit email+password, retourne les tokens
    TokenRefreshView,      # Vue pour RAFRAÎCHIR → reçoit refresh_token, retourne nouveau access_token
)
from drf_yasg.views import get_schema_view
from drf_yasg import openapi
from rest_framework.permissions import AllowAny

schema_view = get_schema_view(
    openapi.Info(
        title="HealthTracker API",
        default_version='v1',
        description="API de suivi des patients",
    ),
    public=True,
    permission_classes=[AllowAny],
)


urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('healthtracker.api_urls')),
    #JWT Auth
    #👉 L'interface admin Django. Va sur /admin/ dans le navigateur et tu as un back-office complet automatiquement.
    # Comme phpMyAdmin mais en mieux.
    path('api/auth/login/', TokenObtainPairView.as_view(),name='token_obtain_pair'),
    path('api/auth/refresh/', TokenRefreshView.as_view(),name='token_refresh'),
    #Swagger
    path('api/docs/', schema_view.with_ui('swagger', cache_timeout=0), name='swagger-ui'),

]
