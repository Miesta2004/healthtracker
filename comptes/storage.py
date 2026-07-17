import logging
import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

BUCKET = 'photos-profil'

TYPES_AUTORISES = {'image/jpeg', 'image/png', 'image/webp'}
TAILLE_MAX_OCTETS = 5 * 1024 * 1024  # 5 Mo


class FichierInvalide(Exception):
    """Levée quand le fichier uploadé ne respecte pas les contraintes (type/taille)."""
    pass


def get_supabase():
    url = os.getenv('SUPABASE_URL')
    key = os.getenv('SUPABASE_KEY')
    return create_client(url, key)


def _valider_fichier(file) -> bytes:
    """
    Valide le type MIME déclaré et la taille du fichier, puis retourne son
    contenu binaire. Lève FichierInvalide si une contrainte n'est pas respectée.
    """
    content_type = getattr(file, 'content_type', None)
    if content_type not in TYPES_AUTORISES:
        raise FichierInvalide(
            f"Type de fichier non autorisé ({content_type}). "
            f"Formats acceptés : JPEG, PNG, WEBP."
        )

    content = file.read()
    if len(content) > TAILLE_MAX_OCTETS:
        raise FichierInvalide(
            f"Fichier trop volumineux ({len(content) / 1_048_576:.1f} Mo). "
            f"Taille maximale : {TAILLE_MAX_OCTETS / 1_048_576:.0f} Mo."
        )
    if len(content) == 0:
        raise FichierInvalide("Le fichier envoyé est vide.")

    return content


def upload_photo(file, filename: str, folder: str = 'employes') -> str:
    """
    Upload une photo vers Supabase Storage privé.
    Retourne le path du fichier (pas une URL — on générera l'URL à la demande).
    Lève FichierInvalide si le fichier ne respecte pas les contraintes.
    """
    content = _valider_fichier(file)

    supabase = get_supabase()
    path = f"{folder}/{filename}"

    # Supprime l'ancienne photo si elle existe (échec non bloquant, mais loggé)
    try:
        supabase.storage.from_(BUCKET).remove([path])
    except Exception as exc:
        logger.warning("Échec suppression ancienne photo (path=%s) : %s", path, exc)

    supabase.storage.from_(BUCKET).upload(
        path,
        content,
        {"content-type": file.content_type}
    )

    return path


def get_signed_url(path: str, expires_in: int = 3600) -> str:
    """
    Génère une URL temporaire valable 1 heure.
    Appelée à chaque fois qu'on veut afficher la photo.
    """
    supabase = get_supabase()
    res = supabase.storage.from_(BUCKET).create_signed_url(
        path, expires_in
    )
    return res['signedURL']


def delete_photo(path: str):
    """Supprime une photo de Supabase Storage. Échec loggé, non bloquant."""
    try:
        supabase = get_supabase()
        supabase.storage.from_(BUCKET).remove([path])
    except Exception as exc:
        logger.warning("Échec suppression photo (path=%s) : %s", path, exc)