"""
Crée les comptes de démonstration s'ils n'existent pas (ne touche jamais aux comptes existants).
Lancée automatiquement à chaque déploiement sur Render.

  admin     / Admin@2026     (rôle admin)
  vendeur1  / Vendeur@2026   (rôle vendeur)

Les mots de passe peuvent être changés avec DEMO_ADMIN_PASSWORD et DEMO_VENDEUR_PASSWORD.
"""
import os

from django.core.management.base import BaseCommand

from magasin.models import Utilisateur


class Command(BaseCommand):
    help = "Crée les comptes de démonstration (admin et vendeur1) s'ils n'existent pas."

    def handle(self, *args, **options):
        comptes = [
            ('admin', 'admin@magasin.mg', 'admin', os.getenv('DEMO_ADMIN_PASSWORD', 'Admin@2026')),
            ('vendeur1', 'vendeur1@magasin.mg', 'vendeur', os.getenv('DEMO_VENDEUR_PASSWORD', 'Vendeur@2026')),
        ]
        for username, email, role, mot_de_passe in comptes:
            if Utilisateur.objects.filter(username=username).exists():
                self.stdout.write(f"  = {username} existe déjà (inchangé)")
                continue
            Utilisateur.objects.create_user(username=username, email=email,
                                            password=mot_de_passe, role=role)
            self.stdout.write(self.style.SUCCESS(f"  + {username} créé ({role})"))
