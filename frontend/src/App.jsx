import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import CustomerDetail from './pages/CustomerDetail';
import Products from './pages/Products';
import Suppliers from './pages/Suppliers';
import PurchaseOrders from './pages/PurchaseOrders';
import Challans from './pages/Challans';
import Invoices from './pages/Invoices';
import CRM from './pages/CRM';
import Stock from './pages/Stock';

function AppLayout() {
  const { user } = useAuth();
  const location = useLocation();

  const isLogin = location.pathname === '/login';

  if (!user && !isLogin) return <Navigate to="/login" replace />;
  if (user && isLogin)   return <Navigate to="/"      replace />;

  if (isLogin) return <Login />;

  return (
    <div className="layout">
      <Sidebar />
      <div className="main-area">
        <Routes>
          <Route path="/"                element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/customers"       element={<ProtectedRoute requiredModule="customers"><Customers /></ProtectedRoute>} />
          <Route path="/customers/:id"   element={<ProtectedRoute requiredModule="customers"><CustomerDetail /></ProtectedRoute>} />
          <Route path="/products"        element={<ProtectedRoute requiredModule="products"><Products /></ProtectedRoute>} />
          <Route path="/suppliers"       element={<ProtectedRoute><Suppliers /></ProtectedRoute>} />
          <Route path="/purchase-orders" element={<ProtectedRoute requiredModule="purchase-orders"><PurchaseOrders /></ProtectedRoute>} />
          <Route path="/challans"        element={<ProtectedRoute requiredModule="challans"><Challans /></ProtectedRoute>} />
          <Route path="/invoices"        element={<ProtectedRoute requiredModule="invoices"><Invoices /></ProtectedRoute>} />
          <Route path="/crm"             element={<ProtectedRoute requiredModule="crm"><CRM /></ProtectedRoute>} />
          <Route path="/stock"           element={<ProtectedRoute requiredModule="stock"><Stock /></ProtectedRoute>} />
          <Route path="*"                element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" toastOptions={{
          style: { background: '#181c28', color: '#f0f2f8', border: '1px solid #252a3a', borderRadius: '10px' }
        }} />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/*"     element={<AppLayoutWrapper />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

function AppLayoutWrapper() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return (
    <div className="layout">
      <Sidebar />
      <div className="main-area">
        <Routes>
          <Route path="/"                element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/customers"       element={<ProtectedRoute requiredModule="customers"><Customers /></ProtectedRoute>} />
          <Route path="/customers/:id"   element={<ProtectedRoute requiredModule="customers"><CustomerDetail /></ProtectedRoute>} />
          <Route path="/products"        element={<ProtectedRoute requiredModule="products"><Products /></ProtectedRoute>} />
          <Route path="/suppliers"       element={<ProtectedRoute><Suppliers /></ProtectedRoute>} />
          <Route path="/purchase-orders" element={<ProtectedRoute requiredModule="purchase-orders"><PurchaseOrders /></ProtectedRoute>} />
          <Route path="/challans"        element={<ProtectedRoute requiredModule="challans"><Challans /></ProtectedRoute>} />
          <Route path="/invoices"        element={<ProtectedRoute requiredModule="invoices"><Invoices /></ProtectedRoute>} />
          <Route path="/crm"             element={<ProtectedRoute requiredModule="crm"><CRM /></ProtectedRoute>} />
          <Route path="/stock"           element={<ProtectedRoute requiredModule="stock"><Stock /></ProtectedRoute>} />
        </Routes>
      </div>
    </div>
  );
}
