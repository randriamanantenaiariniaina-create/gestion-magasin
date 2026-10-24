from unittest import mock

from django.contrib.auth import get_user_model
from django.core import mail
from django.core.cache import cache
from django.core.management import call_command
from django.test import override_settings
from rest_framework.test import APITestCase

from .models import Categorie, Client, Fournisseur, Produit

User = get_user_model()
TEL = '+261 34 12 345 67'


class BaseTest(APITestCase):
    def setUp(self):
        cache.clear()
        self.admin = User.objects.create_user('admin', 'admin@magasin.mg', 'Admin@2026', role='admin')
        self.vendeur = User.objects.create_user('vendeur', 'vendeur@magasin.mg', 'Vendeur@2026', role='vendeur')

    def en_tant_que(self, user):
        self.client.force_authenticate(user)


class ClientsTest(BaseTest):
    def setUp(self):
        super().setUp()
        self.en_tant_que(self.admin)

    def creer(self, **plus):
        donnees = {'nom': 'rakoto', 'prenom': 'jean pierre', 'telephone': TEL, 'email': 'Jean@Mail.MG'}
        donnees.update(plus)
        return self.client.post('/api/clients/', donnees, format='json')

    def test_nom_majuscules_prenom_capitalise_email_minuscules(self):
        r = self.creer()
        self.assertEqual(r.status_code, 201, r.data)
        self.assertEqual(r.data['nom'], 'RAKOTO')
        self.assertEqual(r.data['prenom'], 'Jean Pierre')
        self.assertEqual(r.data['email'], 'jean@mail.mg')

    def test_meme_telephone_refuse_meme_avec_un_autre_nom(self):
        self.creer()
        r = self.creer(nom='Rabe', prenom='Paul', email='paul@mail.mg')
        self.assertEqual(r.status_code, 400)
        self.assertIn('déjà utilisé', r.data['telephone'][0])

    def test_meme_nom_prenom_refuse_meme_si_casse_differente(self):
        self.creer()
        r = self.creer(nom='RAKOTO', prenom='JEAN PIERRE', telephone='', email='')
        self.assertEqual(r.status_code, 400)

    def test_message_telephone_liste_les_debuts_autorises(self):
        r = self.creer(telephone='+261 31 12 345 67')
        self.assertEqual(r.status_code, 400)
        message = r.data['telephone'][0]
        for debut in ('32', '33', '34', '37', '38'):
            self.assertIn(debut, message)

    def test_dernier_enregistrement_a_la_fin(self):
        self.creer(nom='Zafy', prenom='A', telephone='', email='')
        self.creer(nom='Abel', prenom='B', telephone='', email='')
        noms = [c['nom'] for c in self.client.get('/api/clients/').data]
        self.assertEqual(noms, ['ZAFY', 'ABEL'])


class ProduitsEtStockTest(BaseTest):
    def setUp(self):
        super().setUp()
        self.cat = Categorie.objects.create(nom='Boissons')
        self.four = Fournisseur.objects.create(nom='Star', telephone=TEL, email='s@mail.mg')

    def donnees(self, **plus):
        d = {'nom': 'Eau', 'categorie': self.cat.id, 'fournisseur': self.four.id,
             'prix': '2500', 'seuil_minimal': 3, 'unite': 'litre'}
        d.update(plus)
        return d

    def test_reference_automatique_et_stock_a_zero(self):
        self.en_tant_que(self.admin)
        self.assertEqual(self.client.get('/api/produits/prochaine-reference/').data['reference'], 'PRD-00001')
        r = self.client.post('/api/produits/', self.donnees(stock=999), format='json')
        self.assertEqual(r.status_code, 201, r.data)
        self.assertEqual(r.data['reference'], 'PRD-00001')
        self.assertEqual(r.data['stock'], 0)          # le stock passe par la page Stock
        self.assertEqual(self.client.get('/api/produits/prochaine-reference/').data['reference'], 'PRD-00002')

    def test_ajout_de_stock_reserve_a_l_admin(self):
        p = Produit.objects.create(nom='Eau', categorie=self.cat, fournisseur=self.four, prix=100, stock=5)
        self.en_tant_que(self.admin)
        r = self.client.post(f'/api/produits/{p.id}/ajouter-stock/', {'quantite': 20}, format='json')
        self.assertEqual(r.status_code, 200, r.data)
        p.refresh_from_db()
        self.assertEqual(p.stock, 25)
        self.assertEqual(self.client.post(f'/api/produits/{p.id}/ajouter-stock/', {'quantite': -3}, format='json').status_code, 400)
        self.en_tant_que(self.vendeur)
        self.assertEqual(self.client.post(f'/api/produits/{p.id}/ajouter-stock/', {'quantite': 5}, format='json').status_code, 403)

    def test_vendeur_ne_voit_pas_le_fournisseur(self):
        Produit.objects.create(nom='Eau', categorie=self.cat, fournisseur=self.four, prix=100)
        self.en_tant_que(self.vendeur)
        produit = self.client.get('/api/produits/').data[0]
        self.assertNotIn('fournisseur', produit)
        self.assertNotIn('fournisseur_nom', produit)

    def test_doublon_fournisseur_et_categorie(self):
        self.en_tant_que(self.admin)
        r = self.client.post('/api/fournisseurs/', {'nom': 'Autre', 'telephone': TEL, 'email': 'a@mail.mg'}, format='json')
        self.assertEqual(r.status_code, 400)
        r = self.client.post('/api/categories/', {'nom': 'boissons'}, format='json')
        self.assertEqual(r.status_code, 400)


class DroitsEtComptesTest(BaseTest):
    def test_vendeur_sans_acces_a_la_gestion(self):
        self.en_tant_que(self.vendeur)
        self.assertEqual(self.client.post('/api/categories/', {'nom': 'X'}, format='json').status_code, 403)
        self.assertEqual(self.client.get('/api/utilisateurs/').status_code, 403)
        self.assertEqual(self.client.get('/api/fournisseurs/').status_code, 403)

    def test_le_role_de_l_admin_est_verrouille(self):
        autre = User.objects.create_user('admin2', 'a2@magasin.mg', 'Admin@2026', role='admin')
        self.en_tant_que(self.admin)
        r = self.client.patch(f'/api/utilisateurs/{autre.id}/', {'role': 'vendeur'}, format='json')
        self.assertEqual(r.status_code, 400)
        autre.refresh_from_db()
        self.assertEqual(autre.role, 'admin')

    def test_on_garde_toujours_un_administrateur(self):
        autre = User.objects.create_user('admin2', 'a2@magasin.mg', 'Admin@2026', role='admin')
        self.en_tant_que(autre)
        self.assertEqual(self.client.delete(f'/api/utilisateurs/{self.admin.id}/').status_code, 204)
        # il ne reste qu'un admin (le compte connecté) : il ne peut ni se supprimer ni être supprimé
        self.assertEqual(self.client.delete(f'/api/utilisateurs/{autre.id}/').status_code, 400)
        self.assertEqual(User.objects.filter(role='admin').count(), 1)

    def test_moi_renvoie_le_role_a_jour(self):
        self.en_tant_que(self.vendeur)
        self.assertEqual(self.client.get('/api/auth/moi/').data['role'], 'vendeur')

    def test_vendeur_change_son_propre_mot_de_passe(self):
        self.en_tant_que(self.vendeur)
        r = self.client.post('/api/auth/changer-mot-de-passe/', {
            'ancien': 'Vendeur@2026', 'nouveau': 'Nouveau@2027', 'confirmation': 'Nouveau@2027'}, format='json')
        self.assertEqual(r.status_code, 200, r.data)
        self.vendeur.refresh_from_db()
        self.assertTrue(self.vendeur.check_password('Nouveau@2027'))

    def test_changement_refuse_si_ancien_faux(self):
        self.en_tant_que(self.vendeur)
        r = self.client.post('/api/auth/changer-mot-de-passe/', {
            'ancien': 'faux', 'nouveau': 'Nouveau@2027', 'confirmation': 'Nouveau@2027'}, format='json')
        self.assertEqual(r.status_code, 400)

    def test_inscription_toujours_vendeur_et_email_minuscules(self):
        r = self.client.post('/api/auth/inscription/', {
            'username': 'nouveau', 'email': 'Nouveau@Mail.MG',
            'password': 'Nouveau@2026', 'confirmation': 'Nouveau@2026'}, format='json')
        self.assertEqual(r.status_code, 201, r.data)
        u = User.objects.get(username='nouveau')
        self.assertEqual((u.email, u.role), ('nouveau@mail.mg', 'vendeur'))

    def test_mot_de_passe_oublie_envoie_un_email(self):
        r = self.client.post('/api/auth/mot-de-passe-oublie/', {'email': 'vendeur@magasin.mg'}, format='json')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn('/reinitialiser/', mail.outbox[0].body)

    def test_comptes_de_demo_crees_une_seule_fois(self):
        User.objects.all().delete()
        call_command('creer_comptes_demo', verbosity=0)
        call_command('creer_comptes_demo', verbosity=0)
        self.assertEqual(User.objects.get(username='admin').role, 'admin')
        self.assertEqual(User.objects.get(username='vendeur1').role, 'vendeur')
        self.assertEqual(User.objects.count(), 2)


class EmailBrevoTest(BaseTest):
    @override_settings(EMAIL_BACKEND='magasin.email_backend.BrevoEmailBackend')
    def test_envoi_par_l_api_brevo(self):
        from django.core.mail import send_mail
        reponse = mock.MagicMock()
        reponse.__enter__.return_value = reponse
        with mock.patch('urllib.request.urlopen', return_value=reponse) as faux:
            envoyes = send_mail('Sujet', 'Corps', 'moi@exemple.com', ['lui@exemple.com'])
        self.assertEqual(envoyes, 1)
        requete = faux.call_args[0][0]
        self.assertEqual(requete.full_url, 'https://api.brevo.com/v3/smtp/email')
        self.assertIn(b'lui@exemple.com', requete.data)


class VentesTest(BaseTest):
    def setUp(self):
        super().setUp()
        cat = Categorie.objects.create(nom='B')
        four = Fournisseur.objects.create(nom='Star', telephone=TEL, email='s@mail.mg')
        self.produit = Produit.objects.create(nom='Eau', categorie=cat, fournisseur=four, prix=2500, stock=10)
        self.c = Client.objects.create(nom='RAKOTO', prenom='Jean')
        self.en_tant_que(self.vendeur)

    def vendre(self, quantite):
        return self.client.post('/api/ventes/', {
            'client': self.c.id, 'mode_paiement': 'espece',
            'panier': [{'produit': self.produit.id, 'quantite': quantite}]}, format='json')

    def test_vente_diminue_le_stock(self):
        r = self.vendre(3)
        self.assertEqual(r.status_code, 201, r.data)
        self.assertEqual(float(r.data['total']), 7500)
        self.produit.refresh_from_db()
        self.assertEqual(self.produit.stock, 7)

    def test_vente_refusee_si_stock_insuffisant(self):
        self.assertEqual(self.vendre(50).status_code, 400)
        self.produit.refresh_from_db()
        self.assertEqual(self.produit.stock, 10)
