# Gestion de Magasin

Application web de gestion d'un magasin : produits, stock, clients, fournisseurs, ventes avec reçu,
tableau de bord et gestion des utilisateurs (rôles **admin** et **vendeur**).

| Élément | Lien |
|---|---|
| Projet hébergé | **À COMPLÉTER : https://......vercel.app** |
| Code source (GitHub) | **À COMPLÉTER : https://github.com/......** |

> **Premier chargement lent :** le serveur gratuit (Render) s'endort après 15 minutes sans visite.
> La première connexion peut prendre environ une minute, ensuite tout est rapide.

## Comptes de démonstration

| Rôle | Utilisateur | Mot de passe |
|---|---|---|
| Administrateur | `admin` | `Admin@2026` |
| Vendeur | `vendeur1` | `Vendeur@2026` |

## Technologies

- **Frontend** : React (Vite), React Router, Recharts, Lucide (icônes), Axios
- **Backend** : Django 6 + Django REST Framework, authentification par jetons JWT
- **Base de données** : PostgreSQL (local, puis Neon en ligne)
- **Hébergement** : Vercel (frontend), Render (backend), Neon (PostgreSQL)

Le frontend appelle l'API Django (`/api/...`), qui lit et écrit dans PostgreSQL.

## Fonctionnalités

| | Admin | Vendeur |
|---|---|---|
| Tableau de bord (ventes, chiffre d'affaires, alertes de stock, graphiques) | oui | oui |
| Ventes : panier, contrôle du stock, paiement Espèce / Mobile Money, reçu | oui | oui |
| Catégories, fournisseurs, clients, produits | oui | non |
| Page Stock (réception de marchandises) | oui | non |
| Gestion des utilisateurs (au moins un admin est toujours conservé) | oui | non |
| Changer son propre mot de passe | oui | oui |

Autres points : inscription (compte vendeur), mot de passe oublié par email (lien valable 1 heure),
validation des téléphones malgaches (+261 32/33/34/37/38), emails en minuscules, noms de clients
en majuscules, détection des doublons, pagination, messages qui disparaissent.
Les droits sont contrôlés **côté serveur** : un vendeur qui devine une adresse d'administration reçoit un refus.

## Lancer le projet en local

Prérequis : Python 3.12+, Node.js 20+, PostgreSQL.

```bash
# 1) Backend
cd backend
python -m venv venv
venv\Scripts\activate            # Windows  (Mac/Linux : source venv/bin/activate)
pip install -r requirements.txt
copy .env.example .env           # puis renseigner la base PostgreSQL dans .env
python manage.py migrate
python manage.py creer_comptes_demo
python manage.py runserver

# 2) Frontend (autre terminal)
cd frontend
npm install
npm run dev                      # http://localhost:5173
```

Données de test (facultatif) : `python manage.py remplir_donnees_test`
Tests automatiques : `python manage.py test magasin`

## Déploiement

1. **Neon** : créer un projet PostgreSQL, copier l'adresse de connexion (`DATABASE_URL`).
2. **Render** (Web Service, dossier racine `backend`) :
   - Build : `pip install -r requirements.txt && python manage.py collectstatic --no-input && python manage.py migrate --no-input && python manage.py creer_comptes_demo`
   - Start : `gunicorn config.wsgi:application`
   - Variables : `DATABASE_URL`, `SECRET_KEY`, `PYTHON_VERSION`, `FRONTEND_URL`, `CORS_ALLOWED_ORIGINS`
3. **Vercel** (dossier racine `frontend`) : variable `VITE_API_URL` = adresse du backend Render + `/api`.
4. Emails en ligne (facultatif) : le SMTP est bloqué sur Render gratuit, on utilise l'API de Brevo
   (`BREVO_API_KEY`, `EMAIL_EXPEDITEUR`). Sans cela, le lien de réinitialisation s'affiche dans les journaux Render.
