import { useEffect } from 'react';
import { X } from 'lucide-react';

export default function Modal({ titre, onFermer, children }) {
    // Échap ferme la fenêtre
    useEffect(() => {
        const touche = (e) => e.key === 'Escape' && onFermer();
        window.addEventListener('keydown', touche);
        return () => window.removeEventListener('keydown', touche);
    }, [onFermer]);

    return (
        <div className="modal-fond" onClick={onFermer}>
            <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
                <div className="modal-entete">
                    <h2>{titre}</h2>
                    <button className="icone-bouton" onClick={onFermer} aria-label="Fermer">
                        <X size={20} />
                    </button>
                </div>
                {children}
            </div>
        </div>
    );
}
