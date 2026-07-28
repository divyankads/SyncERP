import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import Products from './pages/Products';
import Suppliers from './pages/Suppliers';
import PurchaseOrders from './pages/PurchaseOrders';
import Challans from './pages/Challans';
import Invoices from './pages/Invoices';
import CRM from './pages/CRM';
import Stock from './pages/Stock';

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{
        style: { background: '#181c28', color: '#f0f2f8', border: '1px solid #252a3a', borderRadius: '10px' }
      }} />
      <div className="layout">
        <Sidebar />
        <div className="main-area">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/products" element={<Products />} />
            <Route path="/suppliers" element={<Suppliers />} />
            <Route path="/purchase-orders" element={<PurchaseOrders />} />
            <Route path="/challans" element={<Challans />} />
            <Route path="/invoices" element={<Invoices />} />
            <Route path="/crm" element={<CRM />} />
            <Route path="/stock" element={<Stock />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}
