from django.db import models
from django.db.models import UniqueConstraint
from django.contrib.auth.models import AbstractUser


class Utilisateur(AbstractUser):
    """
    Notre modèle utilisateur personnalisé.
    Hérite de AbstractUser (username, email, password, first_name, last_name...)
    et ajoute un champ 'role'.
    """
    ROLE_CHOICES = (
        ('admin', 'Admin'),
        ('vendeur', 'Vendeur'),
    )
    role = models.CharField(
        max_length=10,
        choices=ROLE_CHOICES,
        default='vendeur',
        help_text="Admin = tout ; Vendeur = tableau de bord + ventes uniquement"
    )

    def __str__(self):
        return f"{self.username} ({self.role})"


class Categorie(models.Model):
    nom = models.CharField(max_length=100, unique=True)
    description = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ['nom']

    def __str__(self):
        return self.nom


class Fournisseur(models.Model):
    nom = models.CharField(max_length=100, unique=True)
    telephone = models.CharField(max_length=20, unique=True)
    email = models.EmailField(unique=True)
    adresse = models.CharField(max_length=200, blank=True)

    class Meta:
        ordering = ['nom']

    def __str__(self):
        return self.nom


class Client(models.Model):
    nom = models.CharField(max_length=100)
    prenom = models.CharField(max_length=100, default='')
    telephone = models.CharField(max_length=20, unique=True, blank=True, null=True)
    email = models.EmailField(unique=True, blank=True, null=True)
    adresse = models.CharField(max_length=200, blank=True)

    class Meta:
        ordering = ['nom', 'prenom']
        constraints = [
            UniqueConstraint(fields=['nom', 'prenom'], name='client_nom_prenom_unique'),
        ]

    def __str__(self):
        return f"{self.nom} {self.prenom}"

class Produit(models.Model):
    UNITE_CHOICES = (
        ('piece', 'Pièce'),
        ('litre', 'Litre (L)'),
        ('kg', 'Kilogramme (kg)'),
        ('g', 'Gramme (g)'),
        ('carton', 'Carton'),
        ('sachet', 'Sachet'),
        ('boite', 'Boîte'),
    )

    reference = models.CharField(max_length=50, unique=True, blank=True)
    nom = models.CharField(max_length=100)
    categorie = models.ForeignKey(Categorie, on_delete=models.PROTECT, related_name='produits')
    fournisseur = models.ForeignKey(Fournisseur, on_delete=models.PROTECT, related_name='produits')
    prix = models.DecimalField(max_digits=12, decimal_places=2)
    stock = models.IntegerField(default=0)
    seuil_minimal = models.IntegerField(default=5)
    unite = models.CharField(max_length=10, choices=UNITE_CHOICES, default='piece')

    class Meta:
        ordering = ['nom']

    @staticmethod
    def prochaine_reference():
        """Prochaine référence libre : PRD-00001, PRD-00002..."""
        dernier = Produit.objects.order_by('-id').first()
        num = (dernier.id + 1) if dernier else 1
        reference = f"PRD-{num:05d}"
        while Produit.objects.filter(reference=reference).exists():
            num += 1
            reference = f"PRD-{num:05d}"
        return reference

    def save(self, *args, **kwargs):
        # Si aucune référence n'est donnée, on génère la suivante
        if not self.reference:
            self.reference = Produit.prochaine_reference()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.reference} - {self.nom}"


class Vente(models.Model):
    PAIEMENT_CHOICES = (
        ('espece', 'Espèce'),
        ('mobile_money', 'Mobile Money'),
    )

    date = models.DateTimeField(auto_now_add=True)
    client = models.ForeignKey(Client, on_delete=models.PROTECT, related_name='ventes')
    vendeur = models.ForeignKey(Utilisateur, on_delete=models.PROTECT, related_name='ventes')
    mode_paiement = models.CharField(max_length=20, choices=PAIEMENT_CHOICES)
    total = models.DecimalField(max_digits=14, decimal_places=2, default=0)

    class Meta:
        ordering = ['-date']

    def __str__(self):
        return f"Vente #{self.id} - {self.total} Ar"


class DetailVente(models.Model):
    vente = models.ForeignKey(Vente, on_delete=models.CASCADE, related_name='details')
    produit = models.ForeignKey(Produit, on_delete=models.PROTECT)
    quantite = models.IntegerField()
    prix_unitaire = models.DecimalField(max_digits=12, decimal_places=2)

    def __str__(self):
        return f"{self.produit.nom} x{self.quantite}"