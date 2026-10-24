import CrudPage from '../components/CrudPage';

const CHAMPS = [
    { name: 'nom', label: 'Nom', requis: true },
    { name: 'telephone', label: 'Téléphone', type: 'tel', requis: true },
    { name: 'email', label: 'Email', type: 'email', requis: true },
    { name: 'adresse', label: 'Adresse' },
];

const COLONNES = [
    { titre: 'Nom', voir: (l) => l.nom },
    { titre: 'Téléphone', voir: (l) => l.telephone },
    { titre: 'Email', voir: (l) => l.email },
    { titre: 'Adresse', voir: (l) => l.adresse || '—' },
];

export default function Fournisseurs() {
    return (
        <CrudPage
            titre="Fournisseurs"
            singulier="Fournisseur"
            endpoint="/fournisseurs/"
            champs={CHAMPS}
            colonnes={COLONNES}
            recherche={['nom', 'telephone', 'email', 'adresse']}
        />
    );
}
