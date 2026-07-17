import logging

from rest_framework.views import exception_handler
from rest_framework.response import Response

logger = logging.getLogger(__name__)


def exception_handler_uniforme(exc, context):
    """
    Enveloppe le exception_handler par défaut de DRF pour renvoyer un format
    d'erreur JSON cohérent sur toute l'API :

        { "detail": "...", "code": "..." }

    Le frontend peut ainsi se fier à `error.response.data.detail` partout,
    sans avoir à deviner la forme de la réponse selon le type d'erreur DRF.
    Les erreurs non gérées par DRF (bugs Python non prévus) sont loggées
    puis renvoyées sous une forme générique, sans exposer la stack trace au
    client.
    """
    response = exception_handler(exc, context)

    if response is not None:
        detail = response.data.get('detail') if isinstance(response.data, dict) else None
        response.data = {
            'detail': detail or _premier_message_erreur(response.data),
            'code': getattr(exc, 'default_code', exc.__class__.__name__),
            'errors': response.data if not detail else None,
        }
        return response

    # Exception non gérée par DRF (bug non prévu) : on logge côté serveur
    # et on renvoie un message générique, jamais la stack trace brute.
    logger.exception("Exception non gérée dans la vue %s", context.get('view'))
    return Response(
        {'detail': "Une erreur interne est survenue.", 'code': 'internal_error'},
        status=500,
    )


def _premier_message_erreur(data) -> str:
    """Extrait un message lisible depuis un dict d'erreurs de validation DRF."""
    if isinstance(data, dict):
        for value in data.values():
            if isinstance(value, list) and value:
                return str(value[0])
            if isinstance(value, str):
                return value
    if isinstance(data, list) and data:
        return str(data[0])
    return "Une erreur est survenue."