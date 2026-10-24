import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { FileText, Printer, X } from 'lucide-react';
import { MAGASIN } from '../magasin';
import { formatAr } from '../utils';

const MODES = { espece: 'Espèce', mobile_money: 'Mobile Money' };

/*
 * Reçu de vente au format ticket de caisse (80 mm).
 * « Imprimer » ouvre la fenêtre d'impression du navigateur : on y choisit l'imprimante
 * de tickets, une imprimante A4 ou « Enregistrer en PDF ».
 * Le reçu est affiché dans <body> (portail) pour que seul lui soit imprimé, sans menu ni barre.
 */
export default function Recu({ vente, onFermer }) {
    useEffect(() => {
        const surTouche = (e) => {
            if (e.key === 'Escape') onFermer();
        };
        window.addEventListener('keydown', surTouche);
        return () => window.removeEventListener('keydown', surTouche);
    }, [onFermer]);

    const papier = useRef(null);

    // Retire le format de papier temporaire et revient à l'impression normale des autres pages
    const nettoyer = () => {
        document.querySelectorAll('style[data-recu-page]').forEach((s) => s.remove());
        delete document.documentElement.dataset.recu;
    };
    useEffect(() => nettoyer, []);

    /*
     * format = 'ticket' : page de 80 mm de large, à la hauteur exacte du reçu (imprimante de tickets)
     * format = 'a4'     : reçu agrandi et centré sur une feuille A4 (PDF ou imprimante de bureau)
     * Le format est appliqué seulement le temps de l'impression.
     */
    const imprimer = (format) => {
        nettoyer();
        const style = document.createElement('style');
        style.setAttribute('data-recu-page', '');
        if (format === 'a4') {
            style.textContent = '@page { size: A4; margin: 0; }';
        } else {
            const hauteurMm = Math.ceil(((papier.current?.scrollHeight || 600) * 25.4) / 96) + 10;
            style.textContent = `@page { size: 80mm ${hauteurMm}mm; margin: 0; }`;
        }
        document.head.appendChild(style);
        document.documentElement.dataset.recu = format;
        window.addEventListener('afterprint', nettoyer, { once: true });
        window.print();
    };

    const numero = String(vente.id).padStart(6, '0');
    const date = new Date(vente.date).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });

    return createPortal(
        <div className="recu-voile" onClick={onFermer}>
            <div
                className="recu-boite"
                role="dialog"
                aria-modal="true"
                aria-label={`Reçu n°${numero}`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="recu-actions">
                    <button className="bouton-principal" onClick={() => imprimer('ticket')}>
                        <Printer size={16} /> Ticket 80 mm
                    </button>
                    <button className="bouton-principal" onClick={() => imprimer('a4')}>
                        <FileText size={16} /> PDF / A4
                    </button>
                    <button className="bouton-secondaire" onClick={onFermer}>
                        <X size={16} /> Fermer
                    </button>
                </div>

                <article className="recu-papier" ref={papier}>
                    <header className="recu-entete">
                        <strong className="recu-nom">{MAGASIN.nom}</strong>
                        <span>{MAGASIN.adresse}</span>
                        <span>Tél : {MAGASIN.telephone}</span>
                    </header>

                    <hr />
                    <div className="recu-infos">
                        <p><span>Reçu n°</span><strong>{numero}</strong></p>
                        <p><span>Date</span><span>{date}</span></p>
                        <p><span>Client</span><span>{vente.client_nom}</span></p>
                        <p><span>Vendeur</span><span>{vente.vendeur_nom}</span></p>
                        <p><span>Paiement</span><span>{MODES[vente.mode_paiement] || vente.mode_paiement}</span></p>
                    </div>

                    <hr />
                    <ul className="recu-lignes">
                        {(vente.details || []).map((d) => (
                            <li key={d.id}>
                                <span className="recu-produit">{d.produit_nom}</span>
                                <span>{d.quantite} × {formatAr(d.prix_unitaire)}</span>
                                <strong>{formatAr(d.sous_total)}</strong>
                            </li>
                        ))}
                    </ul>

                    <hr />
                    <p className="recu-total"><span>TOTAL</span><strong>{formatAr(vente.total)}</strong></p>
                    <hr />

                    <footer className="recu-pied">
                        <span>{MAGASIN.message}</span>
                        <span>{MAGASIN.mention}</span>
                    </footer>
                </article>
            </div>
        </div>,
        document.body,
    );
}
