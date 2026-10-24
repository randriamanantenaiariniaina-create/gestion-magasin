import re
from rest_framework import serializers

# Téléphone malgache : +261 3X XX XXX XX, avec X = 2, 3, 4, 7 ou 8 (32, 33, 34, 37, 38)
REGEX_TELEPHONE = re.compile(r'^\+261 3[23478] \d{2} \d{3} \d{2}$')
REGEX_EMAIL = re.compile(r'^[\w.-]+@[\w.-]+\.[a-zA-Z]{2,}$')
# 8 caractères min : majuscule + minuscule + chiffre + caractère spécial
REGEX_MOT_DE_PASSE = re.compile(
    r'^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};\':"\\|,.<>/?]).{8,}$'
)


def valider_telephone(valeur):
    if not REGEX_TELEPHONE.match(valeur.strip()):
        raise serializers.ValidationError(
            "Le téléphone doit commencer par +261 32, +261 33, +261 34, "
            "+261 37 ou +261 38, suivi de 7 chiffres (ex. : +261 34 12 345 67)."
        )
    return valeur.strip()


def valider_email(valeur):
    """Vérifie le format, puis renvoie l'email en minuscules."""
    if not REGEX_EMAIL.match(valeur.strip()):
        raise serializers.ValidationError(
            "L'email doit contenir un @ et un domaine valide."
        )
    return valeur.strip().lower()


def valider_mot_de_passe(valeur):
    if not REGEX_MOT_DE_PASSE.match(valeur):
        raise serializers.ValidationError(
            "Le mot de passe doit contenir au moins 8 caractères, une majuscule, "
            "une minuscule, un chiffre et un caractère spécial."
        )
    return valeur


def nom_majuscules(valeur):
    """Nom de famille en MAJUSCULES, espaces superflus retirés."""
    return ' '.join((valeur or '').split()).upper()


def prenom_capitalise(valeur):
    """Prénom avec une majuscule à chaque mot (jean-pierre -> Jean-Pierre)."""
    mots = ' '.join((valeur or '').split())
    return '-'.join(
        ' '.join(m.capitalize() for m in partie.split(' '))
        for partie in mots.split('-')
    )