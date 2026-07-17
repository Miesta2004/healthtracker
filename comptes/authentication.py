from django.conf import settings
from rest_framework.authentication import SessionAuthentication
from rest_framework_simplejwt.authentication import JWTAuthentication


class CookieJWTAuthentication(JWTAuthentication):
    """
    Authentifie via le JWT d'accès lu dans un cookie httpOnly plutôt que dans
    l'en-tête Authorization. Conserve la compatibilité avec un header
    Authorization: Bearer explicite si présent (utile pour un client API hors
    navigateur — script, Postman, une future app mobile qui ne veut pas de
    cookies).

    Différence de sécurité importante : le navigateur envoie le cookie
    automatiquement sur CHAQUE requête vers le domaine, contrairement à un
    header géré manuellement par le JS. Ça rend l'auth par cookie vulnérable
    au CSRF sur les méthodes qui modifient des données — on applique donc la
    même vérification CSRF que celle de SessionAuthentication de DRF dès que
    l'authentification passe par le cookie (jamais nécessaire pour le header
    Authorization, qu'un site tiers ne peut pas forger).
    """

    def authenticate(self, request):
        header = self.get_header(request)

        if header is not None:
            raw_token = self.get_raw_token(header)
            if raw_token is None:
                return None
            validated_token = self.get_validated_token(raw_token)
            return self.get_user(validated_token), validated_token

        raw_token = request.COOKIES.get(settings.AUTH_COOKIE_ACCESS)
        if raw_token is None:
            return None

        validated_token = self.get_validated_token(raw_token)
        # Authentification par cookie ⇒ vérification CSRF obligatoire sur les
        # méthodes non sûres (SessionAuthentication.enforce_csrf ne fait rien
        # sur GET/HEAD/OPTIONS, donc aucun impact sur la lecture).
        SessionAuthentication().enforce_csrf(request)

        return self.get_user(validated_token), validated_token