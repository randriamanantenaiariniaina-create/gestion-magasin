"""
Données de démonstration (sans Django, donc facile à relire et à modifier).
Utilisées par la commande :  python manage.py remplir_donnees_test
"""
import re
import unicodedata

REGEX_TEL = re.compile(r'^\+261 3[23478] \d{2} \d{3} \d{2}$')


def sans_accent(texte):
    return ''.join(c for c in unicodedata.normalize('NFD', texte) if unicodedata.category(c) != 'Mn')


def slug(texte):
    return re.sub(r'[^a-z0-9]+', '-', sans_accent(texte).lower()).strip('-')


def telephone(i, decalage=0):
    """Numéro valide et différent pour chaque i : +261 3X NN NNN NN."""
    prefixe = ['32', '33', '34', '37', '38'][i % 5]
    return f"+261 {prefixe} {10 + (i % 80):02d} {100 + (i * 7 + decalage) % 900:03d} {10 + (i * 3) % 90:02d}"


# ---------------------------------------------------------------- Catégories (12 -> 2 pages)
CATEGORIES = [
    'Boissons', 'Epicerie', 'Hygiène', 'Produits laitiers', 'Fruits et légumes',
    'Boulangerie', 'Viandes et poissons', 'Entretien', 'Papeterie',
    # Ces trois-là restent vides : pratique pour tester la suppression d'une catégorie
    'Cosmétiques', 'Vêtements', 'Electroménager',
]

# ---------------------------------------------------------------- Fournisseurs (12 -> 2 pages)
FOURNISSEURS = [
    ('Distribution Antsirabe', 'Antsirabe'),
    ('Grossiste Tana Centre', 'Antananarivo'),
    ('Hygiène Plus Madagascar', 'Antananarivo'),
    ('Laiterie du Vakinankaratra', 'Antsirabe'),
    ('Fermes Réunies Itasy', 'Miarinarivo'),
    ('Boulangerie Les Délices', 'Antananarivo'),
    ('Pêcheries et Boucheries du Sud', 'Toliara'),
    ('Entretien Pro Mada', 'Antananarivo'),
    ('Papeterie Moderne', 'Antananarivo'),
    ('Import Tamatave', 'Toamasina'),
    ('Cosmétiques Océan Indien', 'Mahajanga'),
    ('Ménager Plus', 'Fianarantsoa'),
]

FOURNISSEUR_PAR_CATEGORIE = {
    'Boissons': 'Distribution Antsirabe',
    'Epicerie': 'Grossiste Tana Centre',
    'Hygiène': 'Hygiène Plus Madagascar',
    'Produits laitiers': 'Laiterie du Vakinankaratra',
    'Fruits et légumes': 'Fermes Réunies Itasy',
    'Boulangerie': 'Boulangerie Les Délices',
    'Viandes et poissons': 'Pêcheries et Boucheries du Sud',
    'Entretien': 'Entretien Pro Mada',
    'Papeterie': 'Papeterie Moderne',
}


def fournisseurs():
    return [
        {
            'nom': nom,
            'telephone': telephone(i, decalage=3),
            'email': f"contact@{slug(nom)}.mg",
            'adresse': ville,
        }
        for i, (nom, ville) in enumerate(FOURNISSEURS)
    ]


# ---------------------------------------------------------------- Clients (35 -> 4 pages)
NOMS = [
    'RAKOTO', 'RASOANAIVO', 'RANDRIANARISOA', 'RAZAFY', 'ANDRIAMANANA', 'RABEMANANJARA',
    'RAHARISON', 'RAVELOJAONA', 'RAKOTOMALALA', 'RASOLOFO', 'RAMAROSON', 'ANDRIANTSOA',
]
PRENOMS = [
    'Jean', 'Marie', 'Hery', 'Voahangy', 'Faniry', 'Mialy', 'Tiana', 'Lalaina',
    'Njaka', 'Fenitra', 'Sarobidy', 'Aina', 'Haja', 'Nirina', 'Tojo',
]
VILLES = ['Antananarivo', 'Antsirabe', 'Toamasina', 'Fianarantsoa', 'Mahajanga', 'Toliara']


def clients(nombre=35):
    """Un client sur quatre n'a ni téléphone ni email (ces champs sont facultatifs)."""
    liste, vus, i = [], set(), 0
    while len(liste) < nombre:
        nom = NOMS[i % len(NOMS)]
        prenom = PRENOMS[(i * 4 + i // len(NOMS)) % len(PRENOMS)]
        i += 1
        if (nom, prenom) in vus:
            continue
        vus.add((nom, prenom))
        k = len(liste)
        complet = k % 4 != 3
        liste.append({
            'nom': nom,
            'prenom': prenom,
            'telephone': telephone(k, decalage=500) if complet else None,
            'email': f"{slug(prenom)}.{slug(nom)}@mail.mg" if complet else None,
            'adresse': VILLES[k % len(VILLES)],
        })
    return liste


# ---------------------------------------------------------------- Produits (45 -> 5 pages)
# (nom, catégorie, prix en Ar, stock, seuil minimal, unité)
# Stock inférieur au seuil = alerte « produits sous le seuil » sur le tableau de bord.
PRODUITS = [
    ('Eau Vive 1,5L', 'Boissons', 1500, 120, 20, 'piece'),
    ('Fanta orange 1,5L', 'Boissons', 3500, 60, 20, 'piece'),
    ('Jus Tropical 1L', 'Boissons', 4500, 8, 15, 'piece'),           # sous le seuil
    ('Bière THB 65cl', 'Boissons', 3200, 90, 24, 'piece'),
    ('Eau gazeuse 1L', 'Boissons', 2200, 0, 10, 'piece'),           # rupture

    ('Riz Makalioka 1kg', 'Epicerie', 3200, 200, 40, 'kg'),
    ('Sucre blanc 1kg', 'Epicerie', 4000, 150, 30, 'kg'),
    ('Sel fin 500g', 'Epicerie', 800, 80, 20, 'sachet'),
    ('Huile de table 1L', 'Epicerie', 7500, 45, 15, 'litre'),
    ('Farine de blé 1kg', 'Epicerie', 3500, 70, 20, 'kg'),
    ('Spaghetti 500g', 'Epicerie', 2500, 55, 15, 'sachet'),
    ('Haricots secs 1kg', 'Epicerie', 5500, 35, 10, 'kg'),
    ('Lentilles 1kg', 'Epicerie', 6500, 4, 10, 'kg'),               # sous le seuil
    ('Concentré de tomate', 'Epicerie', 1800, 40, 12, 'boite'),
    ('Sardines en boîte', 'Epicerie', 3200, 0, 10, 'boite'),        # rupture
    ('Café moulu 250g', 'Epicerie', 6000, 25, 8, 'sachet'),

    ('Dentifrice', 'Hygiène', 4500, 40, 10, 'piece'),
    ('Brosse à dents', 'Hygiène', 2000, 60, 15, 'piece'),
    ('Papier toilette (lot de 4)', 'Hygiène', 6500, 30, 10, 'piece'),
    ('Shampoing 400ml', 'Hygiène', 9500, 6, 8, 'piece'),            # sous le seuil
    ('Serviettes hygiéniques', 'Hygiène', 3500, 25, 10, 'sachet'),
    ('Mouchoirs en papier', 'Hygiène', 2500, 50, 12, 'boite'),

    ('Lait en poudre 400g', 'Produits laitiers', 14000, 20, 6, 'boite'),
    ('Lait UHT 1L', 'Produits laitiers', 4200, 48, 12, 'litre'),
    ('Yaourt nature', 'Produits laitiers', 1200, 36, 15, 'piece'),
    ('Fromage en portions', 'Produits laitiers', 8500, 3, 6, 'boite'),  # sous le seuil
    ('Beurre 250g', 'Produits laitiers', 6500, 14, 5, 'piece'),

    ('Banane 1kg', 'Fruits et légumes', 2500, 40, 10, 'kg'),
    ('Tomate 1kg', 'Fruits et légumes', 3000, 30, 10, 'kg'),
    ('Oignon 1kg', 'Fruits et légumes', 3500, 45, 10, 'kg'),
    ('Pomme de terre 1kg', 'Fruits et légumes', 2800, 60, 15, 'kg'),
    ('Carotte 1kg', 'Fruits et légumes', 3200, 7, 10, 'kg'),        # sous le seuil

    ('Baguette', 'Boulangerie', 700, 80, 20, 'piece'),
    ('Pain de mie', 'Boulangerie', 4500, 18, 6, 'piece'),
    ('Biscuits Mada', 'Boulangerie', 1500, 100, 25, 'sachet'),

    ('Poulet entier 1kg', 'Viandes et poissons', 18000, 12, 5, 'kg'),
    ('Viande de zébu 1kg', 'Viandes et poissons', 22000, 15, 5, 'kg'),
    ('Tilapia 1kg', 'Viandes et poissons', 12000, 2, 5, 'kg'),      # sous le seuil
    ('Saucisses', 'Viandes et poissons', 9000, 10, 4, 'sachet'),

    ('Lessive en poudre 1kg', 'Entretien', 7500, 22, 8, 'kg'),
    ('Eau de Javel 1L', 'Entretien', 3000, 35, 10, 'litre'),
    ('Liquide vaisselle 750ml', 'Entretien', 5500, 18, 6, 'piece'),
    ('Eponge (lot de 3)', 'Entretien', 2500, 0, 8, 'piece'),        # rupture

    ('Cahier 96 pages', 'Papeterie', 2500, 60, 15, 'piece'),
    ('Stylo bille', 'Papeterie', 500, 200, 50, 'piece'),
]

# ---------------------------------------------------------------- Vendeurs (en plus de admin et vendeur1)
MOT_DE_PASSE_VENDEURS = 'Vendeur@2026'
VENDEURS = [
    ('vendeur2', 'Hery', 'Rakoto'), ('vendeur3', 'Voahangy', 'Rasoanaivo'),
    ('vendeur4', 'Faniry', 'Razafy'), ('vendeur5', 'Mialy', 'Raharison'),
    ('vendeur6', 'Tiana', 'Ramaroson'), ('vendeur7', 'Lalaina', 'Rasolofo'),
    ('vendeur8', 'Njaka', 'Andriamanana'), ('vendeur9', 'Fenitra', 'Ravelojaona'),
    ('vendeur10', 'Sarobidy', 'Rakotomalala'), ('vendeur11', 'Aina', 'Andriantsoa'),
    ('vendeur12', 'Haja', 'Rabemananjara'),
]
