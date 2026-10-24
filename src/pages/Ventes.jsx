import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Search, Plus, Minus, Trash2, Banknote, Smartphone,
    ChevronDown, ChevronUp, CircleCheck, Printer,
} from 'lucide-react';
import api from '../api/axios';
import Pagination, { PAR_PAGE } from '../components/Pagination';
import Recu from '../components/Recu';
import { useMessageTemporaire } from '../hooks';
import { enListe, formatAr, lireErreurs } from '../utils';

const MODES = [
    { valeur: 'espece', label: 'Espèce', Icone: Banknote },
    { valeur: 'mobile_money', label: 'Mobile Money', Icone: Smartphone },
];
const libelleMode = (v) => MODES.find((m) => m.valeur === v)?.label || v;

const PAR_PAGE_PRODUITS = 12;
const DERNIERE_PAGE = 1e9; // la pagination ramène ce nombre à la vraie dernière page

export default function Ventes() {
    const [onglet, setOnglet] = useState('nouvelle');
    const [produits, setProduits] = useState([]);
    const [clients, setClients] = useState([]);
    const [historique, setHistorique] = useState([]);
    const [chargement, setChargement] = useState(true);
    const [erreurChargement, setErreurChargement] = useState('');

    const [panier, setPanier] = useState([]); // [{ produit: {...}, quantite }]
    const [clientId, setClientId] = useState('');
    const [mode, setMode] = useState('');
    const [filtre, setFiltre] = useState('');
    const [erreur, afficherErreur] = useMessageTemporaire(6000);
    const [succes, afficherSucces] = useMessageTemporaire(); // disparaît après 4 s
    const [enCours, setEnCours] = useState(false);
    const [ouvertId, setOuvertId] = useState(null);
    const [recu, setRecu] = useState(null); // vente dont on affiche le reçu

    const [pageProduits, setPageProduits] = useState(1);
    const [pageHistorique, setPageHistorique] = useState(1);

    const charger = useCallback(async () => {
        try {
            const [p, c, v] = await Promise.all([
                api.get('/produits/'), api.get('/clients/'), api.get('/ventes/'),
            ]);
            setProduits(enListe(p.data));
            setClients(enListe(c.data));
            setHistorique(enListe(v.data));
            setErreurChargement('');
        } catch {
            setErreurChargement('Impossible de charger les données.');
        } finally {
            setChargement(false);
        }
    }, []);

    useEffect(() => {
        charger();
    }, [charger]);

    const total = useMemo(
        () => panier.reduce((s, l) => s + Number(l.produit.prix) * l.quantite, 0),
        [panier],
    );

    // Produits à vendre et clients : ordre alphabétique pour retrouver vite un nom
    const produitsTries = useMemo(
        () => [...produits].sort((a, b) => a.nom.localeCompare(b.nom, 'fr')),
        [produits],
    );
    const clientsTries = useMemo(
        () => [...clients].sort((a, b) =>
            `${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`, 'fr')),
        [clients],
    );

    const q = filtre.trim().toLowerCase();
    const visibles = useMemo(
        () => (q
            ? produitsTries.filter((p) =>
                [p.nom, p.reference, p.categorie_nom].some((v) => String(v ?? '').toLowerCase().includes(q)))
            : produitsTries),
        [produitsTries, q],
    );
    const pageProd = Math.min(pageProduits, Math.max(1, Math.ceil(visibles.length / PAR_PAGE_PRODUITS)));
    const produitsAffiches = visibles.slice((pageProd - 1) * PAR_PAGE_PRODUITS, pageProd * PAR_PAGE_PRODUITS);

    // Historique : de la plus ancienne à la plus récente, la dernière vente est à la fin
    const historiqueTrie = useMemo(() => [...historique].sort((a, b) => a.id - b.id), [historique]);
    const pageHisto = Math.min(pageHistorique, Math.max(1, Math.ceil(historiqueTrie.length / PAR_PAGE)));
    const ventesAffichees = historiqueTrie.slice((pageHisto - 1) * PAR_PAGE, pageHisto * PAR_PAGE);

    const ajouter = (p) => {
        afficherErreur('');
        afficherSucces('');
        const ligne = panier.find((l) => l.produit.id === p.id);
        if (!ligne) {
            setPanier([...panier, { produit: p, quantite: 1 }]);
        } else if (ligne.quantite >= p.stock) {
            afficherErreur(`Stock disponible pour ${p.nom} : ${p.stock}`);
        } else {
            setPanier(panier.map((l) => (l.produit.id === p.id ? { ...l, quantite: l.quantite + 1 } : l)));
        }
    };

    const changerQuantite = (id, valeur) => {
        afficherErreur('');
        setPanier(panier.map((l) => {
            if (l.produit.id !== id) return l;
            const n = parseInt(valeur, 10) || 1;
            return { ...l, quantite: Math.max(1, Math.min(l.produit.stock, n)) };
        }));
    };

    const retirer = (id) => setPanier(panier.filter((l) => l.produit.id !== id));

    const valider = async () => {
        afficherErreur('');
        afficherSucces('');
        if (panier.length === 0) return afficherErreur('Le panier est vide, ajoute au moins un produit.');
        if (!clientId) return afficherErreur('Choisis un client.');
        if (!mode) return afficherErreur('Choisis un mode de paiement (Espèce ou Mobile Money).');

        setEnCours(true);
        try {
            const { data } = await api.post('/ventes/', {
                client: Number(clientId),
                mode_paiement: mode,
                panier: panier.map((l) => ({ produit: l.produit.id, quantite: l.quantite })),
            });
            afficherSucces(`Vente n°${data.id} enregistrée — total : ${formatAr(data.total)}`);
            setRecu(data); // le reçu s'ouvre tout de suite, prêt à imprimer
            setPanier([]);
            setClientId('');
            setMode('');
            setPageHistorique(DERNIERE_PAGE);
            charger(); // stocks et historique mis à jour
        } catch (err) {
            afficherErreur(lireErreurs(err).global || 'La vente a échoué.');
            charger(); // le stock a peut-être changé entre-temps
        } finally {
            setEnCours(false);
        }
    };

    return (
        <div>
            <div className="entete-page">
                <h1 className="titre-page">Ventes</h1>
                <div className="onglets">
                    <button className={onglet === 'nouvelle' ? 'actif' : ''} onClick={() => setOnglet('nouvelle')}>
                        Nouvelle vente
                    </button>
                    <button className={onglet === 'historique' ? 'actif' : ''} onClick={() => setOnglet('historique')}>
                        Historique ({historique.length})
                    </button>
                </div>
            </div>

            {succes && <p className="succes icone-texte"><CircleCheck size={18} /> {succes}</p>}
            {erreur && <p className="erreur">{erreur}</p>}
            {erreurChargement && <p className="erreur">{erreurChargement}</p>}

            {chargement ? (
                <p className="vide">Chargement...</p>
            ) : onglet === 'nouvelle' ? (
                <div className="vente-grille">
                    <section className="bloc">
                        <h3>Produits</h3>
                        <div className="recherche">
                            <Search size={16} />
                            <input placeholder="Rechercher un produit..." value={filtre}
                                onChange={(e) => {
                                    setFiltre(e.target.value);
                                    setPageProduits(1);
                                }} />
                        </div>
                        {visibles.length === 0 ? (
                            <p className="vide">Aucun produit.</p>
                        ) : (
                            <>
                                <div className="produits-grille">
                                    {produitsAffiches.map((p) => {
                                        const rupture = p.stock <= 0;
                                        const bas = p.stock < p.seuil_minimal;
                                        return (
                                            <button key={p.id} className="produit-carte" disabled={rupture}
                                                onClick={() => ajouter(p)}>
                                                <strong>{p.nom}</strong>
                                                <span className="prix">{formatAr(p.prix)}</span>
                                                <span className={bas ? 'rouge' : 'aide'}>
                                                    {rupture ? 'Rupture de stock' : `Stock : ${p.stock} ${p.unite}`}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                                <Pagination page={pageProd} total={visibles.length}
                                    parPage={PAR_PAGE_PRODUITS} onChange={setPageProduits} />
                            </>
                        )}
                    </section>

                    <section className="bloc panier">
                        <h3>Panier</h3>
                        {panier.length === 0 ? (
                            <p className="vide">Clique sur un produit pour l'ajouter.</p>
                        ) : (
                            <ul className="panier-lignes">
                                {panier.map((l) => (
                                    <li key={l.produit.id}>
                                        <div className="panier-nom">
                                            <strong>{l.produit.nom}</strong>
                                            <span className="aide">{formatAr(l.produit.prix)}</span>
                                        </div>
                                        <div className="quantite">
                                            <button className="icone-bouton" aria-label="Moins"
                                                onClick={() => changerQuantite(l.produit.id, l.quantite - 1)}>
                                                <Minus size={14} />
                                            </button>
                                            <input type="number" min="1" max={l.produit.stock} value={l.quantite}
                                                onChange={(e) => changerQuantite(l.produit.id, e.target.value)} />
                                            <button className="icone-bouton" aria-label="Plus"
                                                onClick={() => changerQuantite(l.produit.id, l.quantite + 1)}>
                                                <Plus size={14} />
                                            </button>
                                        </div>
                                        <strong className="sous-total">{formatAr(Number(l.produit.prix) * l.quantite)}</strong>
                                        <button className="icone-bouton danger" aria-label="Retirer"
                                            onClick={() => retirer(l.produit.id)}>
                                            <Trash2 size={16} />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}

                        <div className="form-champ">
                            <label htmlFor="vente-client">Client *</label>
                            <select id="vente-client" value={clientId} onChange={(e) => setClientId(e.target.value)}>
                                <option value="">— Choisir un client —</option>
                                {clientsTries.map((c) => (
                                    <option key={c.id} value={c.id}>{c.nom} {c.prenom}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-champ">
                            <label>Paiement *</label>
                            <div className="modes">
                                {MODES.map(({ valeur, label, Icone }) => (
                                    <button key={valeur} type="button"
                                        className={mode === valeur ? 'actif' : ''} onClick={() => setMode(valeur)}>
                                        <Icone size={16} /> {label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="total-ligne">
                            <span>Total</span>
                            <strong>{formatAr(total)}</strong>
                        </div>
                        <button className="bouton" onClick={valider} disabled={enCours}>
                            {enCours ? 'Enregistrement...' : 'Valider la vente'}
                        </button>
                    </section>
                </div>
            ) : (
                <section className="bloc">
                    {historique.length === 0 ? (
                        <p className="vide">Aucune vente enregistrée.</p>
                    ) : (
                        <>
                            <div className="defile">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>N°</th><th>Date</th><th>Client</th><th>Vendeur</th>
                                            <th>Paiement</th><th>Total</th><th className="col-actions">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {ventesAffichees.map((v) => {
                                            const ouvert = ouvertId === v.id;
                                            return (
                                                <HistoriqueLigne key={v.id} vente={v} ouvert={ouvert}
                                                    basculer={() => setOuvertId(ouvert ? null : v.id)}
                                                    voirRecu={() => setRecu(v)} />
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            <Pagination page={pageHisto} total={historique.length} onChange={setPageHistorique} />
                        </>
                    )}
                </section>
            )}

            {recu && <Recu vente={recu} onFermer={() => setRecu(null)} />}
        </div>
    );
}

function HistoriqueLigne({ vente: v, ouvert, basculer, voirRecu }) {
    return (
        <>
            <tr>
                <td>{v.id}</td>
                <td>{new Date(v.date).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</td>
                <td>{v.client_nom}</td>
                <td>{v.vendeur_nom}</td>
                <td>{libelleMode(v.mode_paiement)}</td>
                <td><strong>{formatAr(v.total)}</strong></td>
                <td className="col-actions">
                    <button className="icone-bouton" onClick={voirRecu} aria-label="Reçu" title="Reçu">
                        <Printer size={18} />
                    </button>
                    <button className="icone-bouton" onClick={basculer} aria-label="Détails" title="Détails">
                        {ouvert ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                </td>
            </tr>
            {ouvert && (
                <tr className="detail-vente">
                    <td colSpan={7}>
                        <ul>
                            {v.details.map((d) => (
                                <li key={d.id}>
                                    {d.produit_nom} × {d.quantite} à {formatAr(d.prix_unitaire)} = <strong>{formatAr(d.sous_total)}</strong>
                                </li>
                            ))}
                        </ul>
                    </td>
                </tr>
            )}
        </>
    );
}
