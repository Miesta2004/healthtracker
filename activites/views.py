from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
from comptes.permissions import get_employe
from .models import JournalActivite
from .serializers import JournalActiviteSerializer


class JournalActiviteViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Lecture seule — le journal ne se remplit que via `journaliser()`,
    jamais par une écriture API directe. Chaque employé ne voit que
    l'activité de son propre service (cf. docstring du modèle) ; le
    superuser voit tout.
    """
    serializer_class = JournalActiviteSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            qs = JournalActivite.objects.select_related('employe', 'service').all()
        else:
            emp = get_employe(user)
            if emp is None or emp.service_id is None:
                return JournalActivite.objects.none()
            qs = JournalActivite.objects.select_related('employe', 'service').filter(
                service_id=emp.service_id
            )

        type_objet = self.request.query_params.get('type_objet')
        if type_objet:
            qs = qs.filter(type_objet=type_objet)

        action_param = self.request.query_params.get('action_type')
        if action_param:
            qs = qs.filter(action=action_param)

        employe_id = self.request.query_params.get('employe')
        if employe_id:
            qs = qs.filter(employe_id=employe_id)

        debut = self.request.query_params.get('debut')
        if debut:
            qs = qs.filter(date_creation__date__gte=debut)

        fin = self.request.query_params.get('fin')
        if fin:
            qs = qs.filter(date_creation__date__lte=fin)

        return qs

    @action(detail=False, methods=['get'], url_path='recentes')
    def recentes(self, request):
        """Les N dernières activités — alimente le bloc du Dashboard."""
        try:
            limite = min(int(request.query_params.get('limite', 8)), 50)
        except ValueError:
            limite = 8
        qs = self.get_queryset()[:limite]
        return Response(JournalActiviteSerializer(qs, many=True).data)