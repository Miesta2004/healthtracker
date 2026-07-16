from datetime import timedelta
from django.utils import timezone
from .models import Shift


def shift_et_date_actuels(now=None):
    """
    Détermine le poste (shift) en cours et sa date "logique".
    Le poste de nuit (23h–7h) traverse minuit : entre 0h et 7h, on est
    encore dans le poste de nuit qui a COMMENCÉ la veille — donc sa date
    logique reste celle de la veille (comme sur un planning papier).
    """
    now = now or timezone.localtime()
    h = now.hour

    if 7 <= h < 15:
        return now.date(), Shift.MATIN
    if 15 <= h < 23:
        return now.date(), Shift.APRES_MIDI
    if h >= 23:
        return now.date(), Shift.NUIT
    return now.date() - timedelta(days=1), Shift.NUIT