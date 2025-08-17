import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { LocationProvider } from './context/LocationContext';
import BikePartList from './components/bikeParts/BikePartList';
import LandingPage from './components/landing/LandingPage';
import LoginPage from './components/auth/LoginPage';
import useAuth from './hooks/useAuth';
import ShopsList from './components/shops/ShopsList';
import CreateVendorPage from './components/admin/CreateVendorPage';
import VendorDashboard from './components/vendor/VendorDashboard';

// Context-aware auth guard
const RequireAuth = ({ children, roles }) => {
  const { user, loading } = useAuth();
  if (loading) return <div style={{padding:'1rem'}}>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
};

const AdminDashboard = () => (
  <div style={{ padding: '2rem' }}>
    <h2>Admin Dashboard</h2>
    <ul>
      <li><Link to="/admin/vendors/create">Add Vendor</Link></li>
    </ul>
  </div>
);

const NavBar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  // Hide navbar on vendor dashboard for a cleaner vendor workspace
  if (
    location.pathname.startsWith('/vendor/dashboard') ||
    location.pathname === '/' ||
    location.pathname === '/login'
  ) return null;
  return (
    <nav style={{ display:'flex', gap:'1rem', padding:'0.75rem 1rem', background:'#222', color:'#fff' }}>
  <Link style={{color:'#fff'}} to="/">Home</Link>
  <Link style={{color:'#fff'}} to="/parts">Parts</Link>
  {user && <Link style={{color:'#fff'}} to="/shops">Shops</Link>}
      {user?.role === 'admin' && <Link style={{color:'#fff'}} to="/admin/dashboard">Admin</Link>}
      {user?.role === 'vendor' && <Link style={{color:'#fff'}} to="/vendor/dashboard">Vendor</Link>}
      {!user && <Link style={{marginLeft:'auto', color:'#fff'}} to="/login">Login</Link>}
      {user && <button onClick={()=> { logout(); navigate('/'); }} style={{ marginLeft:'auto' }}>Logout</button>}
    </nav>
  );
};

function App() {
  return (
    <AuthProvider>
      <LocationProvider>
        <Router>
          <NavBar />
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/parts" element={<BikePartList />} />
            <Route path="/shops" element={<RequireAuth><ShopsList /></RequireAuth>} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/admin/dashboard" element={<RequireAuth roles={['admin']}><AdminDashboard /></RequireAuth>} />
            <Route path="/admin/vendors/create" element={<RequireAuth roles={['admin']}><CreateVendorPage /></RequireAuth>} />
            <Route path="/vendor/dashboard" element={<RequireAuth roles={['vendor','admin']}><VendorDashboard /></RequireAuth>} />
            <Route path="/customer/dashboard" element={<RequireAuth roles={['customer','admin']}><div style={{ padding: '2rem' }}><h2>Customer Dashboard</h2></div></RequireAuth>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </LocationProvider>
    </AuthProvider>
  );
}

// Decides what to show at root
// No longer used; landing page is public

export default App;
