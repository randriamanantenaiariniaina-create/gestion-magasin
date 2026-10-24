import { useState } from 'react';
import { CircleCheck } from 'lucide-react';
import api from '../api/axios';
import ChampMotDePasse from '../components/ChampMotDePasse';
import { useMessageTemporaire } from '../hooks';

// Page accessible à tout utilisateur connecté (admin ou vendeur) : il change SON mot de passe
export default function MonMotDePasse() {
    const [ancien, setAncien] = useState('');
    const [nouveau, setNouveau] = useState('');
    const [confirmation, setConfirmation] = useState('');
    const [erreur, setErreur] = useState('');
    const [succes, setSucces] = useMessageTemporaire();
    const [enCours, setEnCours] = useState(false);

    const envoyer = async (e) => {
        e.preventDefault();
        setErreur('');
        setSucces('');
        setEnCours(true);
        try {
            const { data } = await api.post('/auth/changer-mot-de-passe/', { ancien, nouveau, confirmation });
            setSucces(data.message);
            setAncien('');
            setNouveau('');
            setConfirmation('');
        } catch (err) {
            if (err.response?.status === 429) setErreur('Trop de tentatives. Réessaie dans une heure.');
            else setErreur(err.response?.data?.error || 'Impossible de joindre le serveur.');
        } finally {
            setEnCours(false);
        }
    };

    return (
        <div>
            <div className="entete-page">
                <h1 className="titre-page">Mon mot de passe</h1>
            </div>

            <section className="bloc" style={{ maxWidth: 460 }}>
                <form className="formulaire" onSubmit={envoyer} noValidate>
                    <div className="form-champ">
                        <label>Mot de passe actuel</label>
                        <ChampMotDePasse value={ancien} onChange={(e) => setAncien(e.target.value)} autoFocus />
                    </div>
                    <div className="form-champ">
                        <label>Nouveau mot de passe</label>
                        <ChampMotDePasse value={nouveau} onChange={(e) => setNouveau(e.target.value)} />
                        <span className="aide">
                            8 caractères minimum, avec une majuscule, une minuscule, un chiffre et un caractère spécial.
                        </span>
                    </div>
                    <div className="form-champ">
                        <label>Confirmer le nouveau mot de passe</label>
                        <ChampMotDePasse value={confirmation} onChange={(e) => setConfirmation(e.target.value)} />
                    </div>

                    {erreur && <p className="erreur">{erreur}</p>}
                    {succes && <p className="succes icone-texte"><CircleCheck size={18} /> {succes}</p>}

                    <div className="modal-actions">
                        <button className="bouton-principal" disabled={enCours}>
                            {enCours ? 'Enregistrement...' : 'Changer le mot de passe'}
                        </button>
                    </div>
                </form>
            </section>
        </div>
    );
}
