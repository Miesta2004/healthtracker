import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

BUCKET = 'photos-profil'

def get_supabase():
    url = os.getenv('SUPABASE_URL')
    key = os.getenv('SUPABASE_KEY')
    return create_client(url, key)

def upload_photo(file, filename: str, folder: str = 'employes') -> str:
    """
    Upload une photo vers Supabase Storage privé.
    Retourne le path du fichier (pas une URL — on générera l'URL à la demande).
    """
    supabase = get_supabase()
    path = f"{folder}/{filename}"

    # Supprime l'ancienne photo si elle existe
    try:
        supabase.storage.from_(BUCKET).remove([path])
    except:
        pass

    # Upload
    content = file.read()
    supabase.storage.from_(BUCKET).upload(
        path,
        content,
        {"content-type": file.content_type}
    )

    # Retourne le path (stocké en base) pas l'URL
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
    """Supprime une photo de Supabase Storage"""
    try:
        supabase = get_supabase()
        supabase.storage.from_(BUCKET).remove([path])
    except:
        pass