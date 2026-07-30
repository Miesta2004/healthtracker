"""
ASGI config for healthtracker project.

Route HTTP vers l'app Django classique, WebSocket vers les consumers
Channels de l'app `temps_reel` — avec l'authentification par cookie JWT
(voir temps_reel/middleware.py) puisque le protocole WebSocket ne permet pas
d'utiliser le header Authorization comme les requêtes REST habituelles.

For more information on this file, see
https://docs.djangoproject.com/en/6.0/howto/deployment/asgi/
"""

import os

from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'healthtracker.settings')

# get_asgi_application() DOIT être appelé avant d'importer quoi que ce soit
# qui touche aux modèles Django (ici, via temps_reel.routing) — sinon
# AppRegistryNotReady.
django_asgi_app = get_asgi_application()

from channels.routing import ProtocolTypeRouter, URLRouter
from temps_reel.middleware import CookieJWTAuthMiddleware
from temps_reel.routing import websocket_urlpatterns

application = ProtocolTypeRouter({
    'http': django_asgi_app,
    'websocket': CookieJWTAuthMiddleware(
        URLRouter(websocket_urlpatterns)
    ),
})
