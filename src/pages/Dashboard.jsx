import { useEffect, useState } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
    PieChart, Pie, Cell, Legend,
} from 'recharts';
import api from '../api/axios';
import { RefreshCw, TriangleAlert } from 'lucide-react';

const COULEURS = ['#0f2f4a', '#2c4e68', '#597f99', '#8dadbf', '#f59e0b', '#10b981'];
const formatAr = (n) => new Intl.NumberFormat('fr-FR').format(n) + ' Ar';

export default function Dashboard() {
    const [stats, setStats] = useState(null);
    const [erreur, setErreur] = useState('');
    const [chargement, setChargement] = useState(true);

    const charger = async () => {
        setChargement(true);
        setErreur('');
        try {
            const { data } = await api.get('/dashboard/');
            setStats(data);
        } catch {
            setErreur('Impossible de charger les statistiques.');
        } finally {
            setChargement(false);
        }
    };

    useEffect(() => {
        charger();
    }, []);

    return (
        <div>
            <div className="entete-page">
                <h1 className="titre-page">Tableau de bord</h1>
                <button className="bouton-secondaire" onClick={charger} disabled={chargement}>
                    <RefreshCw size={16} className={chargement ? 'tourne' : ''} />
                    {chargement ? ' Chargement...' : ' Actualiser'}
                </button>
            </div>

            {erreur && <p className="erreur">{erreur}</p>}

            {stats && (
                <>
                    <div className="cartes">
                        <div className="stat">
                            <span>Nombre de ventes</span>
                            <strong>{stats.nombre_ventes}</strong>
                        </div>
                        <div className="stat">
                            <span>Chiffre d'affaires</span>
                            <strong>{formatAr(stats.chiffre_affaires)}</strong>
                        </div>
                        <div className={`stat ${stats.produits_sous_seuil > 0 ? 'alerte' : ''}`}>
                            <span>Produits sous le seuil</span>
                            <strong>{stats.produits_sous_seuil}</strong>
                        </div>
                    </div>

                    <div className="graphiques">
                        <section className="bloc">
                            <h3>Top 5 des produits vendus</h3>
                            {stats.top_produits.length === 0 ? (
                                <p className="vide">Aucune vente pour le moment.</p>
                            ) : (
                                <ResponsiveContainer width="100%" height={260}>
                                    <BarChart data={stats.top_produits}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="nom" />
                                        <YAxis allowDecimals={false} />
                                        <Tooltip />
                                        <Bar dataKey="quantite" name="Quantité vendue" fill="#0f2f4a" radius={[6, 6, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </section>

                        <section className="bloc">
                            <h3>Chiffre d'affaires par catégorie</h3>
                            {stats.ca_par_categorie.length === 0 ? (
                                <p className="vide">Aucune vente pour le moment.</p>
                            ) : (
                                <ResponsiveContainer width="100%" height={260}>
                                    <PieChart>
                                        <Pie data={stats.ca_par_categorie} dataKey="total" nameKey="categorie" outerRadius={90}>
                                            {stats.ca_par_categorie.map((_, i) => (
                                                <Cell key={i} fill={COULEURS[i % COULEURS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(v) => formatAr(v)} />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            )}
                        </section>
                    </div>

                    {stats.liste_sous_seuil.length > 0 && (
                        <section className="bloc">
                            <h3 className="icone-texte"><TriangleAlert size={18} color="#dc2626" /> Produits à réapprovisionner</h3>
                            <div className="defile">
                                <table>
                                    <thead>
                                        <tr><th>Produit</th><th>Stock</th><th>Seuil</th></tr>
                                    </thead>
                                    <tbody>
                                        {stats.liste_sous_seuil.map((p) => (
                                            <tr key={p.id}>
                                                <td>{p.nom}</td>
                                                <td className="rouge">{p.stock}</td>
                                                <td>{p.seuil_minimal}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    )}
                </>
            )}
        </div>
    );
}