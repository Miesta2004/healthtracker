import { useCallback, useEffect, useState } from 'react'
import { getPatient, getSignesVitaux } from '../api/patients'
import { getAntecedents } from '../api/antecedents'
import { getConsultations } from '../api/consultations'
import { getAlertes } from '../api/alertes'
import { getDemandesPatient } from '../api/analyses'
import { getRendezVousPatient } from '../api/rendezvous'
import { getUrgencesPatient } from '../api/urgences'
import { getHospitalisations } from '../api/hospitalisations'
import { getAssignations } from '../api/disponibilites'
import { getEmployes } from '../api/comptes'
import type {
    Patient, SignesVitaux, Antecedent, Consultation, DemandeAnalyse,
    RendezVous, PassageUrgence, Hospitalisation, Alerte,
    AssignationPatient, Employe,
} from '../types'

export interface PatientDossierSectionErrors {
    signes?: boolean
    antecedents?: boolean
    consultations?: boolean
    demandes?: boolean
    rdvs?: boolean
    urgences?: boolean
    hospitalisations?: boolean
    alertes?: boolean
}

type SectionKey = keyof PatientDossierSectionErrors

const SECTIONS_INITIALES: Record<SectionKey, boolean> = {
    signes: true, antecedents: true, consultations: true, demandes: true,
    rdvs: true, urgences: true, hospitalisations: true, alertes: true,
}

export function usePatientDossier(patientId: number | undefined) {
    const [patient, setPatient] = useState<Patient | null>(null)
    const [signes, setSignes] = useState<SignesVitaux[]>([])
    const [antecedents, setAntecedents] = useState<Antecedent[]>([])
    const [consultations, setConsultations] = useState<Consultation[]>([])
    const [demandes, setDemandes] = useState<DemandeAnalyse[]>([])
    const [rdvs, setRdvs] = useState<RendezVous[]>([])
    const [urgences, setUrgences] = useState<PassageUrgence[]>([])
    const [hospitalisations, setHospitalisations] = useState<Hospitalisation[]>([])
    const [alertes, setAlertes] = useState<Alerte[]>([])

    // Ne concerne que le fetch du patient lui-même : c'est la SEULE chose qui
    // doit bloquer l'affichage initial de la page (pas de dossier sans patient).
    const [patientLoading, setPatientLoading] = useState(true)
    const [error, setError] = useState('')

    // Chaque section a son propre indicateur de chargement, mis à jour dès
    // que SA promesse résout — indépendamment des 7 autres. C'est ce qui
    // permet un affichage progressif au lieu d'un skeleton géant "tout ou rien".
    const [sectionsLoading, setSectionsLoading] = useState<Record<SectionKey, boolean>>(SECTIONS_INITIALES)
    const [sectionErrors, setSectionErrors] = useState<PatientDossierSectionErrors>({})

    const reload = useCallback(() => {
        if (!patientId) return

        setPatientLoading(true)
        setError('')
        setSectionErrors({})
        setSectionsLoading(SECTIONS_INITIALES)

        const markSectionDone = (key: SectionKey) =>
            setSectionsLoading(prev => ({ ...prev, [key]: false }))
        const markSectionError = (key: SectionKey) =>
            setSectionErrors(prev => ({ ...prev, [key]: true }))

        /**
         * Charge une section de façon totalement indépendante des autres :
         * dès que `promise` résout ou échoue, SEULE cette section met à jour
         * son état (données + loading + erreur éventuelle), sans attendre
         * les 7 autres fetches en cours.
         */
        function loadSection<T>(key: SectionKey, promise: Promise<T[]>, onSuccess: (data: T[]) => void) {
            promise
                .then(onSuccess)
                .catch(() => markSectionError(key))
                .finally(() => markSectionDone(key))
        }

        getPatient(patientId)
            .then((p) => {
                setPatient(p)

                // Les 8 sections partent en parallèle, mais chacune se
                // termine et s'affiche à son propre rythme — plus de
                // Promise.all qui attend la plus lente pour tout débloquer.
                loadSection('signes', getSignesVitaux(patientId), setSignes)
                loadSection('antecedents', getAntecedents(patientId), setAntecedents)
                loadSection('consultations', getConsultations(patientId), setConsultations)
                loadSection('demandes', getDemandesPatient(patientId), setDemandes)
                loadSection('rdvs', getRendezVousPatient(patientId), setRdvs)
                loadSection('urgences', getUrgencesPatient(patientId), setUrgences)
                loadSection('hospitalisations', getHospitalisations(patientId), setHospitalisations)
                loadSection('alertes', getAlertes(), (al) =>
                    setAlertes(al.filter(x => x.patient === patientId))
                )
            })
            .catch(() => {
                setError('Impossible de charger les données du patient.')
            })
            .finally(() => setPatientLoading(false))
    }, [patientId])

    useEffect(() => {
        reload()
    }, [reload])

    return {
        patient, setPatient,
        signes,
        antecedents, setAntecedents,
        consultations, setConsultations,
        demandes, setDemandes,
        rdvs,
        urgences,
        hospitalisations,
        alertes, setAlertes,
        patientLoading,
        error,
        sectionsLoading,
        sectionErrors,
        reload,
    }
}

export function usePatientAssignations(patient: Patient | null, enabled: boolean) {
    const [assignations, setAssignations] = useState<AssignationPatient[]>([])
    const [infirmiersService, setInfirmiersService] = useState<Employe[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(false)

    useEffect(() => {
        if (!enabled || !patient) return
        setError(false)
        setLoading(true)

        Promise.all([
            getAssignations({ patient: patient.id }).catch(() => { setError(true); return [] }),
            getEmployes().catch(() => []),
        ])
            .then(([assign, allEmployes]) => {
                setAssignations(assign)
                setInfirmiersService(
                    allEmployes.filter(e => e.role === 'infirmier' && e.service === patient.service)
                )
            })
            .finally(() => setLoading(false))
    }, [enabled, patient])

    return { assignations, setAssignations, infirmiersService, loading, error }
}