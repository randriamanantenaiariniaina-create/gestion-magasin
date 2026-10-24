import CrudPage from '../components/CrudPage';

const CHAMPS = [
    { name: 'nom', label: 'Nom', requis: true, format: 'majuscules' },
    { name: 'prenom', label: 'Prénom', requis: true, format: 'capitaliser' },
    { name: 'telephone', label: 'Téléphone (facultatif)', type: 'tel' },
    { name: 'email', label: 'Email (facultatif)', type: 'email' },
    { name: 'adresse', label: 'Adresse' },
];

const COLONNES = [
    { titre: 'Nom', voir: (l) => l.nom },
    { titre: 'Prénom', voir: (l) => l.prenom },
    { titre: 'Téléphone', voir: (l) => l.telephone || '—' },
    { titre: 'Email', voir: (l) => l.email || '—' },
    { titre: 'Adresse', voir: (l) => l.adresse || '—' },
];

export default function Clients() {
    return (
        <CrudPage
            titre="Clients"
            singulier="Client"
            endpoint="/clients/"
            champs={CHAMPS}
            colonnes={COLONNES}
            recherche={['nom', 'prenom', 'telephone', 'email']}
            libelle={(l) => `${l.nom} ${l.prenom}`}
        />
    );
}
