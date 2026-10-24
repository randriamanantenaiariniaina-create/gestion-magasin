import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export default function ChampMotDePasse({ value, onChange, autoFocus }) {
    const [visible, setVisible] = useState(false);

    return (
        <div className="champ-mdp">
            <input
                type={visible ? 'text' : 'password'}
                value={value}
                onChange={onChange}
                autoFocus={autoFocus}
            />
            <button
                type="button"
                className="oeil"
                onClick={() => setVisible(!visible)}
                aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                title={visible ? 'Masquer' : 'Afficher'}
            >
                {visible ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
        </div>
    );
}