from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer

from comptes.permissions import get_employe


@database_sync_to_async
def _service_id_de(user):
    emp = get_employe(user)
    return emp.service_id if emp else None


class CalendrierConsumer(AsyncJsonWebsocketConsumer):
    """
    Canal de diffusion en lecture seule (le client n'envoie rien — les
    modifications passent toujours par l'API REST habituelle, qui déclenche
    ensuite une diffusion via temps_reel/broadcast.py). Le client reçoit un
    signal léger { type, action, ... } et va lui-même rafraîchir la donnée
    concernée via React Query, plutôt que de reconstruire l'objet complet
    côté serveur pour chaque abonné.

    Deux groupes rejoints à la connexion :
    - service_<id> : tout ce qui concerne le calendrier du service
      (RendezVous, EvenementAdministratif, InterventionChirurgicale, Gardes).
    - user_<id> : strictement personnel (Rappels).
    """

    async def connect(self):
        user = self.scope.get('user')
        if user is None or not user.is_authenticated:
            await self.close(code=4401)
            return

        self.groupes = [f'user_{user.id}']

        service_id = await _service_id_de(user)
        if service_id is not None:
            self.groupes.append(f'service_{service_id}')
        elif user.is_superuser:
            # Un superuser sans fiche Employe ne rattache à aucun service —
            # on ne le fait pas rejoindre tous les services (nombre inconnu à
            # la connexion, et coûteux à maintenir à jour) : à défaut, il
            # continuera de voir les mises à jour au prochain rechargement
            # manuel de la page plutôt qu'en push.
            pass

        for groupe in self.groupes:
            await self.channel_layer.group_add(groupe, self.channel_name)

        await self.accept()

    async def disconnect(self, close_code):
        for groupe in getattr(self, 'groupes', []):
            await self.channel_layer.group_discard(groupe, self.channel_name)

    # Point d'entrée générique appelé par group_send({'type': 'diffusion.message', ...})
    async def diffusion_message(self, event):
        await self.send_json(event['payload'])
