from decimal import Decimal

from django.db import transaction
from django.db.models import Sum, F, DecimalField, ExpressionWrapper
from rest_framework import mixins, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Client, Produit, Vente, DetailVente
from .serializers import VenteSerializer


def erreur(message):
    return Response({'error': message}, status=400)


class ErreurVente(Exception):
    """Erreur métier : son message est montré tel quel à l'utilisateur."""


class VenteViewSet(mixins.CreateModelMixin,
                   mixins.ListModelMixin,
                   mixins.RetrieveModelMixin,
                   viewsets.GenericViewSet):
    """Créer et consulter les ventes. Pas de modification ni de suppression."""

    queryset = (Vente.objects.select_related('client', 'vendeur')
                .prefetch_related('details__produit'))
    serializer_class = VenteSerializer
    permission_classes = [IsAuthenticated]

    def create(self, request, *args, **kwargs):
        """
        Corps attendu :
        {
          "client": 1,
          "mode_paiement": "espece",
          "panier": [ {"produit": 1, "quantite": 2}, {"produit": 3, "quantite": 1} ]
        }
        """
        mode = request.data.get('mode_paiement')
        panier = request.data.get('panier') or []

        # --- Vérifications avant de toucher à la base ---
        try:
            client = Client.objects.get(pk=request.data.get('client'))
        except (Client.DoesNotExist, ValueError, TypeError):
            return erreur("Choisis un client.")

        if mode not in dict(Vente.PAIEMENT_CHOICES):
            return erreur("Choisis un mode de paiement (Espèce ou Mobile Money).")

        if not isinstance(panier, list) or not panier:
            return erreur("Le panier est vide, ajoute au moins un produit.")

        # Regroupe les lignes d'un même produit : {id_produit: quantité totale}
        lignes = {}
        for ligne in panier:
            try:
                id_produit = int(ligne.get('produit'))
                quantite = int(ligne.get('quantite'))
            except (TypeError, ValueError, AttributeError):
                return erreur("Panier invalide.")
            if quantite <= 0:
                return erreur("La quantité doit être supérieure à 0.")
            lignes[id_produit] = lignes.get(id_produit, 0) + quantite

        # --- Enregistrement : tout ou rien ---
        try:
            with transaction.atomic():
                vente = Vente.objects.create(
                    client=client, vendeur=request.user, mode_paiement=mode, total=0
                )
                total = Decimal('0')
                # Ordre fixe : évite les blocages si deux ventes se croisent
                for id_produit in sorted(lignes):
                    quantite = lignes[id_produit]
                    try:
                        # select_for_update : verrouille le produit pendant la vente
                        produit = Produit.objects.select_for_update().get(pk=id_produit)
                    except Produit.DoesNotExist:
                        raise ErreurVente("Un produit du panier n'existe plus.")
                    if quantite > produit.stock:
                        raise ErreurVente(
                            f"Stock insuffisant pour {produit.nom}. "
                            f"Stock disponible : {produit.stock}"
                        )
                    produit.stock -= quantite
                    produit.save(update_fields=['stock'])
                    DetailVente.objects.create(
                        vente=vente, produit=produit,
                        quantite=quantite, prix_unitaire=produit.prix,
                    )
                    total += produit.prix * quantite
                vente.total = total
                vente.save(update_fields=['total'])
        except ErreurVente as e:
            return erreur(str(e))

        return Response(VenteSerializer(vente).data, status=201)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard(request):
    ventes = Vente.objects.all()
    sous_total = ExpressionWrapper(
        F('quantite') * F('prix_unitaire'),
        output_field=DecimalField(max_digits=14, decimal_places=2),
    )

    ca = ventes.aggregate(s=Sum('total'))['s'] or 0

    # Alerte : stock strictement inférieur au seuil minimal
    sous_seuil = Produit.objects.filter(stock__lt=F('seuil_minimal'))

    top5 = (DetailVente.objects.values('produit__nom')
            .annotate(quantite=Sum('quantite'))
            .order_by('-quantite')[:5])

    par_categorie = (DetailVente.objects.values('produit__categorie__nom')
                     .annotate(total=Sum(sous_total))
                     .order_by('-total'))

    return Response({
        'nombre_ventes': ventes.count(),
        'chiffre_affaires': float(ca),
        'produits_sous_seuil': sous_seuil.count(),
        'liste_sous_seuil': list(sous_seuil.values('id', 'nom', 'stock', 'seuil_minimal')),
        'top_produits': [
            {'nom': t['produit__nom'], 'quantite': t['quantite']} for t in top5
        ],
        'ca_par_categorie': [
            {'categorie': c['produit__categorie__nom'], 'total': float(c['total'])}
            for c in par_categorie
        ],
    })