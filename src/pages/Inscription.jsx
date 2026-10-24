import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import ChampMotDePasse from '../components/ChampMotDePasse';
import { ArrowLeft, CircleCheck } from 'lucide-react';

export default function Inscription() {
    const [form, setForm] = useState({ username: '', email: '', password: '', confirmation: '' });
    const [erreur, setErreur] = useState('');
    const [succes, setSucces] = useState('');
    const [enCours, setEnCours] = useState(false);

    const changer = (champ) => (e) => setForm({ ...form, [champ]: e.target.value });

    const envoyer = async (e) => {
        e.preventDefault();
        setErreur('');
        setEnCours(true);
        try {
            const { data } = await api.post('/auth/inscription/', form);
            setSucces(data.message);
        } catch (err) {
            setErreur(err.response?.data?.error || 'Impossible de joindre le serveur.');
        } finally {
            setEnCours(false);
        }
    };

    if (succes) {
        return (
            <div className="page-centree">
                <div className="carte">
                    <h1 className="icone-texte centre"><CircleCheck size={26} color="#16a34a" /> Compte créé</h1>
                    <p className="succes">{succes}</p>
                    <Link className="bouton lien-bouton" to="/connexion">Aller à la connexion</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="page-centree">
            <form className="carte" onSubmit={envoyer}>
                <h1>Créer un compte</h1>
                <p className="sous-titre">Ton compte sera de type vendeur</p>

                <label>Nom d'utilisateur</label>
                <input value={form.username} onChange={changer('username')} autoFocus />

                <label>Email</label>
                <input type="email" value={form.email} onChange={changer('email')} />

                <label>Mot de passe</label>
                <ChampMotDePasse value={form.password} onChange={changer('password')} />
                <small className="aide">
                    8 caractères minimum, avec une majuscule, une minuscule, un chiffre et un caractère spécial.
                </small>

                <label>Confirmer le mot de passe</label>
                <ChampMotDePasse value={form.confirmation} onChange={changer('confirmation')} />

                {erreur && <p className="erreur">{erreur}</p>}

                <button className="bouton" disabled={enCours}>
                    {enCours ? 'Création...' : 'Créer mon compte'}
                </button>

                <div className="liens">
                    <Link to="/connexion" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <ArrowLeft size={16} /> Retour à la connexion
                    </Link>
                </div>
            </form>
        </div>
    );
}