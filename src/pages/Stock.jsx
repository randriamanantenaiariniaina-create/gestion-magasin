import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CircleCheck, PackagePlus, Plus, Search } from 'lucide-react';
import api from '../api/axios';
import Pagination, { PAR_PAGE } from '../components/Pagination';
import { useMessageTemporaire } from '../hooks';
import { enListe, lireErreurs } from '../utils';

const QUANTITE_MAX = 1_000_000;

// Page réservée à l'admin : réception de marchandise = ajout de stock à un produit existant
export default function Stock() {
    const [produits, setProduits] = useState([]);
    const [chargement, setChargement] = useState(true);
    const [erreurChargement, setErreurChargement] = useState('');

    const [produitId, setProduitId] = useState('');
    const [quantite, setQuantite] = useState('');
    const [erreurs, setErreurs] = useState({});
    const [succes, afficherSucces] = useMessageTemporaire();
    const [enCours, setEnCours] = useState(false);

    const [filtre, setFiltre] = useState('');
    const [page, setPage] = useState(1);
    const champQuantite = useRef(null);

    const charger = useCallback(async () => {
        setChargement(true);
        setErreurChargement('');
        try {
            const { data } = await api.get('/produits/');
            setProduits(enListe(data));
        } catch {
            setErreurChargement('Impossible de charger les produits.');
        } finally {
            setChargement(false);
        }
    }, []);

    useEffect(() => {
        charger();
    }, [charger]);

    // Liste déroulante : par ordre alphabétique, plus facile pour choisir
    const pourChoisir = useMemo(
        () => [...produits].sort((a, b) => a.nom.localeCompare(b.nom, 'fr')),
        [produits],
    );

    // Tableau : le dernier produit créé est à la fin
    const triees = useMemo(() => [...produits].sort((a, b) => a.id - b.id), [produits]);

    const q = filtre.trim().toLowerCase();
    const visibles = useMemo(
        () => (q
            ? triees.filter((p) =>
                [p.reference, p.nom, p.categorie_nom].some((v) => String(v ?? '').toLowerCase().includes(q)))
            : triees),
        [triees, q],
    );

    const nbPages = Math.max(1, Math.ceil(visibles.length / PAR_PAGE));
    const pageCourante = Math.min(page, nbPages);
    const affichees = visibles.slice((pageCourante - 1) * PAR_PAGE, pageCourante * PAR_PAGE);

    const produitChoisi = produits.find((p) => String(p.id) === String(produitId));

    // Bouton « + » d'une ligne : remonte au formulaire avec le produit déjà choisi
    const choisir = (p) => {
        setProduitId(String(p.id));
        setErreurs({});
        window.scrollTo({ top: 0, behavior: 'smooth' });
        champQuantite.current?.focus({ preventScroll: true });
    };

    const envoyer = async (e) => {
        e.preventDefault();
        const problemes = {};
        const n = Number(quantite);

        if (!produitId) problemes.produit = 'Choisis un produit.';
        if (String(quantite).trim() === '') {
            problemes.quantite = 'Saisis la quantité reçue.';
        } else if (!Number.isInteger(n) || n <= 0) {
            problemes.quantite = 'La quantité doit être un nombre entier supérieur à 0.';
        } else if (n > QUANTITE_MAX) {
            problemes.quantite = 'Quantité trop grande (maximum 1 000 000 à la fois).';
        }
        if (Object.keys(problemes).length) {
            setErreurs(problemes);
            return;
        }

        setEnCours(true);
        setErreurs({});
        try {
            const { data } = await api.post(`/produits/${produitId}/ajouter-stock/`, { quantite: n });
            setProduits((liste) => liste.map((p) => (p.id === data.id ? data : p)));
            afficherSucces(`${n} ajouté(s) à « ${data.nom} ». Nouveau stock : ${data.stock} ${data.unite}.`);
            setProduitId('');
            setQuantite('');
        } catch (err) {
            setErreurs({ global: lireErreurs(err).global || "L'ajout de stock a échoué." });
        } finally {
            setEnCours(false);
        }
    };

    return (
        <div>
            <div className="entete-page">
                <h1 className="titre-page">Stock</h1>
            </div>

            {succes && <p className="succes icone-texte"><CircleCheck size={18} /> {succes}</p>}
            {erreurChargement && <p className="erreur">{erreurChargement}</p>}

            <section className="bloc">
                <h3 className="icone-texte"><PackagePlus size={18} /> Ajouter du stock</h3>
                <form className="stock-form" onSubmit={envoyer} noValidate>
                    <div className="form-champ">
                        <label htmlFor="stock-produit">Produit *</label>
                        <select
                            id="stock-produit"
                            value={produitId}
                            onChange={(e) => {
                                setProduitId(e.target.value);
                                setErreurs({});
                            }}
                        >
                            <option value="">— Choisir un produit —</option>
                            {pourChoisir.map((p) => (
                                <option key={p.id} value={p.id}>{p.reference} — {p.nom}</option>
                            ))}
                        </select>
                        {produitChoisi && (
                            <span className="aide">
                                Stock actuel : {produitChoisi.stock} {produitChoisi.unite}
                            </span>
                        )}
                        {erreurs.produit && <span className="erreur-champ">{erreurs.produit}</span>}
                    </div>

                    <div className="form-champ">
                        <label htmlFor="stock-quantite">Quantité reçue *</label>
                        <input
                            id="stock-quantite"
                            ref={champQuantite}
                            type="number"
                            min="1"
                            step="1"
                            inputMode="numeric"
                            value={quantite}
                            onChange={(e) => {
                                setQuantite(e.target.value);
                                setErreurs({});
                            }}
                        />
                        {erreurs.quantite && <span className="erreur-champ">{erreurs.quantite}</span>}
                    </div>

                    <button className="bouton-principal" disabled={enCours}>
                        <Plus size={16} /> {enCours ? 'Ajout...' : 'Ajouter au stock'}
                    </button>
                </form>
                {erreurs.global && <p className="erreur">{erreurs.global}</p>}
            </section>

            <section className="bloc">
                <h3>Stock actuel</h3>
                <div className="recherche">
                    <Search size={16} />
                    <input
                        placeholder="Rechercher un produit..."
                        value={filtre}
                        onChange={(e) => {
                            setFiltre(e.target.value);
                            setPage(1);
                        }}
                    />
                </div>

                {chargement ? (
                    <p className="vide">Chargement...</p>
                ) : visibles.length === 0 ? (
                    <p className="vide">
                        {produits.length === 0
                            ? 'Aucun produit. Crée d\'abord un produit dans « Produits ».'
                            : 'Aucun résultat.'}
                    </p>
                ) : (
                    <>
                        <div className="defile">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Référence</th><th>Produit</th><th>Catégorie</th>
                                        <th>Stock</th><th>Seuil</th><th className="col-actions">Ajouter</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {affichees.map((p) => (
                                        <tr key={p.id}>
                                            <td>{p.reference}</td>
                                            <td>{p.nom}</td>
                                            <td>{p.categorie_nom}</td>
                                            <td>
                                                <span className={p.stock < p.seuil_minimal ? 'rouge' : ''}>
                                                    {p.stock} {p.unite}
                                                </span>
                                            </td>
                                            <td>{p.seuil_minimal}</td>
                                            <td className="col-actions">
                                                <button
                                                    className="icone-bouton"
                                                    onClick={() => choisir(p)}
                                                    aria-label={`Ajouter du stock à ${p.nom}`}
                                                    title="Ajouter du stock"
                                                >
                                                    <PackagePlus size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <Pagination page={pageCourante} total={visibles.length} onChange={setPage} />
                    </>
                )}
            </section>
        </div>
    );
}
