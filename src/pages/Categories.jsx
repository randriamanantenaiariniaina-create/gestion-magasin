import CrudPage from '../components/CrudPage';

const CHAMPS = [
    { name: 'nom', label: 'Nom', requis: true },
    { name: 'description', label: 'Description' },
];

const COLONNES = [
    { titre: 'Nom', voir: (l) => l.nom },
    { titre: 'Description', voir: (l) => l.description || '—' },
];

export default function Categories() {
    return (
        <CrudPage
            titre="Catégories"
            singulier="Catégorie"
            endpoint="/categories/"
            champs={CHAMPS}
            colonnes={COLONNES}
            recherche={['nom', 'description']}
        />
    );
}
