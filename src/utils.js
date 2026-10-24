// Montant en Ariary : 12500 -> "12 500 Ar"
export const formatAr = (n) => new Intl.NumberFormat('fr-FR').format(Number(n) || 0) + ' Ar';

// Saisie libre -> format malgache imposé par l'API : +261 3X XX XXX XX
export function formatTel(saisie) {
    let c = String(saisie || '').replace(/\D/g, '');
    if (c.startsWith('261')) c = c.slice(3);
    if (c.startsWith('0')) c = c.slice(1);
    c = c.slice(0, 9);
    const blocs = [c.slice(0, 2), c.slice(2, 4), c.slice(4, 7), c.slice(7, 9)].filter(Boolean);
    return '+261' + (blocs.length ? ' ' + blocs.join(' ') : '');
}

// Les réponses d'erreur de l'API ont plusieurs formes ; on les ramène à
// { champs: { nom_du_champ: "message" }, global: "message général" }
export function lireErreurs(err) {
    if (!err.response) {
        return { champs: {}, global: 'Impossible de joindre le serveur. Réessaie dans un instant.' };
    }
    const d = err.response.data;
    if (d && typeof d === 'object' && !Array.isArray(d)) {
        if (d.error) return { champs: {}, global: d.error };
        if (d.detail) return { champs: {}, global: d.detail };
        const champs = {};
        Object.entries(d).forEach(([cle, v]) => {
            champs[cle] = Array.isArray(v) ? v.join(' ') : String(v);
        });
        return { champs, global: '' };
    }
    return { champs: {}, global: 'Une erreur est survenue.' };
}

// Certaines listes pourraient être paginées plus tard : on accepte les deux formes
export const enListe = (data) => (Array.isArray(data) ? data : data?.results ?? []);
