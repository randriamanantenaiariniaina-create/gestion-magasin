from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView

from .validators import valider_email, valider_mot_de_passe

User = get_user_model()


def erreur(message, code=400):
    return Response({'error': message}, status=code)


def message_validation(e):
    """Extrait le premier message d'une ValidationError."""
    return str(e.detail[0])


# ---------- Connexion ----------
class CustomTokenSerializer(TokenObtainPairSerializer):
    """Ajoute le nom et le rôle dans le jeton, et dans la réponse."""

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['username'] = user.username
        token['role'] = user.role
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        data['user'] = {
            'id': self.user.id,
            'username': self.user.username,
            'email': self.user.email,
            'role': self.user.role,
        }
        return data


class ConnexionView(TokenObtainPairView):
    serializer_class = CustomTokenSerializer


# ---------- Inscription ----------
@api_view(['POST'])
@permission_classes([AllowAny])
def inscription(request):
    username = (request.data.get('username') or '').strip()
    email = (request.data.get('email') or '').strip()
    password = request.data.get('password') or ''
    confirmation = request.data.get('confirmation') or ''

    if not (username and email and password and confirmation):
        return erreur("Tous les champs sont obligatoires.")
    try:
        email = valider_email(email)  # renvoyé en minuscules
        valider_mot_de_passe(password)
    except ValidationError as e:
        return erreur(message_validation(e))
    if password != confirmation:
        return erreur("Les 2 mots de passe ne correspondent pas.")
    if User.objects.filter(username__iexact=username).exists():
        return erreur("Ce nom d'utilisateur existe déjà.")
    if User.objects.filter(email__iexact=email).exists():
        return erreur("Cet email existe déjà.")

    # Toujours vendeur : seul un admin peut donner un autre rôle
    User.objects.create_user(username=username, email=email,
                             password=password, role='vendeur')
    return Response({'message': "Compte créé. Tu peux maintenant te connecter."},
                    status=201)


# ---------- Mot de passe oublié : envoi du lien ----------
@api_view(['POST'])
@permission_classes([AllowAny])
def mot_de_passe_oublie(request):
    email = (request.data.get('email') or '').strip()
    if not email:
        return erreur("Saisis ton adresse email.")

    # Même réponse que l'email existe ou non : on ne révèle pas qui a un compte
    reponse = Response({
        'message': "Si cet email correspond à un compte, un lien de "
                   "réinitialisation vient d'être envoyé."
    })

    for user in User.objects.filter(email__iexact=email, is_active=True):
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        lien = f"{settings.FRONTEND_URL}/reinitialiser/{uid}/{token}"
        send_mail(
            subject="Gestion de Magasin : réinitialisation du mot de passe",
            message=(
                f"Bonjour {user.username},\n\n"
                f"Pour choisir un nouveau mot de passe, ouvre ce lien "
                f"(valable 1 heure) :\n{lien}\n\n"
                f"Si tu n'as rien demandé, ignore ce message."
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
        )
    return reponse


# ---------- Mot de passe oublié : nouveau mot de passe ----------
@api_view(['POST'])
@permission_classes([AllowAny])
def reinitialiser_mot_de_passe(request):
    uid = request.data.get('uid') or ''
    token = request.data.get('token') or ''
    password = request.data.get('password') or ''
    confirmation = request.data.get('confirmation') or ''

    if not (password and confirmation):
        return erreur("Remplis les 2 champs de mot de passe.")
    try:
        valider_mot_de_passe(password)
    except ValidationError as e:
        return erreur(message_validation(e))
    if password != confirmation:
        return erreur("Les 2 mots de passe ne correspondent pas.")

    try:
        user = User.objects.get(pk=force_str(urlsafe_base64_decode(uid)))
    except (User.DoesNotExist, ValueError, TypeError, OverflowError):
        return erreur("Lien invalide ou expiré.")
    if not default_token_generator.check_token(user, token):
        return erreur("Lien invalide ou expiré.")

    user.set_password(password)
    user.save()
    return Response({'message': "Mot de passe modifié. Tu peux te connecter."})


# ---------- Qui suis-je ? (rôle toujours à jour) ----------
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def moi(request):
    """Le front l'appelle au démarrage : le rôle affiché vient de la base,
    pas d'une copie gardée dans le navigateur."""
    u = request.user
    return Response({'id': u.id, 'username': u.username,
                     'email': u.email, 'role': u.role})


# ---------- Changer SON mot de passe (admin ou vendeur) ----------
class LimiteChangementMotDePasse(UserRateThrottle):
    """5 essais par heure et par utilisateur (contre les devinettes)."""
    scope = 'changer_mdp'
    rate = '5/hour'


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def changer_mot_de_passe(request):
    # Throttle appliqué à la main : c'est la seule vue qui en a besoin
    throttle = LimiteChangementMotDePasse()
    if not throttle.allow_request(request, None):
        return erreur("Trop de tentatives. Réessaie dans une heure.", 429)

    ancien = request.data.get('ancien') or ''
    nouveau = request.data.get('nouveau') or ''
    confirmation = request.data.get('confirmation') or ''

    if not (ancien and nouveau and confirmation):
        return erreur("Remplis les 3 champs.")
    if not request.user.check_password(ancien):
        return erreur("Le mot de passe actuel est incorrect.")
    try:
        valider_mot_de_passe(nouveau)
    except ValidationError as e:
        return erreur(message_validation(e))
    if nouveau != confirmation:
        return erreur("Les 2 nouveaux mots de passe ne correspondent pas.")
    if nouveau == ancien:
        return erreur("Le nouveau mot de passe doit être différent de l'ancien.")

    request.user.set_password(nouveau)
    request.user.save()
    return Response({'message': "Mot de passe modifié."})