import { useCallback, useEffect, useRef, useState } from 'react';

// Durée d'affichage d'un message de confirmation (en millisecondes)
export const DUREE_MESSAGE = 4000;

/*
 * Comme useState('') mais le message disparaît tout seul après quelques secondes.
 *   const [message, afficherMessage] = useMessageTemporaire();
 *   afficherMessage('Enregistrement effectué.');   // s'efface après 4 s
 *   afficherMessage('');                           // l'efface tout de suite
 */
export function useMessageTemporaire(duree = DUREE_MESSAGE) {
    const [message, setMessage] = useState('');
    const minuteur = useRef(null);

    const afficher = useCallback((texte) => {
        clearTimeout(minuteur.current);
        setMessage(texte);
        if (texte) minuteur.current = setTimeout(() => setMessage(''), duree);
    }, [duree]);

    // Évite un minuteur orphelin si la page est quittée
    useEffect(() => () => clearTimeout(minuteur.current), []);

    return [message, afficher];
}
