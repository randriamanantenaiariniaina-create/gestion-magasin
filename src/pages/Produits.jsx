import CrudPage from '../components/CrudPage';
import { formatAr } from '../utils';

const CHAMPS = [
    // Grisée : proposée par le serveur (PRD-00001...), jamais saisie à la main
    { name: 'reference', label: 'Référence', auto: '/produits/prochaine-reference/' },
    { name: 'nom', label: 'Nom', requis: true },
    { name: 'categorie', label: 'Catégorie', type: 'select', source: '/categories/', requis: true },
    { name: 'fournisseur', label: 'Fournisseur', type: 'select', source: '/fournisseurs/', requis: true },
    { name: 'prix', label: 'Prix (Ar)', type: 'number', pas: '0.01', requis: true },
    { name: 'seuil_minimal', label: 'Seuil minimal', type: 'number', defaut: 5, requis: true, aide: "Alerte quand le stock passe en dessous." },
    {
        name: 'unite', label: 'Unité', type: 'select', defaut: 'piece', requis: true,
        options: [
            { value: 'piece', label: 'Pièce' },
            { value: 'litre', label: 'Litre (L)' },
            { value: 'kg', label: 'Kilogramme (kg)' },
            { value: 'g', label: 'Gramme (g)' },
            { value: 'carton', label: 'Carton' },
            { value: 'sachet', label: 'Sachet' },
            { value: 'boite', label: 'Boîte' },
        ],
    },
];

const COLONNES = [
    { titre: 'Référence', voir: (l) => l.reference },
    { titre: 'Nom', voir: (l) => l.nom },
    { titre: 'Catégorie', voir: (l) => l.categorie_nom },
    { titre: 'Fournisseur', voir: (l) => l.fournisseur_nom },
    { titre: 'Prix', voir: (l) => formatAr(l.prix) },
    {
        titre: 'Stock',
        voir: (l) => (
            <span className={l.stock < l.seuil_minimal ? 'rouge' : ''}>
                {l.stock} {l.unite}
            </span>
        ),
    },
    { titre: 'Seuil', voir: (l) => l.seuil_minimal },
];

export default function Produits() {
    return (
        <CrudPage
            titre="Produits"
            singulier="Produit"
            endpoint="/produits/"
            champs={CHAMPS}
            colonnes={COLONNES}
            recherche={['reference', 'nom', 'categorie_nom', 'fournisseur_nom']}
        />
    );
}
