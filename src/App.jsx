import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Categories from './pages/Categories';
import Clients from './pages/Clients';
import Dashboard from './pages/Dashboard';
import Fournisseurs from './pages/Fournisseurs';
import Inscription from './pages/Inscription';
import Login from './pages/Login';
import MonMotDePasse from './pages/MonMotDePasse';
import MotDePasseOublie from './pages/MotDePasseOublie';
import Produits from './pages/Produits';
import Reinitialiser from './pages/Reinitialiser';
import Stock from './pages/Stock';
import Utilisateurs from './pages/Utilisateurs';
import Ventes from './pages/Ventes';

// Réserve une page aux personnes connectées (et aux admins si demandé)
function RouteProtegee({ children, adminSeulement }) {
  const { user, pret, estAdmin } = useAuth();
  // On attend que le serveur confirme le rôle avant de décider quelle partie afficher
  if (!pret) return <p className="vide">Chargement...</p>;
  if (!user) return <Navigate to="/connexion" replace />;
  if (adminSeulement && !estAdmin) return <Navigate to="/" replace />;
  return children;
}

const admin = (page) => <RouteProtegee adminSeulement>{page}</RouteProtegee>;

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/connexion" element={<Login />} />
          <Route path="/inscription" element={<Inscription />} />
          <Route path="/mot-de-passe-oublie" element={<MotDePasseOublie />} />
          <Route path="/reinitialiser/:uid/:token" element={<Reinitialiser />} />

          <Route element={<RouteProtegee><Layout /></RouteProtegee>}>
            <Route index element={<Dashboard />} />
            <Route path="ventes" element={<Ventes />} />
            <Route path="mon-mot-de-passe" element={<MonMotDePasse />} />
            <Route path="categories" element={admin(<Categories />)} />
            <Route path="clients" element={admin(<Clients />)} />
            <Route path="fournisseurs" element={admin(<Fournisseurs />)} />
            <Route path="produits" element={admin(<Produits />)} />
            <Route path="stock" element={admin(<Stock />)} />
            <Route path="utilisateurs" element={admin(<Utilisateurs />)} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
