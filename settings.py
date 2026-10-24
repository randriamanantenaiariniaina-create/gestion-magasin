"""
Configuration Django pour le projet gestion_magasin.
"""

from pathlib import Path
from dotenv import load_dotenv
import dj_database_url
import os

# Charge les variables du fichier .env (s'il existe)
load_dotenv()

# Racine du projet (dossier backend/)
BASE_DIR = Path(__file__).resolve().parent.parent

# ------------------- SÉCURITÉ -------------------
# RENDER=true est défini automatiquement par Render : en ligne, DEBUG est coupé par défaut
EN_LIGNE = bool(os.getenv('RENDER'))
SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-temporaire-a-changer')
DEBUG = os.getenv('DEBUG', 'False' if EN_LIGNE else 'True') == 'True'

# ALLOWED_HOSTS="monsite.onrender.com" (séparés par des virgules) ; par défaut tout est autorisé
ALLOWED_HOSTS = [h.strip() for h in os.getenv('ALLOWED_HOSTS', '*').split(',') if h.strip()]

# ------------------- APPLICATIONS -------------------
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Nos dépendances
    'rest_framework',
    'corsheaders',

    # Notre application
    'magasin',
]

# ------------------- MIDDLEWARE -------------------
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',   # doit être en haut
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',  # sert les fichiers statiques en ligne
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

# ------------------- BASE DE DONNÉES -------------------
DATABASES = {
    'default': {
        'ENGINE': os.getenv('DB_ENGINE', 'django.db.backends.postgresql'),
        'NAME': os.getenv('DB_NAME', 'magasin_db'),
        'USER': os.getenv('DB_USER', 'postgres'),
        'PASSWORD': os.getenv('DB_PASSWORD', ''),
        'HOST': os.getenv('DB_HOST', '127.0.0.1'),
        'PORT': os.getenv('DB_PORT', '5432'),
    }
}

# En ligne (Neon) : une seule adresse DATABASE_URL remplace les réglages ci-dessus
if os.getenv('DATABASE_URL'):
    DATABASES['default'] = dj_database_url.parse(os.environ['DATABASE_URL'], conn_max_age=0)

# ------------------- VALIDATION MOTS DE PASSE -------------------
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# ------------------- INTERNATIONALISATION -------------------
LANGUAGE_CODE = 'fr-fr'
TIME_ZONE = 'Indian/Antananarivo'
USE_I18N = True
USE_TZ = True

# ------------------- FICHIERS STATIQUES -------------------
STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STORAGES = {
    'default': {'BACKEND': 'django.core.files.storage.FileSystemStorage'},
    'staticfiles': {'BACKEND': 'whitenoise.storage.CompressedStaticFilesStorage'},
}

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ------------------- AUTHENTIFICATION PERSONNALISÉE -------------------
# On utilisera notre propre modèle Utilisateur (avec le rôle admin/vendeur)
AUTH_USER_MODEL = 'magasin.Utilisateur'

# ------------------- REST FRAMEWORK -------------------
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
}

# Durée de vie des jetons JWT
from datetime import timedelta
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=8),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
}

# ------------------- CORS -------------------
# CORS_ALLOWED_ORIGINS="https://monsite.vercel.app" (séparés par des virgules) restreint l'accès.
# Sans cette variable, tout le monde peut appeler l'API (pratique en développement).
_origines = [o.strip().rstrip('/') for o in os.getenv('CORS_ALLOWED_ORIGINS', '').split(',') if o.strip()]
if _origines:
    CORS_ALLOWED_ORIGINS = _origines
else:
    CORS_ALLOW_ALL_ORIGINS = True

# Derrière le proxy de Render : Django doit savoir que la connexion est en HTTPS
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
if os.getenv('RENDER_EXTERNAL_URL'):
    CSRF_TRUSTED_ORIGINS = [os.environ['RENDER_EXTERNAL_URL']]

# ------------------- EMAIL (mot de passe oublié) -------------------
# 1) BREVO_API_KEY défini   -> vrais emails par l'API de Brevo (fonctionne sur Render gratuit)
# 2) EMAIL_HOST_USER défini -> SMTP classique (Gmail...) ; bloqué sur Render gratuit
# 3) sinon                  -> les emails s'affichent dans la console / les logs
if os.getenv('BREVO_API_KEY'):
    EMAIL_BACKEND = 'magasin.email_backend.BrevoEmailBackend'
    DEFAULT_FROM_EMAIL = os.getenv('EMAIL_EXPEDITEUR', 'no-reply@magasin.mg')
elif os.getenv('EMAIL_HOST_USER'):
    EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
    EMAIL_HOST = os.getenv('EMAIL_HOST', 'smtp.gmail.com')
    EMAIL_PORT = int(os.getenv('EMAIL_PORT', '587'))
    EMAIL_USE_TLS = os.getenv('EMAIL_USE_TLS', 'True') == 'True'
    EMAIL_HOST_USER = os.environ['EMAIL_HOST_USER']
    EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD', '')
    DEFAULT_FROM_EMAIL = os.getenv('DEFAULT_FROM_EMAIL') or EMAIL_HOST_USER
else:
    EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
    DEFAULT_FROM_EMAIL = 'no-reply@magasin.mg'

# ------------------- LIEN VERS LE FRONTEND (emails) -------------------
FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:5173')

# Le lien de réinitialisation expire au bout d'1 heure
PASSWORD_RESET_TIMEOUT = 3600