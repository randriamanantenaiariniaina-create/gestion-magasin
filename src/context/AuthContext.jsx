import { createContext, useContext, useEffect, useState } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

function lireUtilisateurSauvegarde() {
    try {
        return JSON.parse(localStorage.getItem('user'));
    } catch {
        return null;
    }
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(lireUtilisateurSauvegarde);
    // pret = le rôle affiché a été vérifié auprès du serveur (rien à vérifier si personne n'est connecté)
    const [pret, setPret] = useState(() => !localStorage.getItem('access'));

    // À chaque ouverture de l'application : on redemande qui je suis et mon rôle à la base.
    // Le rôle gardé dans le navigateur n'est donc jamais périmé.
    useEffect(() => {
        if (!localStorage.getItem('access')) return undefined;
        let annule = false;
        api.get('/auth/moi/')
            .then(({ data }) => {
                if (annule) return;
                localStorage.setItem('user', JSON.stringify(data));
                setUser(data);
            })
            .catch((err) => {
                if (annule) return;
                // Jeton invalide ou expiré : retour à la connexion.
                // Serveur injoignable : on garde la session, la page affichera son erreur.
                if (err.response?.status === 401) {
                    localStorage.clear();
                    setUser(null);
                }
            })
            .finally(() => {
                if (!annule) setPret(true);
            });
        return () => {
            annule = true;
        };
    }, []);

    const connecter = async (username, password) => {
        const { data } = await api.post('/auth/login/', { username, password });
        localStorage.setItem('access', data.access);
        localStorage.setItem('refresh', data.refresh);
        localStorage.setItem('user', JSON.stringify(data.user));
        setUser(data.user);
        setPret(true);
    };

    const deconnecter = () => {
        localStorage.clear();
        setUser(null);
        setPret(true);
    };

    const valeur = { user, pret, connecter, deconnecter, estAdmin: user?.role === 'admin' };
    return <AuthContext.Provider value={valeur}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
