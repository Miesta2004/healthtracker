from django.urls import re_path
from .consumers import CalendrierConsumer

websocket_urlpatterns = [
    re_path(r'^ws/calendrier/$', CalendrierConsumer.as_asgi()),
]
