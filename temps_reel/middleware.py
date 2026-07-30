from http.cookies import SimpleCookie

from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django.conf import settings
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError


def _cookies_depuis_scope(scope) -> dict:
    """Channels ne parse pas les cookies dans le scope par défaut (contrairement
    à un HttpRequest Django) — on les extrait nous-mêmes du header brut."""
    for nom, valeur in scope.get('headers', []):
        if nom == b'cookie':
            jar = SimpleCookie()
            jar.load(valeur.decode('utf-8'))
            return {k: morsel.value for k, morsel in jar.items()}
    return {}


@database_sync_to_async
def _utilisateur_depuis_token(raw_token: str):
    auth = JWTAuthentication()
    try:
        validated = auth.get_validated_token(raw_token)
        return auth.get_user(validated)
    except (InvalidToken, TokenError):
        return AnonymousUser()


class CookieJWTAuthMiddleware(BaseMiddleware):
    """
    Authentifie les connexions WebSocket via le même cookie httpOnly JWT que
    l'API REST (cf. comptes/authentication.py:CookieJWTAuthentication) —
    le navigateur envoie automatiquement ce cookie lors du handshake
    WebSocket, exactement comme sur une requête HTTP classique.
    """

    async def __call__(self, scope, receive, send):
        cookies = _cookies_depuis_scope(scope)
        raw_token = cookies.get(settings.AUTH_COOKIE_ACCESS)

        scope['user'] = (
            await _utilisateur_depuis_token(raw_token) if raw_token else AnonymousUser()
        )
        return await super().__call__(scope, receive, send)
