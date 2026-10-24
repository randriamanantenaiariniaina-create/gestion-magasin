from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.validators import UnicodeUsernameValidator
from .models import Categorie, Fournisseur, Client, Produit, Vente, DetailVente
from .validators import (
    valider_telephone, valider_email, valider_mot_de_passe,
    nom_majuscules, prenom_capitalise,
)

User = get_user_model()


def refuser_doublon(modele, champ, valeur, instance, message, etiquette=str):
    """
    Refuse la valeur si un AUTRE enregistrement l'a déjà (majuscules/minuscules
    ignorées). {autre} dans le message = nom de l'enregistrement en conflit.
    """
    qs = modele.objects.filter(**{f'{champ}__iexact': valeur})
    if instance is not None:
        qs = qs.exclude(pk=instance.pk)
    autre = qs.first()
    if autre:
        raise serializers.ValidationError(message.format(autre=etiquette(autre)))


class UtilisateurSerializer(serializers.ModelSerializer):
    # write_only : le mot de passe peut être envoyé, jamais renvoyé
    password = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'role', 'password']
        # On remplace le contrôle d'unicité de Django (message en anglais)
        extra_kwargs = {
            'username': {'validators': [UnicodeUsernameValidator()]},
            'email': {'required': True},
        }

    def validate_username(self, valeur):
        valeur = valeur.strip()
        refuser_doublon(User, 'username', valeur, self.instance,
                        "Ce nom d'utilisateur existe déjà.")
        return valeur

    def validate_email(self, valeur):
        valeur = valider_email(valeur)
        refuser_doublon(User, 'email', valeur, self.instance,
                        "Cet email est déjà utilisé par {autre}.",
                        etiquette=lambda u: u.username)
        return valeur

    def validate_role(self, valeur):
        # Le rôle d'un administrateur est verrouillé : on ne peut pas le rétrograder
        if (self.instance is not None and self.instance.role == 'admin'
                and valeur != 'admin'):
            raise serializers.ValidationError(
                "Le rôle d'un administrateur ne peut pas être modifié.")
        return valeur

    def validate_password(self, valeur):
        return valider_mot_de_passe(valeur)

    def validate(self, attrs):
        # À la création, le mot de passe est obligatoire
        if self.instance is None and not attrs.get('password'):
            raise serializers.ValidationError({'password': 'Le mot de passe est obligatoire.'})
        return attrs

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for champ, valeur in validated_data.items():
            setattr(instance, champ, valeur)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


class CategorieSerializer(serializers.ModelSerializer):
    class Meta:
        model = Categorie
        fields = '__all__'
        extra_kwargs = {'nom': {'validators': []}}

    def validate_nom(self, valeur):
        valeur = ' '.join(valeur.split())
        refuser_doublon(Categorie, 'nom', valeur, self.instance,
                        "Cette catégorie existe déjà.")
        return valeur


class FournisseurSerializer(serializers.ModelSerializer):
    class Meta:
        model = Fournisseur
        fields = '__all__'
        extra_kwargs = {
            'nom': {'validators': []},
            'telephone': {'validators': []},
            'email': {'validators': []},
        }

    def validate_nom(self, valeur):
        valeur = ' '.join(valeur.split())
        refuser_doublon(Fournisseur, 'nom', valeur, self.instance,
                        "Ce fournisseur existe déjà.")
        return valeur

    def validate_telephone(self, valeur):
        valeur = valider_telephone(valeur)
        refuser_doublon(Fournisseur, 'telephone', valeur, self.instance,
                        "Ce numéro est déjà utilisé par le fournisseur {autre}.")
        return valeur

    def validate_email(self, valeur):
        valeur = valider_email(valeur)
        refuser_doublon(Fournisseur, 'email', valeur, self.instance,
                        "Cet email est déjà utilisé par le fournisseur {autre}.")
        return valeur


class ClientSerializer(serializers.ModelSerializer):
    class Meta:
        model = Client
        fields = '__all__'
        validators = []  # le contrôle nom + prénom est fait dans validate()
        extra_kwargs = {
            'telephone': {'validators': []},
            'email': {'validators': []},
        }

    def validate_nom(self, valeur):
        return nom_majuscules(valeur)          # DUPONT

    def validate_prenom(self, valeur):
        return prenom_capitalise(valeur)       # Jean-Pierre

    def validate_telephone(self, valeur):
        # Téléphone facultatif : vide ou préfixe seul = pas de téléphone
        if valeur is None or valeur.strip() in ('', '+261'):
            return None
        valeur = valider_telephone(valeur)
        refuser_doublon(Client, 'telephone', valeur, self.instance,
                        "Ce numéro est déjà utilisé par le client {autre}.")
        return valeur

    def validate_email(self, valeur):
        # Email facultatif : vide = pas d'email (évite les doublons de "")
        if not valeur or not valeur.strip():
            return None
        valeur = valider_email(valeur)
        refuser_doublon(Client, 'email', valeur, self.instance,
                        "Cet email est déjà utilisé par le client {autre}.")
        return valeur

    def validate(self, attrs):
        nom = attrs.get('nom', getattr(self.instance, 'nom', None))
        prenom = attrs.get('prenom', getattr(self.instance, 'prenom', None))
        if nom and prenom:
            qs = Client.objects.filter(nom__iexact=nom, prenom__iexact=prenom)
            if self.instance is not None:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError(
                    {'prenom': "Ce client existe déjà (même nom et même prénom)."})
        return attrs


class ProduitSerializer(serializers.ModelSerializer):
    categorie_nom = serializers.CharField(source='categorie.nom', read_only=True)
    fournisseur_nom = serializers.CharField(source='fournisseur.nom', read_only=True)

    class Meta:
        model = Produit
        fields = '__all__'
        # Le stock ne se règle plus ici : il passe par la page « Stock »
        read_only_fields = ['stock']
        extra_kwargs = {'reference': {'required': False, 'validators': []}}

    def validate_reference(self, valeur):
        valeur = (valeur or '').strip()
        if valeur:
            refuser_doublon(Produit, 'reference', valeur, self.instance,
                            "Cette référence est déjà utilisée par {autre}.")
        return valeur

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get('request')
        # Le vendeur ne doit pas savoir chez qui on achète
        if request and request.user.role != 'admin':
            data.pop('fournisseur', None)
            data.pop('fournisseur_nom', None)
        return data

    def validate_prix(self, valeur):
        if valeur <= 0:
            raise serializers.ValidationError("Le prix doit être supérieur à 0.")
        return valeur

    def validate_seuil_minimal(self, valeur):
        if valeur < 0:
            raise serializers.ValidationError("Le seuil minimal ne peut pas être négatif.")
        return valeur


class DetailVenteSerializer(serializers.ModelSerializer):
    produit_nom = serializers.CharField(source='produit.nom', read_only=True)
    sous_total = serializers.SerializerMethodField()

    class Meta:
        model = DetailVente
        fields = ['id', 'produit', 'produit_nom', 'quantite', 'prix_unitaire', 'sous_total']

    def get_sous_total(self, obj):
        return obj.quantite * obj.prix_unitaire


class VenteSerializer(serializers.ModelSerializer):
    details = DetailVenteSerializer(many=True, read_only=True)
    client_nom = serializers.SerializerMethodField()
    vendeur_nom = serializers.CharField(source='vendeur.username', read_only=True)

    class Meta:
        model = Vente
        fields = ['id', 'date', 'client', 'client_nom', 'vendeur', 'vendeur_nom',
                  'mode_paiement', 'total', 'details']
        read_only_fields = ['vendeur', 'total']

    def get_client_nom(self, obj):
        return str(obj.client)