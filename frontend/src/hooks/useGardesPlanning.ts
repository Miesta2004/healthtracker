import { useQuery } from '@tanstack/react-query'
import { getGardesPlanning } from '../api/disponibilites'

const GARDES_KEY = 'gardes-planning'

export function useGardesPlanning(debut: string, fin: string, enabled: boolean = true) {
    return useQuery({
        queryKey: [GARDES_KEY, debut, fin],
        queryFn: () => getGardesPlanning(debut, fin),
        placeholderData: (previousData) => previousData,
        enabled,
    })
}
