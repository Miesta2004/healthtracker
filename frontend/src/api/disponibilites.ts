import api from './client'
import type { CreneauDisponibilite, ExceptionDisponibilite } from '../types'

// ─── Créneaux récurrents ─────────────────────────────────────────────────────
export const getMesCreneaux = async (): Promise<CreneauDisponibilite[]> => {
    const res = await api.get('/creneaux/')
return res.data
}

export const getCreneauxSemaine = async (): Promise<CreneauDisponibilite[]> => {
const res = await api.get('/creneaux/semaine/')
return res.data
}

export const createCreneau = async (
data: Omit<CreneauDisponibilite, 'id' | 'employe' | 'jour_label' | 'type_label'>
): Promise<CreneauDisponibilite> => {
const res = await api.post('/creneaux/', data)
return res.data
}

export const updateCreneau = async (
id: number,
data: Partial<CreneauDisponibilite>
): Promise<CreneauDisponibilite> => {
const res = await api.patch(`/creneaux/${id}/`, data)
return res.data
}

export const deleteCreneau = async (id: number): Promise<void> => {
await api.delete(`/creneaux/${id}/`)
}

// ─── Exceptions (congés, absences…) ─────────────────────────────────────────
export const getMesExceptions = async (): Promise<ExceptionDisponibilite[]> => {
const res = await api.get('/exceptions/')
return res.data
}

export const createException = async (
data: Omit<ExceptionDisponibilite, 'id' | 'employe' | 'type_label' | 'valide' | 'date_creation'>
): Promise<ExceptionDisponibilite> => {
const res = await api.post('/exceptions/', data)
return res.data
}

export const deleteException = async (id: number): Promise<void> => {
await api.delete(`/exceptions/${id}/`)
}

// ─── Settings profil ─────────────────────────────────────────────────────────
export const updateMonProfil = async (data: {
telephone?: string
adresse?: string
signature_medicale?: string
preferences?: Record<string, unknown>
}): Promise<void> => {
await api.patch('/employes/update_profil/', data)
}

export const changePassword = async (data: {
ancien_mot_de_passe: string
nouveau_mot_de_passe: string
}): Promise<void> => {
await api.post('/employes/change_password/', data)
}

export const uploadMaPhoto = async (file: File): Promise<string> => {
const form = new FormData()
form.append('photo', file)
const res = await api.post('/employes/upload_ma_photo/', form, {
    headers: { 'Content-Type': 'multipart/form-data' }
})
return res.data.photo_path
}

export const getMaPhotoUrl = async (): Promise<string | null> => {
const res = await api.get('/employes/ma_photo_url/')
return res.data.url
}