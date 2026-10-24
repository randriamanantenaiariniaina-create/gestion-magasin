import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import api from '../api/axios';
import Modal from './Modal';
import ChampMotDePasse from './ChampMotDePasse';
import Pagination, { PAR_PAGE } from './Pagination';
import { useMessageTemporaire } from '../hooks';
import { enListe, formatTel, lireErreurs } from '../utils';

// Téléphone malgache : +261 3X XX XXX XX, avec X = 2, 3, 4, 7 ou 8
const REGEX_TEL = /^\+261 3[23478] \d{2} \d{3} \d{2}$/;
const MESSAGE_TEL =
    'Le téléphone doit commencer par +261 32, +261 33, +261 34, +261 37 ou +261 38, ' +
    'suivi de 7 chiffres (ex. : +261 34 12 345 67).';

// Mise en forme automatique pendant la saisie (indépendante de la touche Verr. Maj.)
const FORMATS = {
    // DUPONT
    majuscules: (s) => s.replace(/\s{2,}/g, ' ').replace(/^\s+/, '').toUpperCase(),
    // Jean-Pierre : tout en minuscules, puis une majuscule au début de chaque mot
    capitaliser: (s) =>
        s
            .replace(/\s{2,}/g, ' ')
            .replace(/^\s+/, '')
            .toLowerCase()
            .replace(/(^|[\s\-'’])(\p{L})/gu, (_, sep, lettre) => sep + lettre.toUpperCase()),
    // jean@mail.com : jamais de majuscule ni d'espace
    minuscules: (s) => s.replace(/\s/g, '').toLowerCase(),
};
const formatDe = (c) => c.format || (c.type === 'email' ? 'minuscules' : null);

/*
 * Une seule page pour toutes les gestions (catégories, fournisseurs, clients,
 * produits, utilisateurs). Chaque écran lui donne seulement sa description :
 *
 *  champs   : les champs du formulaire
 *             { name, label, type, requis, defaut, aide, options | source+cleLibelle,
 *               creationSeulement,        // modifiable uniquement à la création
 *               auto: '/url/',            // valeur proposée par l'API, affichée en grisé
 *               format: 'majuscules' | 'capitaliser' | 'minuscules',
 *               verrouille: (ligne) => bool,  // champ grisé en modification si vrai
 *               aideVerrou: 'texte' }         // explication quand le champ est verrouillé
 *  colonnes : les colonnes du tableau  { titre, voir(ligne) }
 *  recherche: noms des champs dans lesquels chercher
 */
export default function CrudPage({
    titre, singulier, endpoint, champs, colonnes, recherche = [], libelle,
}) {
    const [lignes, setLignes] = useState([]);
    const [options, setOptions] = useState({});
    const [chargement, setChargement] = useState(true);
    const [erreurChargement, setErreurChargement] = useState('');
    const [message, afficherMessage] = useMessageTemporaire();          // disparaît après 4 s
    const [erreurListe, afficherErreurListe] = useMessageTemporaire(6000);
    const [filtre, setFiltre] = useState('');
    const [page, setPage] = useState(1);

    const [edition, setEdition] = useState(null); // null = fermé, {} = nouveau, ligne = modification
    const [valeurs, setValeurs] = useState({});
    const [erreurs, setErreurs] = useState({ champs: {}, global: '' });
    const [enCours, setEnCours] = useState(false);

    const nomLigne = libelle || ((l) => l.nom || l.username || `#${l.id}`);

    // aller_fin = true après un ajout : on affiche la dernière page (le nouvel élément est à la fin)
    const charger = useCallback(async (allerFin = false) => {
        setChargement(true);
        setErreurChargement('');
        try {
            const { data } = await api.get(endpoint);
            const liste = enListe(data);
            setLignes(liste);
            if (allerFin) setPage(Math.max(1, Math.ceil(liste.length / PAR_PAGE)));
        } catch {
            setErreurChargement('Impossible de charger la liste.');
        } finally {
            setChargement(false);
        }
    }, [endpoint]);

    useEffect(() => {
        charger();
        // Listes déroulantes alimentées par l'API (ex. catégories d'un produit)
        champs.filter((c) => c.source).forEach(async (c) => {
            try {
                const { data } = await api.get(c.source);
                setOptions((o) => ({ ...o, [c.name]: enListe(data) }));
            } catch {
                /* la liste restera vide */
            }
        });
    }, [charger, champs]);

    const valeurVide = (c) => (c.type === 'tel' ? '+261' : c.defaut ?? '');

    // Champ grisé (non modifiable) ?
    const estVerrouille = (c, ligne) =>
        Boolean(c.auto) ||
        (Boolean(ligne?.id) && Boolean(c.creationSeulement || (c.verrouille && c.verrouille(ligne))));

    const ouvrir = (ligne = null) => {
        const init = {};
        champs.forEach((c) => {
            init[c.name] = ligne ? ligne[c.name] ?? valeurVide(c) : valeurVide(c);
        });
        // Jamais de mot de passe pré-rempli
        champs.filter((c) => c.type === 'password').forEach((c) => (init[c.name] = ''));
        setValeurs(init);
        setErreurs({ champs: {}, global: '' });
        setEdition(ligne || {});

        // Nouvel élément : l'API propose la valeur automatique (ex. la référence d'un produit)
        if (!ligne) {
            champs.filter((c) => c.auto).forEach(async (c) => {
                try {
                    const { data } = await api.get(c.auto);
                    setValeurs((v) => ({ ...v, [c.name]: data[c.name] ?? '' }));
                } catch {
                    /* le serveur la génèrera à l'enregistrement */
                }
            });
        }
    };

    const changer = (c, valeur) => {
        let v = valeur;
        if (c.type === 'tel') {
            v = formatTel(valeur);
        } else {
            const f = formatDe(c);
            if (f) v = FORMATS[f](String(valeur));
        }
        setValeurs((anciennes) => ({ ...anciennes, [c.name]: v }));
        // L'erreur de ce champ disparaît dès qu'on le corrige
        setErreurs((e) => {
            if (!e.champs[c.name]) return e;
            const reste = { ...e.champs };
            delete reste[c.name];
            return { ...e, champs: reste };
        });
    };

    const enregistrer = async (e) => {
        e.preventDefault();
        const modif = Boolean(edition.id);

        const charge = {};
        const problemes = {};
        champs.forEach((c) => {
            if (estVerrouille(c, edition)) return; // grisé : on ne l'envoie pas
            const v = valeurs[c.name];
            // Mot de passe vide en modification = on ne le change pas
            if (c.type === 'password' && modif && !v) return;

            const vide = c.type === 'tel'
                ? !v || String(v).trim() === '+261'
                : String(v ?? '').trim() === '';

            if (c.requis && vide) {
                problemes[c.name] = 'Ce champ est obligatoire.';
                return;
            }
            if (c.type === 'tel' && !vide && !REGEX_TEL.test(String(v).trim())) {
                problemes[c.name] = MESSAGE_TEL;
                return;
            }
            if (c.type === 'tel') charge[c.name] = vide ? '' : String(v).trim();
            else charge[c.name] = typeof v === 'string' ? v.trim() : v;
        });
        if (Object.keys(problemes).length) {
            setErreurs({ champs: problemes, global: '' });
            return;
        }

        setEnCours(true);
        setErreurs({ champs: {}, global: '' });
        try {
            if (modif) await api.patch(`${endpoint}${edition.id}/`, charge);
            else await api.post(endpoint, charge);
            setEdition(null);
            afficherMessage('Enregistrement effectué.');
            if (!modif) setFiltre(''); // le nouvel élément doit être visible, à la fin de la liste
            charger(!modif);
        } catch (err) {
            setErreurs(lireErreurs(err));
        } finally {
            setEnCours(false);
        }
    };

    const supprimer = async (ligne) => {
        if (!window.confirm(`Supprimer « ${nomLigne(ligne)} » ? Cette action est définitive.`)) return;
        afficherMessage('');
        afficherErreurListe('');
        try {
            await api.delete(`${endpoint}${ligne.id}/`);
            afficherMessage('Suppression effectuée.');
            charger();
        } catch (err) {
            afficherErreurListe(lireErreurs(err).global || 'Suppression impossible.');
        }
    };

    // Du plus ancien au plus récent : le dernier enregistrement est à la fin
    const triees = useMemo(() => [...lignes].sort((a, b) => a.id - b.id), [lignes]);

    const q = filtre.trim().toLowerCase();
    const visibles = useMemo(
        () => (q
            ? triees.filter((l) => recherche.some((k) => String(l[k] ?? '').toLowerCase().includes(q)))
            : triees),
        [triees, q, recherche],
    );

    const nbPages = Math.max(1, Math.ceil(visibles.length / PAR_PAGE));
    const pageCourante = Math.min(page, nbPages); // si on supprime la dernière ligne d'une page
    const affichees = visibles.slice((pageCourante - 1) * PAR_PAGE, pageCourante * PAR_PAGE);

    const optionsDe = (c) =>
        c.options || (options[c.name] || []).map((o) => ({ value: o.id, label: o[c.cleLibelle || 'nom'] }));

    const rendreChamp = (c) => {
        const id = `champ-${c.name}`;
        const commun = {
            id,
            disabled: estVerrouille(c, edition),
            value: valeurs[c.name] ?? '',
        };

        if (c.type === 'select') {
            return (
                <select {...commun} onChange={(e) => changer(c, e.target.value)}>
                    <option value="">— Choisir —</option>
                    {optionsDe(c).map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                </select>
            );
        }
        if (c.type === 'password') {
            return <ChampMotDePasse value={commun.value} onChange={(e) => changer(c, e.target.value)} />;
        }
        return (
            <input
                {...commun}
                type={c.type === 'tel' || c.type === 'email' ? 'text' : c.type || 'text'}
                inputMode={c.type === 'tel' ? 'tel' : c.type === 'email' ? 'email' : undefined}
                autoCapitalize={c.type === 'email' ? 'none' : undefined}
                autoComplete={c.type === 'email' ? 'off' : undefined}
                min={c.type === 'number' ? 0 : undefined}
                step={c.pas}
                placeholder={c.auto && !commun.value ? 'Générée automatiquement' : c.placeholder}
                onChange={(e) => changer(c, e.target.value)}
            />
        );
    };

    return (
        <div>
            <div className="entete-page">
                <h1 className="titre-page">{titre}</h1>
                <button className="bouton-principal" onClick={() => ouvrir()}>
                    <Plus size={16} /> Ajouter
                </button>
            </div>

            {message && <p className="succes">{message}</p>}
            {erreurListe && <p className="erreur">{erreurListe}</p>}
            {erreurChargement && <p className="erreur">{erreurChargement}</p>}

            <section className="bloc">
                {recherche.length > 0 && (
                    <div className="recherche">
                        <Search size={16} />
                        <input
                            placeholder="Rechercher..."
                            value={filtre}
                            onChange={(e) => {
                                setFiltre(e.target.value);
                                setPage(1);
                            }}
                        />
                    </div>
                )}

                {chargement ? (
                    <p className="vide">Chargement...</p>
                ) : visibles.length === 0 ? (
                    <p className="vide">
                        {lignes.length === 0 ? 'Rien pour le moment. Clique sur « Ajouter ».' : 'Aucun résultat.'}
                    </p>
                ) : (
                    <>
                        <div className="defile">
                            <table>
                                <thead>
                                    <tr>
                                        {colonnes.map((c) => <th key={c.titre}>{c.titre}</th>)}
                                        <th className="col-actions">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {affichees.map((l) => (
                                        <tr key={l.id}>
                                            {colonnes.map((c) => <td key={c.titre}>{c.voir(l)}</td>)}
                                            <td className="col-actions">
                                                <button className="icone-bouton" onClick={() => ouvrir(l)} aria-label="Modifier">
                                                    <Pencil size={16} />
                                                </button>
                                                <button className="icone-bouton danger" onClick={() => supprimer(l)} aria-label="Supprimer">
                                                    <Trash2 size={16} />
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

            {edition && (
                <Modal
                    titre={`${edition.id ? 'Modifier' : 'Ajouter'} — ${singulier}`}
                    onFermer={() => setEdition(null)}
                >
                    <form onSubmit={enregistrer} className="formulaire" noValidate>
                        {champs.map((c) => {
                            const verrou = estVerrouille(c, edition);
                            const aide = verrou && c.aideVerrou ? c.aideVerrou : c.aide;
                            return (
                                <div className="form-champ" key={c.name}>
                                    <label htmlFor={`champ-${c.name}`}>
                                        {c.label}{c.requis && !verrou && !(edition.id && c.type === 'password') ? ' *' : ''}
                                    </label>
                                    {rendreChamp(c)}
                                    {aide && <span className="aide">{aide}</span>}
                                    {erreurs.champs[c.name] && (
                                        <span className="erreur-champ">{erreurs.champs[c.name]}</span>
                                    )}
                                </div>
                            );
                        })}
                        {erreurs.global && <p className="erreur">{erreurs.global}</p>}
                        <div className="modal-actions">
                            <button type="button" className="bouton-secondaire" onClick={() => setEdition(null)}>
                                Annuler
                            </button>
                            <button className="bouton-principal" disabled={enCours}>
                                {enCours ? 'Enregistrement...' : 'Enregistrer'}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
}
