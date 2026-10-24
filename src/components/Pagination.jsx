import { ChevronLeft, ChevronRight } from 'lucide-react';

export const PAR_PAGE = 10;

// Numéros à afficher : 1 … 4 5 [6] 7 8 … 20
function numeros(page, total) {
    const voulus = new Set([1, total, page - 1, page, page + 1]);
    const liste = [...voulus].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
    const sortie = [];
    liste.forEach((n, i) => {
        if (i > 0 && n - liste[i - 1] > 1) sortie.push('…' + n);
        sortie.push(n);
    });
    return sortie;
}

/*
 * Pagination simple. `page` commence à 1.
 * Ne montre les boutons que s'il y a plus d'une page.
 */
export default function Pagination({ page, total, parPage = PAR_PAGE, onChange }) {
    if (total === 0) return null;
    const nbPages = Math.max(1, Math.ceil(total / parPage));
    const debut = (page - 1) * parPage + 1;
    const fin = Math.min(page * parPage, total);

    return (
        <div className="pagination">
            <span className="pagination-info">{debut}–{fin} sur {total}</span>
            {nbPages > 1 && (
                <nav className="pagination-boutons" aria-label="Pagination">
                    <button onClick={() => onChange(page - 1)} disabled={page <= 1} aria-label="Page précédente">
                        <ChevronLeft size={16} />
                    </button>
                    {numeros(page, nbPages).map((n) =>
                        typeof n === 'string' ? (
                            <span key={n} className="pagination-points">…</span>
                        ) : (
                            <button
                                key={n}
                                className={n === page ? 'actif' : ''}
                                onClick={() => onChange(n)}
                                aria-current={n === page ? 'page' : undefined}
                            >
                                {n}
                            </button>
                        ),
                    )}
                    <button onClick={() => onChange(page + 1)} disabled={page >= nbPages} aria-label="Page suivante">
                        <ChevronRight size={16} />
                    </button>
                </nav>
            )}
        </div>
    );
}
