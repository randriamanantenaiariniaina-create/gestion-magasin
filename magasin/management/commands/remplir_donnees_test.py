"""
Remplit la base avec des données de démonstration pour voir toutes les fonctions :
pagination (plus de 10 lignes partout), produits sous le seuil, ruptures de stock,
ventes avec leurs reçus, plusieurs vendeurs...

    python manage.py remplir_donnees_test              (25 ventes au total)
    python manage.py remplir_donnees_test --ventes 60  (60 ventes au total)

On peut la relancer sans risque : ce qui existe déjà n'est ni modifié ni dupliqué.
"""
import random
from decimal import Decimal

from django.conf import settings
from django.contrib.auth.hashers import make_password
from django.core.management.base import BaseCommand, CommandError
from django.db import IntegrityError, transaction
from django.db.models import F

from magasin.models import (
    Categorie, Client, DetailVente, Fournisseur, Produit, Utilisateur, Vente,
)

from . import donnees_test as donnees


def creer(modele, filtre, valeurs):
    """Crée l'objet s'il n'existe pas déjà. Retourne (objet, True si créé)."""
    existant = modele.objects.filter(**filtre).first()
    if existant:
        return existant, False
    try:
        with transaction.atomic():
            return modele.objects.create(**valeurs), True
    except IntegrityError:
        # un téléphone ou un email identique existe déjà : on passe au suivant
        return None, False


class Command(BaseCommand):
    help = "Remplit la base avec des données de test (catégories, produits, clients, ventes...)."

    def add_arguments(self, parser):
        parser.add_argument('--ventes', type=int, default=25,
                            help="Nombre total de ventes voulu (défaut : 25).")
        parser.add_argument('--force', action='store_true',
                            help="Autorise la commande même si DEBUG est désactivé.")

    def handle(self, *args, **options):
        if not settings.DEBUG and not options['force']:
            raise CommandError(
                "DEBUG est désactivé : on dirait une base en ligne. "
                "Ces données sont faites pour les tests ; ajoute --force si tu es sûr."
            )

        bilan = {}
        self.stdout.write('Remplissage de la base, patiente quelques secondes...')

        # ---- Catégories
        self.stdout.write('  - catégories...')
        n = 0
        categories = {}
        for nom in donnees.CATEGORIES:
            obj, cree = creer(Categorie, {'nom__iexact': nom}, {'nom': nom})
            categories[nom] = obj
            n += cree
        bilan['Catégories créées'] = n

        # ---- Fournisseurs
        self.stdout.write('  - fournisseurs...')
        n = 0
        fournisseurs = {}
        for f in donnees.fournisseurs():
            obj, cree = creer(Fournisseur, {'nom__iexact': f['nom']}, f)
            fournisseurs[f['nom']] = obj
            n += cree
        bilan['Fournisseurs créés'] = n

        # ---- Clients
        self.stdout.write('  - clients...')
        n = 0
        for c in donnees.clients():
            _, cree = creer(Client, {'nom': c['nom'], 'prenom': c['prenom']}, c)
            n += cree
        bilan['Clients créés'] = n

        # ---- Produits (la référence PRD-xxxxx est générée toute seule)
        self.stdout.write('  - produits...')
        n = 0
        autre_fournisseur = Fournisseur.objects.order_by('id').first()
        for nom, nom_cat, prix, stock, seuil, unite in donnees.PRODUITS:
            categorie = categories.get(nom_cat) or Categorie.objects.filter(nom__iexact=nom_cat).first()
            fournisseur = (fournisseurs.get(donnees.FOURNISSEUR_PAR_CATEGORIE[nom_cat])
                           or autre_fournisseur)
            if not categorie or not fournisseur:
                continue
            _, cree = creer(Produit, {'nom__iexact': nom}, {
                'nom': nom, 'categorie': categorie, 'fournisseur': fournisseur,
                'prix': Decimal(prix), 'stock': stock, 'seuil_minimal': seuil, 'unite': unite,
            })
            n += cree
        bilan['Produits créés'] = n

        # ---- Vendeurs (en plus de admin et vendeur1)
        # Le chiffrement d'un mot de passe est volontairement lent : on le fait UNE seule fois
        # pour tous les vendeurs (même mot de passe), au lieu d'une fois par compte.
        self.stdout.write('  - vendeurs (le chiffrement du mot de passe peut prendre quelques secondes)...')
        mot_de_passe_chiffre = make_password(donnees.MOT_DE_PASSE_VENDEURS)
        n = 0
        for username, prenom, nom in donnees.VENDEURS:
            if Utilisateur.objects.filter(username=username).exists():
                continue
            Utilisateur.objects.create(
                username=username, email=f"{username}@magasin.mg",
                password=mot_de_passe_chiffre, role='vendeur',
                first_name=prenom, last_name=nom,
            )
            n += 1
        bilan['Vendeurs créés'] = n

        # ---- Ventes
        self.stdout.write('  - ventes...')
        bilan['Ventes créées'] = self.creer_ventes(options['ventes'])

        # ---- Résumé
        self.stdout.write(self.style.SUCCESS('\nDonnées de test prêtes.\n'))
        for libelle, valeur in bilan.items():
            self.stdout.write(f"  {libelle:<20} {valeur}")
        self.stdout.write('')
        self.stdout.write(
            f"  Total en base : {Categorie.objects.count()} catégories, "
            f"{Fournisseur.objects.count()} fournisseurs, {Client.objects.count()} clients, "
            f"{Produit.objects.count()} produits, {Utilisateur.objects.count()} utilisateurs, "
            f"{Vente.objects.count()} ventes."
        )
        sous_seuil = Produit.objects.filter(stock__lt=F('seuil_minimal')).count()
        ruptures = Produit.objects.filter(stock=0).count()
        self.stdout.write(f"  Produits sous le seuil : {sous_seuil} (dont {ruptures} en rupture)")
        self.stdout.write(f"  Mot de passe des vendeurs créés : {donnees.MOT_DE_PASSE_VENDEURS}\n")

    def creer_ventes(self, voulues):
        """Complète jusqu'au nombre voulu. Les produits sous le seuil ne sont pas vendus,
        pour que les alertes de stock restent visibles."""
        a_creer = max(0, voulues - Vente.objects.count())
        clients = list(Client.objects.all())
        vendeurs = list(Utilisateur.objects.all())
        if not a_creer or not clients or not vendeurs:
            return 0

        hasard = random.Random(2026)
        modes = [m for m, _ in Vente.PAIEMENT_CHOICES]
        creees = 0

        for _ in range(a_creer):
            vendables = list(Produit.objects.filter(stock__gt=F('seuil_minimal')))
            if not vendables:
                break
            choisis = hasard.sample(vendables, min(hasard.randint(1, 4), len(vendables)))

            with transaction.atomic():
                vente = Vente.objects.create(
                    client=hasard.choice(clients), vendeur=hasard.choice(vendeurs),
                    mode_paiement=hasard.choice(modes), total=0,
                )
                total = Decimal('0')
                for produit in choisis:
                    quantite = hasard.randint(1, min(4, produit.stock - produit.seuil_minimal))
                    DetailVente.objects.create(
                        vente=vente, produit=produit, quantite=quantite, prix_unitaire=produit.prix,
                    )
                    Produit.objects.filter(pk=produit.pk).update(stock=F('stock') - quantite)
                    total += produit.prix * quantite
                vente.total = total
                vente.save(update_fields=['total'])
            creees += 1
        return creees
