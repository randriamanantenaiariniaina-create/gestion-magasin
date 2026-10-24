import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import api from '../api/axios';

export default function MotDePasseOublie() {
    const [email, setEmail] = useState('');
    const [erreur, setErreur] = useState('');
    const [succes, setSucces] = useState('');
    const [enCours, setEnCours] = useState(false);

    const envoyer = async (e) => {
        e.preventDefault();
        setErreur('');
        setEnCours(true);
        try {
            const { data } = await api.post('/auth/mot-de-passe-oublie/', { email });
            setSucces(data.message);
        } catch (err) {
            setErreur(err.response?.data?.error || 'Impossible de joindre le serveur.');
        } finally {
            setEnCours(false);
        }
    };

    return (
        <div className="page-centree">
            <form className="carte" onSubmit={envoyer}>
                <h1>Mot de passe oublié</h1>
                <p className="sous-titre">Saisis ton email pour recevoir un lien</p>

                <label>Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />

                {erreur && <p className="erreur">{erreur}</p>}
                {succes && <p className="succes">{succes}</p>}

                <button className="bouton" disabled={enCours}>
                    {enCours ? 'Envoi...' : 'Envoyer le lien'}
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