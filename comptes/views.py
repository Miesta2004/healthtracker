from rest_framework import viewsets,status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from .models import Employe
from .serializers import EmployeSerializer, CreateEmployeSerializer
from .storage import upload_photo

class IsAdminRole(IsAuthenticated):
    def has_permission(self, request , view):
        if not super().has_permission(request , view):
            return False
        try:
            return request.user.employe.role == 'admin'
        except:
            return request.user.is_superuser

class EmployeViewSet(viewsets.ModelViewSet):
    queryset = Employe.objects.select_related('user').all()
    parser_classes = [MultiPartParser , FormParser , JSONParser]

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
        employe = serializer.save()

        #Upload photo si fournis
        if 'photo' in request.FILES:
            url = upload_photo(
                request.FILES['photo'],
                f"{employe.id}.jpg",
                folder='employes'
            )
            employe.photo_url = url
            employe.save()
        return Response(EmployeSerializer(employe).data, status=status.HTTP_201_CREATED)

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
        employe.photo_url = url
        employe.save()
        return Response({'photo_path':url})