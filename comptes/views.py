from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.authentication import SessionAuthentication
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.conf import settings
from django.middleware.csrf import get_token
from .models import Employe, HabilitationService
from .serializers import EmployeSerializer, CreateEmployeSerializer, HabilitationServiceSerializer
from .permissions import IsAdminRole, PeutGererHabilitations, get_employe
from .capacites import Capacite
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer, TokenRefreshSerializer
from .storage import upload_photo, get_signed_url, delete_photo, FichierInvalide
from django.contrib.auth.hashers import check_password


class EmployeViewSet(viewsets.ModelViewSet):
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        qs = Employe.objects.select_related('user', 'service').all()

        user = self.request.user
        if user.is_superuser:
            return qs

        emp = get_employe(user)
        if emp is None:
            return Employe.objects.none()

        qs_propre_service = qs.filter(service=emp.service) if emp.service else Employe.objects.none()

        # Chef de Chirurgie (capacité BLOC_GERER) : doit pouvoir chercher un
        # chirurgien d'un AUTRE service pour l'habiliter (HabilitationService
        # concerne par nature un employé qui n'est pas de son service) — même
        # principe transversal que PatientViewSet.get_queryset.
        if emp.a_la_capacite(Capacite.BLOC_GERER):
            from .capacites import roles_avec_capacite
            autres_chirurgiens = qs.filter(role__in=roles_avec_capacite(Capacite.ACTES_MEDICAUX_GERER))
            return (qs_propre_service | autres_chirurgiens).distinct()

        return qs_propre_service

    def get_serializer_class(self):
        if self.action == 'create':
            return CreateEmployeSerializer
        return EmployeSerializer

    def get_permissions(self):
        if self.action in ['create', 'destroy', 'update', 'partial_update']:
            return [IsAdminRole()]
        return [IsAuthenticated()]

    def create(self, request):
        serializer = CreateEmployeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        if not request.user.is_superuser:
            requester = get_employe(request.user)
            serializer.validated_data['service'] = requester.service if requester else None

        employe = serializer.save()

        if 'photo' in request.FILES:
            try:
                url = upload_photo(
                    request.FILES['photo'],
                    f"{employe.id}.jpg",
                    folder='employes'
                )
                employe.photo_path = url
                employe.save()
            except FichierInvalide as exc:
                return Response(
                    {
                        **EmployeSerializer(employe).data,
                        'photo_error': str(exc),
                    },
                    status=status.HTTP_201_CREATED,
                )

        return Response(EmployeSerializer(employe).data, status=status.HTTP_201_CREATED)

    def perform_update(self, serializer):
        if not self.request.user.is_superuser:
            serializer.validated_data.pop('service', None)
        serializer.save()

    def destroy(self, request, pk=None):
        employe = self.get_object()
        employe.actif = False
        employe.user.is_active = False
        employe.user.save(update_fields=['is_active'])
        employe.save(update_fields=['actif'])
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def me(self, request):
        try:
            employe = request.user.employe
            return Response(EmployeSerializer(employe).data)
        except Employe.DoesNotExist:
            return Response({
                'username': request.user.username,
                'role': 'admin',
                'role_label': 'Administrateur',
            })

    @action(detail=True, methods=['post'], permission_classes=[IsAdminRole])
    def upload_photo(self, request, pk=None):
        employe = self.get_object()
        if 'photo' not in request.FILES:
            return Response({'error': 'Aucune photo fournie'}, status=400)
        try:
            url = upload_photo(
                request.FILES['photo'],
                f"{employe.id}.jpg",
                folder='employes'
            )
        except FichierInvalide as exc:
            return Response({'error': str(exc)}, status=400)
        employe.photo_path = url
        employe.save()
        return Response({'photo_path': url})

    @action(detail=False, methods=['patch'], permission_classes=[IsAuthenticated])
    def update_profil(self, request):
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

    @action(
        detail=False, methods=['post'],
        permission_classes=[IsAuthenticated],
        parser_classes=[MultiPartParser, FormParser]
    )
    def upload_ma_photo(self, request):
        emp = get_employe(request.user)
        if emp is None:
            return Response({'error': 'Employé introuvable'}, status=404)
        if 'photo' not in request.FILES:
            return Response({'error': 'Aucune photo fournie'}, status=400)

        try:
            url = upload_photo(
                request.FILES['photo'],
                f"{emp.id}.jpg",
                folder='employes'
            )
        except FichierInvalide as exc:
            return Response({'error': str(exc)}, status=400)

        ancienne_photo = emp.photo_path
        emp.photo_path = url
        emp.save()
        if ancienne_photo:
            delete_photo(ancienne_photo)

        return Response({'photo_path': url})

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def ma_photo_url(self, request):
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


def _set_auth_cookies(response, access_token, refresh_token=None):
    """Pose les cookies httpOnly access/refresh sur la réponse HTTP."""
    access_lifetime = settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME']
    response.set_cookie(
        settings.AUTH_COOKIE_ACCESS, str(access_token),
        max_age=int(access_lifetime.total_seconds()),
        httponly=True, secure=settings.AUTH_COOKIE_SECURE,
        samesite=settings.AUTH_COOKIE_SAMESITE, path='/',
    )
    if refresh_token is not None:
        refresh_lifetime = settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME']
        # Path restreint : ce cookie n'a besoin d'être envoyé qu'aux endpoints
        # d'auth (refresh/logout), pas à toute l'API — réduit la surface
        # d'exposition en cas de faille XSS ailleurs sur le site.
        response.set_cookie(
            settings.AUTH_COOKIE_REFRESH, str(refresh_token),
            max_age=int(refresh_lifetime.total_seconds()),
            httponly=True, secure=settings.AUTH_COOKIE_SECURE,
            samesite=settings.AUTH_COOKIE_SAMESITE, path='/api/auth/',
        )


def _clear_auth_cookies(response):
    response.delete_cookie(settings.AUTH_COOKIE_ACCESS, path='/')
    response.delete_cookie(settings.AUTH_COOKIE_REFRESH, path='/api/auth/')


class CookieTokenObtainView(APIView):
    """
    POST /api/auth/login/ — valide les identifiants et pose les cookies
    httpOnly access/refresh. Ne renvoie JAMAIS les tokens dans le corps de la
    réponse (c'est tout l'intérêt : le JS ne doit jamais pouvoir les lire).
    """
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = CustomTokenSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        tokens = serializer.validated_data

        response = Response({'detail': 'Connexion réussie.'}, status=status.HTTP_200_OK)
        _set_auth_cookies(response, tokens['access'], tokens['refresh'])
        # Force la pose du cookie csrftoken (lisible en JS, pas httpOnly) dès
        # la connexion, pour que le frontend puisse l'envoyer en header sur
        # les requêtes suivantes qui modifient des données.
        get_token(request)
        return response


class CookieTokenRefreshView(APIView):
    """
    POST /api/auth/refresh/ — lit le refresh token dans son cookie httpOnly
    (jamais dans le corps de la requête) et pose un nouveau cookie access
    (+ un nouveau cookie refresh, ROTATE_REFRESH_TOKENS étant actif).
    """
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        # Le cookie refresh est envoyé automatiquement par le navigateur ⇒
        # vérification CSRF nécessaire ici aussi (sinon un site tiers pourrait
        # forcer un refresh silencieux, sans intérêt direct pour lui, mais on
        # reste cohérent : toute requête POST authentifiée par cookie doit
        # être protégée).
        SessionAuthentication().enforce_csrf(request)

        raw_refresh = request.COOKIES.get(settings.AUTH_COOKIE_REFRESH)
        if not raw_refresh:
            return Response({'detail': 'Session expirée, reconnexion nécessaire.'}, status=status.HTTP_401_UNAUTHORIZED)

        serializer = TokenRefreshSerializer(data={'refresh': raw_refresh})
        try:
            serializer.is_valid(raise_exception=True)
        except Exception:
            response = Response({'detail': 'Session expirée, reconnexion nécessaire.'}, status=status.HTTP_401_UNAUTHORIZED)
            _clear_auth_cookies(response)
            return response

        data = serializer.validated_data
        response = Response({'detail': 'Token rafraîchi.'}, status=status.HTTP_200_OK)
        _set_auth_cookies(response, data['access'], data.get('refresh'))
        get_token(request)
        return response


class LogoutView(APIView):
    """
    POST /api/auth/logout/ — supprime les cookies. Volontairement accessible
    sans authentification stricte : son seul effet est de nettoyer des
    cookies, jamais une opération sensible, et elle doit réussir même si
    l'access token est déjà expiré au moment où l'utilisateur clique sur
    "déconnexion".
    """
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        response = Response({'detail': 'Déconnecté.'}, status=status.HTTP_200_OK)
        _clear_auth_cookies(response)
        return response


class HabilitationServiceViewSet(viewsets.ModelViewSet):
    """
    CRUD des habilitations à opérer dans un service qui n'est pas le sien.
    Lecture ouverte à tout employé authentifié (utile pour qu'un chirurgien
    consulte ses propres habilitations, ou qu'un chef de service voie qui
    est habilité chez lui) ; écriture exclusive au Chef de Chirurgie (+
    superuser) via PeutGererHabilitations — volontairement transversale,
    sans restriction de service.
    """
    serializer_class = HabilitationServiceSerializer

    def get_queryset(self):
        qs = HabilitationService.objects.select_related('employe', 'service')
        service_id = self.request.query_params.get('service')
        employe_id = self.request.query_params.get('employe')
        actif = self.request.query_params.get('actif')
        if service_id:
            qs = qs.filter(service_id=service_id)
        if employe_id:
            qs = qs.filter(employe_id=employe_id)
        if actif is not None:
            qs = qs.filter(actif=actif.lower() in ('1', 'true'))
        return qs.order_by('-date_creation')

    def get_permissions(self):
        if self.request.method in ('GET', 'HEAD', 'OPTIONS'):
            return [IsAuthenticated()]
        return [PeutGererHabilitations()]