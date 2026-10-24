"""
Met en forme les données déjà saisies :
  - emails en minuscules (clients, fournisseurs, utilisateurs)
  - noms de clients en MAJUSCULES, prénoms Capitalisés

Aucune donnée n'est supprimée. Si la mise en forme créerait un doublon
(ex. deux emails identiques à la casse près), la ligne concernée est laissée telle quelle.
"""
from django.db import migrations

from magasin.validators import nom_majuscules, prenom_capitalise


def normaliser(apps, schema_editor):
    Client = apps.get_model('magasin', 'Client')
    Fournisseur = apps.get_model('magasin', 'Fournisseur')
    Utilisateur = apps.get_model('magasin', 'Utilisateur')

    # Emails en minuscules (uniquement si le résultat n'existe pas déjà ailleurs)
    for modele in (Client, Fournisseur, Utilisateur):
        for obj in modele.objects.exclude(email__isnull=True).exclude(email=''):
            minuscule = obj.email.strip().lower()
            if minuscule == obj.email:
                continue
            if modele.objects.filter(email=minuscule).exclude(pk=obj.pk).exists():
                continue
            obj.email = minuscule
            obj.save(update_fields=['email'])

    # Clients : NOM en majuscules, Prénom capitalisé
    for client in Client.objects.all():
        nom = nom_majuscules(client.nom)
        prenom = prenom_capitalise(client.prenom)
        if (nom, prenom) == (client.nom, client.prenom):
            continue
        if Client.objects.filter(nom=nom, prenom=prenom).exclude(pk=client.pk).exists():
            continue
        client.nom, client.prenom = nom, prenom
        client.save(update_fields=['nom', 'prenom'])


class Migration(migrations.Migration):

    dependencies = [
        ('magasin', '0002_alter_client_options_categorie_description_and_more'),
    ]

    operations = [
        migrations.RunPython(normaliser, migrations.RunPython.noop),
    ]
