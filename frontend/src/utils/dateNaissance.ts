/**
 * Convertit un âge approximatif en date de naissance estimée.
 * Convention : 1er juillet de l'année de naissance déduite — minimise
 * l'écart moyen avec la vraie date, quel que soit le mois réel de naissance.
 * Utilisé quand un patient ne connaît pas sa date de naissance exacte
 * (urgence, absence de papiers) ; à corriger dès que la vraie date est connue
 * (voir `Patient.date_naissance_estimee`).
 */
export function dateNaissanceDepuisAge(age: number): string {
    const anneeNaissance = new Date().getFullYear() - age
    return `${anneeNaissance}-07-01`
}
