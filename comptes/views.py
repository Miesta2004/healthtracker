from rest_framework import viewsets,status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from .models import Employe
from .serializers import EmployeSerializer, CreateEmployeSerializer
from .permissions import IsAdminRole, get_employe
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView
from .storage import upload_photo, get_signed_url, delete_photo
from django.contrib.auth.hashers import check_password


class EmployeViewSet(viewsets.ModelViewSet):
    queryset = Employe.objects.select_related('user', 'service').all()
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_serializer_class(self):
        if self.action == 'create':
            return CreateEmployeSerializer
        return EmployeSerializer

    def get_permissions(self):
        if self.action in ['create' , 'destroy' , 'update' , 'partial_update']:
            return [IsAdminRole()]
        return[IsAuthenticated()]

    def create(self, request):
        serializer = CreateEmployeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        if not request.user.is_superuser:
            # Un chef de service (rôle admin, non-superuser) ne peut créer
            # des employés que dans SON propre service, quoi que le
            # frontend ait envoyé.
            requester = get_employe(request.user)
            serializer.validated_data['service'] = requester.service if requester else None

        employe = serializer.save()

        #Upload photo si fournis
        if 'photo' in request.FILES:
            url = upload_photo(
                request.FILES['photo'],
                f"{employe.id}.jpg",
                folder='employes'
            )
            employe.photo_path = url
            employe.save()
        return Response(EmployeSerializer(employe).data, status=status.HTTP_201_CREATED)

    def perform_update(self, serializer):
        if not self.request.user.is_superuser:
            # Un chef de service ne peut pas déplacer un employé vers un
            # autre service — has_object_permission garantit déjà qu'il ne
            # peut modifier que les employés de SON service.
            serializer.validated_data.pop('service', None)
        serializer.save()

    def destroy(self, request, pk=None):
        employe = self.get_object()
        employe.user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def me(self, request):
        """Profil de l'utilisateur connecté"""
        try:
            employe = request.user.employe
            return Response(EmployeSerializer(employe).data)
        except Employe.DoesNotExist:
            return Response({
                'username': request.user.username,
                'role':'admin',
                'role_label':'Administrateur',
            })

    @action(detail=True, methods=['post'], permission_classes=[IsAdminRole])
    def upload_photo(self,request,pk=None):
        """Upload photo de profil d'un employé"""
        employe = self.get_object()
        if 'photo' not in request.FILES:
            return Response({'error':'Aucune photo fournie'}, status=400)
        url = upload_photo(
            request.FILES['photo'],
            f"{employe.id}.jpg",
            folder = 'employes'
        )
        employe.photo_path = url
        employe.save()
        return Response({'photo_path':url})

    @action(detail=False, methods=['patch'], permission_classes=[IsAuthenticated])
    def update_profil(self, request):
        """L'employé met à jour ses propres infos (téléphone, adresse, signature)."""
        emp = get_employe(request.user)
        if emp is None:
            return Response({'error': 'Employé introuvable'}, status=404)

        champs_autorises = ['telephone', 'adresse', 'signature_medicale', 'preferences']
        data = {k: v for k, v in request.data.items() if k in champs_autorises}
        serializer = EmployeSerializer(emp, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def change_password(self, request):
        """Changement de mot de passe self-service."""
        user = request.user
        ancien = request.data.get('ancien_mot_de_passe', '')
        nouveau = request.data.get('nouveau_mot_de_passe', '')

        if not check_password(ancien, user.password):
            return Response(
                {'error': 'Ancien mot de passe incorrect'},
                status=status.HTTP_400_BAD_REQUEST
            )
        if len(nouveau) < 8:
            return Response(
                {'error': 'Le nouveau mot de passe doit contenir au moins 8 caractères'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user.set_password(nouveau)
        user.save()
        return Response({'message': 'Mot de passe mis à jour avec succès'})


    @action(detail=False, methods=['post'],permission_classes=[IsAuthenticated],parser_classes=[MultiPartParser, FormParser])
    def upload_ma_photo(self, request):
        """L'employé connecté upload sa propre photo."""
        emp = get_employe(request.user)
        if emp is None:
            return Response({'error': 'Employé introuvable'}, status=404)
        if 'photo' not in request.FILES:
            return Response({'error': 'Aucune photo fournie'}, status=400)

        # Supprime l'ancienne si elle existe
        if emp.photo_path:
            delete_photo(emp.photo_path)

        url = upload_photo(
            request.FILES['photo'],
            f"{emp.id}.jpg",
            folder='employes'
        )
        emp.photo_path = url
        emp.save()
        return Response({'photo_path': url})


    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def ma_photo_url(self, request):
        """Retourne une URL signée temporaire pour la photo de l'employé connecté."""
        emp = get_employe(request.user)
        if emp is None or not emp.photo_path:
            return Response({'url': None})
        url = get_signed_url(emp.photo_path)
        return Response({'url': url})

class CustomTokenSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        try:
            e = user.employe
            token['role']        = e.role
            token['role_label']  = e.get_role_display()
            token['nom']         = e.nom
            token['prenom']      = e.prenom
            token['photo_path']  = e.photo_path or ''
            token['employe_id']  = e.id
            token['service_id']  = e.service_id or None
            token['service_nom'] = e.service.nom if e.service else None
        except Exception:
            token['role']        = 'admin'
            token['role_label']  = 'Administrateur'
            token['nom']         = user.last_name
            token['prenom']      = user.first_name
            token['photo_path']  = ''
            token['employe_id']  = None
            token['service_id']  = None
            token['service_nom'] = None
        return token

class CustomTokenView(TokenObtainPairView):
    serializer_class = CustomTokenSerializer