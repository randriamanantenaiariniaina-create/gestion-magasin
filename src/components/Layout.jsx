import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard, ShoppingCart, Users, Package, FolderOpen,
    Truck, UserCog, LogOut, Menu, Warehouse, KeyRound,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/logo.png';

// « Tableau de bord » reste toujours en premier
const TABLEAU_DE_BORD = { to: '/', label: 'Tableau de bord', Icone: LayoutDashboard, fin: true };

// Tous les autres menus sont classés par ordre alphabétique
const LIENS_COMMUNS = [
    { to: '/ventes', label: 'Ventes', Icone: ShoppingCart },
];

const LIENS_ADMIN = [
    { to: '/categories', label: 'Catégories', Icone: FolderOpen },
    { to: '/clients', label: 'Clients', Icone: Users },
    { to: '/fournisseurs', label: 'Fournisseurs', Icone: Truck },
    { to: '/produits', label: 'Produits', Icone: Package },
    { to: '/stock', label: 'Stock', Icone: Warehouse },
    { to: '/utilisateurs', label: 'Utilisateurs', Icone: UserCog },
];

const MON_MOT_DE_PASSE = { to: '/mon-mot-de-passe', label: 'Mon mot de passe', Icone: KeyRound };

const parOrdreAlphabetique = (a, b) => a.label.localeCompare(b.label, 'fr');

export default function Layout() {
    const { user, deconnecter, estAdmin } = useAuth();
    const [ouvert, setOuvert] = useState(false);
    const navigate = useNavigate();
    const { pathname } = useLocation();

    const liens = [
        TABLEAU_DE_BORD,
        ...[...LIENS_COMMUNS, ...(estAdmin ? LIENS_ADMIN : [])].sort(parOrdreAlphabetique),
    ];

    // Titre de la fenêtre affichée : on le montre dans la barre du haut et dans l'onglet du navigateur
    const actuel = [...liens, MON_MOT_DE_PASSE].find((l) => l.to === pathname);
    const titre = actuel?.label || 'Gestion Magasin';
    useEffect(() => {
        document.title = `${titre} — Gestion Magasin`;
    }, [titre]);

    const sortir = () => {
        deconnecter();
        navigate('/connexion');
    };

    return (
        <div className="appli">
            <button className="burger" onClick={() => setOuvert(true)} aria-label="Ouvrir le menu">
                <Menu size={22} />
            </button>
            {ouvert && <div className="voile" onClick={() => setOuvert(false)} />}

            <aside className={`menu ${ouvert ? 'ouvert' : ''}`}>
                <div className="marque">
                    <img src={logo} alt="Logo" />
                    <h2>Gestion Magasin</h2>
                </div>
                <nav>
                    {liens.map(({ to, label, Icone, fin }) => (
                        <NavLink
                            key={to}
                            to={to}
                            end={fin}
                            onClick={() => setOuvert(false)}
                            className={({ isActive }) => (isActive ? 'actif' : '')}
                        >
                            <Icone size={18} />
                            <span>{label}</span>
                        </NavLink>
                    ))}
                </nav>
            </aside>

            <div className="zone">
                <header className="barre-haut">
                    <div className="barre-titre">
                        {actuel && <actuel.Icone size={20} />}
                        <span>{titre}</span>
                    </div>
                    <strong className="barre-nom">{user.username}</strong>
                    <span className="badge">{estAdmin ? 'Admin' : 'Vendeur'}</span>

                    {/* Les mots n'apparaissent qu'au survol de la souris */}
                    <NavLink
                        to="/mon-mot-de-passe"
                        data-info="Mon mot de passe"
                        aria-label="Mon mot de passe"
                        className={({ isActive }) => `barre-bouton ${isActive ? 'actif' : ''}`}
                    >
                        <KeyRound size={19} />
                    </NavLink>
                    <button
                        type="button"
                        data-info="Déconnexion"
                        aria-label="Déconnexion"
                        className="barre-bouton danger"
                        onClick={sortir}
                    >
                        <LogOut size={19} />
                    </button>
                </header>

                <main className="contenu">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
