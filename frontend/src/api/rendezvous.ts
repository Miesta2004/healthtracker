import api from './client.ts'
import type { RendezVous, CreneauxDisponiblesResponse, MedecinsDisponiblesResponse, DatesDisponiblesResponse, PlanningResponse } from '../types'

export const getRendezVous = async (): Promise<RendezVous[]> => {
    const response = await api.get('/rendez_vous/')
    return response.data
}

export const getRendezVousPatient = async (patientId: number): Promise<RendezVous[]> => {
    const response = await api.get(`/rendez_vous/?patient=${patientId}`)
    return response.data
}

export const createRendezVous = async (data: Record<string, unknown>): Promise<RendezVous> => {
    const response = await api.post('/rendez_vous/', data)
    return response.data
}

export const updateRendezVous = async (id: number, data: Partial<RendezVous>): Promise<RendezVous> => {
    const response = await api.patch(`/rendez_vous/${id}/`, data)
    return response.data
}

export const deleteRendezVous = async (id: number): Promise<void> => {
    await api.delete(`/rendez_vous/${id}/`)
}

export const getCreneauxDisponibles = async (
    medecinId: number,
    date: string,
    options?: { duree?: number; excludeId?: number }
): Promise<CreneauxDisponiblesResponse> => {
    const params = new URLSearchParams({ medecin: String(medecinId), date })
    if (options?.duree) params.set('duree', String(options.duree))
    if (options?.excludeId) params.set('exclude', String(options.excludeId))
    const response = await api.get(`/rendez_vous/creneaux_disponibles/?${params.toString()}`)
    return response.data
}

export const getMedecinsDisponibles = async (
    date: string,
    duree?: number
): Promise<MedecinsDisponiblesResponse> => {
    const params = new URLSearchParams({ date })
    if (duree) params.set('duree', String(duree))
    const response = await api.get(`/rendez_vous/medecins_disponibles/?${params.toString()}`)
    return response.data
}

export const getDatesDisponibles = async (
    medecinId: number,
    options?: { debut?: string; jours?: number; duree?: number }
): Promise<DatesDisponiblesResponse> => {
    const params = new URLSearchParams({ medecin: String(medecinId) })
    if (options?.debut) params.set('debut', options.debut)
    if (options?.jours) params.set('jours', String(options.jours))
    if (options?.duree) params.set('duree', String(options.duree))
    const response = await api.get(`/rendez_vous/dates_disponibles/?${params.toString()}`)
    return response.data
}

export const getMonPlanning = async (debut?: string, fin?: string): Promise<PlanningResponse> => {
    const params = new URLSearchParams()
    if (debut) params.set('debut', debut)
    if (fin) params.set('fin', fin)
    const response = await api.get(`/rendez_vous/mon_planning/?${params.toString()}`)
    return response.data
}

// Planning générique (module Calendrier) — accessible à tous les rôles
// autorisés à voir les rendez-vous, pas seulement à un médecin sur son
// propre planning. Alimente les vues Jour/Semaine du calendrier.
export const getPlanning = async (debut?: string, fin?: string): Promise<PlanningResponse> => {
    const params = new URLSearchParams()
    if (debut) params.set('debut', debut)
    if (fin) params.set('fin', fin)
    const response = await api.get(`/rendez_vous/planning/?${params.toString()}`)
    return response.data
}