import React from 'react';
import {
  HashRouter as Router,
  Routes,
  Route,
  useLocation,
  Link,
  Navigate,
} from 'react-router-dom';

import Navbar from './customer/components/Navbar';
import Footer from './customer/components/Footer';
import OrderTrackingPopup from './customer/components/OrderTrackingPopup';

import Category from './customer/pages/Category';
import Menu from './customer/pages/Menu';
import Cart from './customer/pages/Cart';
import Payment from './customer/pages/Payment';
import Checkout from './customer/pages/Checkout';
import OrderTracking from './customer/pages/OrderTracking';
import Receipts from './customer/pages/Receipts';
import HelpSupport from './customer/pages/HelpSupport';
import TermsConditions from './customer/pages/TermsConditions';
import PrivacyPolicy from './customer/pages/PrivacyPolicy';

import AdminLogin from './admin/pages/AdminLogin';
import Dashboard from './admin/pages/Dashboard';
import SuperAdminDashboard from './superadmin/pages/SuperAdminDashboard';
import MenuManagement from './admin/pages/MenuManagement';
import Kitchen from './admin/pages/Kitchen';
import SalesAnalytics from './admin/pages/SalesAnalytics';
import Reports from './admin/pages/Reports';
import ProfileSettings from './admin/pages/ProfileSettings';
import AccountSettings from './admin/pages/AccountSettings';

import { CartProvider } from './context/CartContext';
import { AuthProvider, useAuth } from './context/AuthContext';

import WelcomePage from './customer/components/WelcomePage.jsx';

// =======================
// PROTECT ADMIN ROUTES (100% TS SAFE)
// =======================
type RequireAuthProps = {
  children: React.ReactNode;                // FIXED HERE
  allowedRoles?: ('admin' | 'superadmin')[];
};

const RequireAuth: React.FC<RequireAuthProps> = ({ children, allowedRoles }) => {
  const { user } = useAuth();

  if (!user) return <Navigate to="/admin-panel" replace />;

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/admin-panel" replace />;
  }

  return <>{children}</>;
};

// =======================
// MAIN APP
// =======================
function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <Router>
          <AppContent />
        </Router>
      </CartProvider>
    </AuthProvider>
  );
}

// =======================
// LAYOUT + ROUTES
// =======================
function AppContent() {
  const location = useLocation();

  const isAdminRoute =
    location.pathname.startsWith('/admin') ||
    location.pathname.startsWith('/admin-panel');

  const isWelcomePage = location.pathname === '/';

  return (
    <div
      className="App"
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        width: '100%',
      }}
    >
      {/* CUSTOMER HEADER */}
      {!isAdminRoute && !isWelcomePage && <Navbar />}
      {!isAdminRoute && !isWelcomePage && <OrderTrackingPopup />}

      <main style={{ flex: '1 0 auto', width: '100%' }}>
        <Routes>
          {/* Welcome */}
          <Route path="/" element={<WelcomePage />} />

          {/* Customer Pages */}
          <Route path="/category" element={<Category />} />
          <Route path="/menu" element={<Menu />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/payment" element={<Payment />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/order-tracking" element={<OrderTracking />} />
          <Route path="/receipts" element={<Receipts />} />
          <Route path="/help-support" element={<HelpSupport />} />
          <Route path="/terms-conditions" element={<TermsConditions />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />

          {/* Admin Login */}
          <Route path="/admin-panel" element={<AdminLogin />} />
          <Route path="/admin" element={<Navigate to="/admin-panel" replace />} />

          {/* Admin Protected Routes */}
          <Route
            path="/admin/dashboard"
            element={
              <RequireAuth allowedRoles={['admin', 'superadmin']}>
                <Dashboard />
              </RequireAuth>
            }
          />

          <Route
            path="/admin/super-dashboard"
            element={
              <RequireAuth allowedRoles={['superadmin']}>
                <SuperAdminDashboard />
              </RequireAuth>
            }
          />

          <Route
            path="/admin/menu"
            element={
              <RequireAuth allowedRoles={['admin', 'superadmin']}>
                <MenuManagement />
              </RequireAuth>
            }
          />

          <Route
            path="/admin/kitchen"
            element={
              <RequireAuth allowedRoles={['admin', 'superadmin']}>
                <Kitchen />
              </RequireAuth>
            }
          />

          <Route
            path="/admin/analytics"
            element={
              <RequireAuth allowedRoles={['admin', 'superadmin']}>
                <SalesAnalytics />
              </RequireAuth>
            }
          />

          <Route
            path="/admin/reports"
            element={
              <RequireAuth allowedRoles={['admin', 'superadmin']}>
                <Reports />
              </RequireAuth>
            }
          />

          <Route
            path="/admin/profile"
            element={
              <RequireAuth allowedRoles={['admin', 'superadmin']}>
                <ProfileSettings />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/account"
            element={
              <RequireAuth allowedRoles={['admin', 'superadmin']}>
                <AccountSettings />
              </RequireAuth>
            }
          />

          {/* 404 PAGE */}
          <Route
            path="*"
            element={
              <div
                className="container py-5 text-center"
                style={{
                  minHeight: '100vh',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <h1 className="display-1 fw-bold text-muted">404</h1>
                <h2 className="mb-4">Page Not Found</h2>
                <p className="text-muted mb-4">
                  The page you're looking for doesn't exist.
                </p>
                <Link to="/" className="btn btn-primary">
                  Go to Home
                </Link>
              </div>
            }
          />
        </Routes>
      </main>

      {/* CUSTOMER FOOTER */}
      {!isAdminRoute && !isWelcomePage && <Footer />}
    </div>
  );
}

export default App;
