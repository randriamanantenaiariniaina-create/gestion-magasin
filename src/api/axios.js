import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api',
});

// Ajoute le jeton de connexion à chaque requête
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('access');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// Jeton expiré : on renvoie vers la page de connexion
api.interceptors.response.use(
    (reponse) => reponse,
    (erreur) => {
        const url = erreur.config?.url || '';
        if (erreur.response?.status === 401 && !url.includes('/auth/')) {
            localStorage.clear();
            window.location.href = '/connexion';
        }
        return Promise.reject(erreur);
    }
);

export default api;