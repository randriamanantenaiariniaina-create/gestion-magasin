import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ChampMotDePasse from '../components/ChampMotDePasse';
import logo from '../assets/logo.png';

export default function Login() {
    const { user, connecter } = useAuth();
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [erreur, setErreur] = useState('');
    const [enCours, setEnCours] = useState(false);

    // Déjà connecté : pas besoin de voir cette page
    if (user) return <Navigate to="/" replace />;

    const envoyer = async (e) => {
        e.preventDefault();
        setErreur('');
        if (!username.trim() || !password.trim()) {
            setErreur("Remplis le nom d'utilisateur et le mot de passe.");
            return;
        }
        setEnCours(true);
        try {
            await connecter(username.trim(), password);
            navigate('/');
        } catch (err) {
            if (err.response?.status === 401) {
                setErreur("Nom d'utilisateur ou mot de passe incorrect.");
            } else {
                setErreur('Impossible de joindre le serveur. Réessaie dans un instant.');
            }
        } finally {
            setEnCours(false);
        }
    };

    return (
        <div className="page-centree">
            <form className="carte" onSubmit={envoyer}>
                <img className="logo-carte" src={logo} alt="Logo" />
                <h1>Gestion de Magasin</h1>
                <p className="sous-titre">Connecte-toi pour continuer</p>

                <label>Nom d'utilisateur</label>
                <input value={username} onChange={(e) => setUsername(e.target.value)} autoFocus />

                <label>Mot de passe</label>
                <ChampMotDePasse value={password} onChange={(e) => setPassword(e.target.value)} />

                {erreur && <p className="erreur">{erreur}</p>}

                <button className="bouton" disabled={enCours}>
                    {enCours ? 'Connexion...' : 'Se connecter'}
                </button>

                <div className="liens">
                    <Link to="/mot-de-passe-oublie">Mot de passe oublié ?</Link>
                    <Link to="/inscription">Créer un compte</Link>
                </div>
            </form>
        </div>
    );
}