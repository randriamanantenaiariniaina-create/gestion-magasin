import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api/axios';
import ChampMotDePasse from '../components/ChampMotDePasse';
import { CircleCheck } from 'lucide-react';

export default function Reinitialiser() {
    const { uid, token } = useParams();
    const [password, setPassword] = useState('');
    const [confirmation, setConfirmation] = useState('');
    const [erreur, setErreur] = useState('');
    const [succes, setSucces] = useState('');
    const [enCours, setEnCours] = useState(false);

    const envoyer = async (e) => {
        e.preventDefault();
        setErreur('');
        setEnCours(true);
        try {
            const { data } = await api.post('/auth/reinitialiser/', { uid, token, password, confirmation });
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
                    <h1 className="icone-texte centre"><CircleCheck size={26} color="#16a34a" /> Mot de passe modifié</h1>
                    <p className="succes">{succes}</p>
                    <Link className="bouton lien-bouton" to="/connexion">Aller à la connexion</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="page-centree">
            <form className="carte" onSubmit={envoyer}>
                <h1>Nouveau mot de passe</h1>

                <label>Nouveau mot de passe</label>
                <ChampMotDePasse value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
                <small className="aide">
                    8 caractères minimum, avec une majuscule, une minuscule, un chiffre et un caractère spécial.
                </small>

                <label>Confirmer le mot de passe</label>
                <ChampMotDePasse value={confirmation} onChange={(e) => setConfirmation(e.target.value)} />

                {erreur && <p className="erreur">{erreur}</p>}

                <button className="bouton" disabled={enCours}>
                    {enCours ? 'Enregistrement...' : 'Enregistrer'}
                </button>

                <div className="liens">
                    <Link to="/mot-de-passe-oublie">Demander un nouveau lien</Link>
                </div>
            </form>
        </div>
    );
}