from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import ProtectedError
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Categorie, Fournisseur, Client, Produit
from .permissions import IsAdmin, IsAdminOrReadOnly
from .serializers import (
    UtilisateurSerializer, CategorieSerializer, FournisseurSerializer,
    ClientSerializer, ProduitSerializer,
)

User = get_user_model()


class SuppressionSecurisee:
    """Message clair au lieu d'une erreur 500 quand l'élément est utilisé ailleurs."""

    def destroy(self, request, *args, **kwargs):
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            return Response(
                {'error': "Suppression impossible : cet élément est utilisé "
                          "ailleurs (produits, ventes...)."},
                status=400,
            )


class CategorieViewSet(SuppressionSecurisee, viewsets.ModelViewSet):
    queryset = Categorie.objects.order_by('id')
    serializer_class = CategorieSerializer
    permission_classes = [IsAdmin]


class FournisseurViewSet(SuppressionSecurisee, viewsets.ModelViewSet):
    queryset = Fournisseur.objects.order_by('id')
    serializer_class = FournisseurSerializer
    permission_classes = [IsAdmin]


class ClientViewSet(SuppressionSecurisee, viewsets.ModelViewSet):
    queryset = Client.objects.order_by('id')
    serializer_class = ClientSerializer
    permission_classes = [IsAdminOrReadOnly]


class ProduitViewSet(SuppressionSecurisee, viewsets.ModelViewSet):
    queryset = Produit.objects.select_related('categorie', 'fournisseur').order_by('id')
    serializer_class = ProduitSerializer
    permission_classes = [IsAdminOrReadOnly]

    @action(detail=False, methods=['get'], url_path='prochaine-reference',
            permission_classes=[IsAdmin])
    def prochaine_reference(self, request):
        """Référence qui sera attribuée au prochain produit (affichée en grisé)."""
        return Response({'reference': Produit.prochaine_reference()})

    @action(detail=True, methods=['post'], url_path='ajouter-stock',
            permission_classes=[IsAdmin])
    def ajouter_stock(self, request, pk=None):
        """Ajoute une quantité reçue au stock d'un produit : {"quantite": 20}."""
        self.get_object()  # 404 si le produit n'existe pas
        try:
            quantite = int(request.data.get('quantite'))
        except (TypeError, ValueError):
            return Response({'error': "La quantité doit être un nombre entier."}, status=400)
        if quantite <= 0:
            return Response({'error': "La quantité à ajouter doit être supérieure à 0."},
                            status=400)
        if quantite > 1_000_000:
            return Response({'error': "Quantité trop grande (maximum 1 000 000 à la fois)."},
                            status=400)

        with transaction.atomic():
            produit = Produit.objects.select_for_update().get(pk=pk)
            produit.stock += quantite
            produit.save(update_fields=['stock'])
        return Response(self.get_serializer(produit).data)


class UtilisateurViewSet(SuppressionSecurisee, viewsets.ModelViewSet):
    queryset = User.objects.order_by('id')
    serializer_class = UtilisateurSerializer
    permission_classes = [IsAdmin]

    def destroy(self, request, *args, **kwargs):
        cible = self.get_object()
        # Un admin ne peut pas supprimer son propre compte
        if cible == request.user:
            return Response({'error': "Tu ne peux pas supprimer ton propre compte."},
                            status=400)
        # Il faut toujours garder au moins un administrateur
        if cible.role == 'admin' and User.objects.filter(role='admin').count() <= 1:
            return Response({'error': "Impossible : il faut toujours garder au moins "
                                      "un administrateur."}, status=400)
        return super().destroy(request, *args, **kwargs)