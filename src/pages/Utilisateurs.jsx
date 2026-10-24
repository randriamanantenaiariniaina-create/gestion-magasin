import CrudPage from '../components/CrudPage';

const CHAMPS = [
    { name: 'username', label: "Nom d'utilisateur", requis: true },
    { name: 'email', label: 'Email', type: 'email', requis: true },
    {
        name: 'role', label: 'Rôle', type: 'select', requis: true, defaut: 'vendeur',
        verrouille: (ligne) => ligne.role === 'admin',
        aideVerrou: "Le rôle d'un administrateur ne peut pas être modifié.",
        options: [
            { value: 'vendeur', label: 'Vendeur' },
            { value: 'admin', label: 'Admin' },
        ],
    },
    {
        name: 'password', label: 'Mot de passe', type: 'password', requis: true,
        aide: '8 caractères min. : majuscule, minuscule, chiffre et caractère spécial. En modification, laisse vide pour ne pas le changer.',
    },
];

const COLONNES = [
    { titre: "Nom d'utilisateur", voir: (l) => l.username },
    { titre: 'Email', voir: (l) => l.email || '—' },
    {
        titre: 'Rôle',
        voir: (l) => (
            <span className={`etiquette ${l.role === 'admin' ? 'etiquette-admin' : ''}`}>
                {l.role === 'admin' ? 'Admin' : 'Vendeur'}
            </span>
        ),
    },
];

export default function Utilisateurs() {
    return (
        <CrudPage
            titre="Utilisateurs"
            singulier="Utilisateur"
            endpoint="/utilisateurs/"
            champs={CHAMPS}
            colonnes={COLONNES}
            recherche={['username', 'email']}
        />
    );
}
