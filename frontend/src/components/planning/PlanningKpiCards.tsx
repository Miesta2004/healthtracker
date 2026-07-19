import { useEffect, useState } from 'react'
import { Scissors, Stethoscope, Users } from 'lucide-react'
import { getMonPlanning } from '../../api/rendezvous'
import { getMesPatientsSuivis } from '../../api/patients'

function lundiDeLaSemaineReelle(): Date {
    const d = new Date()
    const jour = d.getDay()
    const decalage = jour === 0 ? -6 : 1 - jour
    d.setDate(d.getDate() + decalage)
    d.setHours(0, 0, 0, 0)
    return d
}

function KpiCard({ icon: Icon, iconBg, iconColor, label, value, sub }: {
    icon: typeof Scissors; iconBg: string; iconColor: string; label: string; value: number | string; sub: string
}) {
    return (
        <div className="ht-card ht-card-padded-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: iconBg, color: iconColor }}>
                <Icon size={18} />
            </div>
            <div>
                <p className="text-xs" style={{ color: 'var(--ht-text-muted)' }}>{label}</p>
                <p className="text-xl font-bold" style={{ color: 'var(--ht-text)' }}>{value}</p>
                <p className="text-[11px]" style={{ color: 'var(--ht-text-muted)' }}>{sub}</p>
            </div>
        </div>
    )
}

// Indépendant de la vue/date navigée dans le calendrier : toujours la
// semaine calendaire réelle en cours, comme dans la maquette.
export default function PlanningKpiCards() {
    const [interventions, setInterventions] = useState<number | null>(null)
    const [consultations, setConsultations] = useState<number | null>(null)
    const [patientsSuivis, setPatientsSuivis] = useState<number | null>(null)

    useEffect(() => {
        const lundi = lundiDeLaSemaineReelle()
        const dimanche = new Date(lundi)
        dimanche.setDate(lundi.getDate() + 6)
        const iso = (d: Date) => d.toISOString().slice(0, 10)

        getMonPlanning(iso(lundi), iso(dimanche))
            .then(res => {
                setInterventions(res.evenements.filter(e => e.type_evenement === 'intervention' && e.statut !== 'annule').length)
                setConsultations(res.evenements.filter(e => e.type_evenement === 'consultation' && e.statut !== 'annule').length)
            })
            .catch(() => { setInterventions(0); setConsultations(0) })

        getMesPatientsSuivis()
            .then(list => setPatientsSuivis(list.length))
            .catch(() => setPatientsSuivis(0))
    }, [])

    return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <KpiCard icon={Scissors} iconBg="var(--ht-primary-tint-bg)" iconColor="var(--ht-primary-tint-text)"
                     label="Interventions" value={interventions ?? '—'} sub="cette semaine" />
            <KpiCard icon={Stethoscope} iconBg="var(--ht-success-bg)" iconColor="var(--ht-success)"
                     label="Consultations" value={consultations ?? '—'} sub="cette semaine" />
            <KpiCard icon={Users} iconBg="rgba(179, 157, 222, 0.16)" iconColor="var(--ht-violet)"
                     label="Patients suivis" value={patientsSuivis ?? '—'} sub="actifs" />
        </div>
    )
}
