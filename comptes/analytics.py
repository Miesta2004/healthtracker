def stats_medecin(medecin):
    """
    Statistiques d'activité d'un médecin : patients dont il est référent,
    et consultations/opérations de ces patients.

    Note : Consultation n'est pas rattachée à un médecin précis dans le
    modèle actuel, donc ces chiffres reflètent l'activité des patients
    suivis par ce médecin, pas uniquement les actes qu'il a personnellement
    réalisés.
    """
    from consultations.models import Consultation
    from patients.models import Patient

    patients_qs = medecin.service.patients.filter(medecin_referent=medecin) if medecin.service_id else Patient.objects.none()
    consult_qs = Consultation.objects.filter(patient__in=patients_qs)

    return {
        'id': medecin.id,
        'nom': f"{medecin.prenom} {medecin.nom}",
        'specialite': medecin.specialite,
        'nb_patients': patients_qs.count(),
        'nb_consultations': consult_qs.filter(type_evenement='consultation').count(),
        'nb_operations': consult_qs.filter(type_evenement='operation').count(),
    }