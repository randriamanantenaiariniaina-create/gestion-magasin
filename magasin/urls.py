from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from . import views, viewsets, ventes

router = DefaultRouter()
router.register('categories', viewsets.CategorieViewSet)
router.register('fournisseurs', viewsets.FournisseurViewSet)
router.register('clients', viewsets.ClientViewSet)
router.register('produits', viewsets.ProduitViewSet)
router.register('utilisateurs', viewsets.UtilisateurViewSet)
router.register('ventes', ventes.VenteViewSet, basename='vente')

urlpatterns = [
    path('', include(router.urls)),
    path('dashboard/', ventes.dashboard),
    path('auth/login/', views.ConnexionView.as_view()),
    path('auth/refresh/', TokenRefreshView.as_view()),
    path('auth/moi/', views.moi),
    path('auth/changer-mot-de-passe/', views.changer_mot_de_passe),
    path('auth/inscription/', views.inscription),
    path('auth/mot-de-passe-oublie/', views.mot_de_passe_oublie),
    path('auth/reinitialiser/', views.reinitialiser_mot_de_passe),
]