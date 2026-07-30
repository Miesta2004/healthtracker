from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db import transaction


def _envoyer(groupe: str, payload: dict):
    channel_layer = get_channel_layer()
    if channel_layer is None:
        return  # CHANNEL_LAYERS mal configuré — on ne casse jamais une requête REST pour ça
    async_to_sync(channel_layer.group_send)(groupe, {
        'type': 'diffusion.message',
        'payload': payload,
    })


def diffuser_service(service_id, type_: str, action: str, **extra):
    """
    Diffuse un changement à tous les abonnés connectés du service concerné —
    différé jusqu'à ce que la transaction DB en cours soit réellement validée
    (transaction.on_commit), pour ne jamais notifier un client qui relirait
    via l'API une donnée pas encore commitée en base.
    """
    if service_id is None:
        return
    payload = {'type': type_, 'action': action, 'service_id': service_id, **extra}
    transaction.on_commit(lambda: _envoyer(f'service_{service_id}', payload))


def diffuser_utilisateur(user_id, type_: str, action: str, **extra):
    """Même principe que diffuser_service, mais pour un canal strictement personnel (Rappels)."""
    if user_id is None:
        return
    payload = {'type': type_, 'action': action, **extra}
    transaction.on_commit(lambda: _envoyer(f'user_{user_id}', payload))
