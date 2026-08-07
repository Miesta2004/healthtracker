import type { PassageUrgence, Hospitalisation, Operation, Patient, DemandeAnalyse } from '../../types'
import PriorityPatientsCard from './PriorityPatientsCard.tsx'
import BlocOperatoireCard from './BlocOperatoireCard.tsx'
import NurseWatchCard from './NurseWatchCard.tsx'
import SecretaryQueueCard from './SecretaryQueueCard.tsx'
import LabQueueCard from './LabQueueCard.tsx'
import AdminOverviewCard from './AdminOverviewCard.tsx'

interface Props {
    // Permissions (déjà calculées dans Dashboard.tsx, simplement passées ici)
    canSeeUrgences: boolean
    canSeeBloc: boolean
    isNurse: boolean
    isSecretaire: boolean
    isLaborantin: boolean
    isAdmin: boolean
    userId?: number

    // Données déjà chargées par Dashboard.tsx — aucun fetch dans ce composant
    urgences: PassageUrgence[] | null
    hospitalisations: Hospitalisation[] | null
    blocOperations: Operation[] | undefined
    blocLoading: boolean
    admissionsEnAttente: Patient[] | null
    patients: Patient[] | null
    demandesAnalyses: DemandeAnalyse[] | null
    effectif: { employes: number; services: number } | null
}

/**
 * Le Dashboard change de contenu selon le rôle connecté : chaque carte ici
 * correspond à un métier (spec §5 « Blocs métier »). Médecin et chirurgien
 * réutilisent des cartes déjà existantes (PriorityPatientsCard,
 * BlocOperatoireCard) ; infirmier, secrétaire et laborantin ont chacun une
 * carte dédiée mais bâtie sur des données déjà chargées ailleurs dans
 * Dashboard.tsx. L'admin est seul à conserver des chiffres globaux.
 */
export default function RoleWorkspace({
                                          canSeeUrgences, canSeeBloc, isNurse, isSecretaire, isLaborantin, isAdmin, userId,
                                          urgences, hospitalisations, blocOperations, blocLoading, admissionsEnAttente, patients, demandesAnalyses, effectif,
                                      }: Props) {
    const hasQueueCards = canSeeUrgences || canSeeBloc || isNurse || isSecretaire || isLaborantin

    if (!hasQueueCards && !isAdmin) return null

    return (
        <section className="space-y-6">
            {hasQueueCards && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {canSeeUrgences && <PriorityPatientsCard urgences={urgences} hospitalisations={hospitalisations} />}
                    {canSeeBloc && <BlocOperatoireCard operations={blocOperations} loading={blocLoading} />}
                    {isNurse && <NurseWatchCard hospitalisations={hospitalisations} />}
                    {isSecretaire && <SecretaryQueueCard admissionsEnAttente={admissionsEnAttente} patients={patients} />}
                    {isLaborantin && <LabQueueCard demandes={demandesAnalyses} userId={userId} />}
                </div>
            )}

            {isAdmin && (
                <AdminOverviewCard
                    effectif={effectif}
                    totalPatients={patients?.length ?? null}
                    totalUrgences={urgences?.length ?? null}
                    totalHospitalisations={hospitalisations?.length ?? null}
                />
            )}
        </section>
    )
}