import { useEffect } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import Background from './components/Background';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import { useAuth } from './AuthContext';
import { Spinner } from './components/ui';
import Landing from './pages/Landing';
import Pricing from './pages/Pricing';
import StatusPage from './pages/StatusPage';
import Login from './pages/Login';
import Register from './pages/Register';
import AuthCallback from './pages/AuthCallback';
import Checkout from './pages/Checkout';
import CheckoutReturn from './pages/CheckoutReturn';
import Success from './pages/Success';
import Terms from './pages/Terms';
import Refund from './pages/Refund';
import NotFound from './pages/NotFound';
import CheckoutCancel from './pages/CheckoutCancel';
import DashboardLayout from './pages/dashboard/DashboardLayout';
import DashboardOverview from './pages/dashboard/Overview';
import CloudConfigurator from './pages/dashboard/CloudConfigurator';
import DashboardStatus from './pages/dashboard/DashboardStatus';
import Tickets from './pages/dashboard/Tickets';
import TicketDetail from './pages/dashboard/TicketDetail';
import Referral from './pages/dashboard/Referral';
import Chat from './pages/dashboard/Chat';
import { useTicketNotifications } from './pages/dashboard/useTicketNotifications';

function NotificationBridge() {
  const { user } = useAuth();
  useTicketNotifications(Boolean(user));
  return null;
}

function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 pt-24">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

function Protected({ children }: { children: React.ReactElement }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size={36} />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  return children;
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Background />
      <NotificationBridge />
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Landing />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/status" element={<StatusPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/refund" element={<Refund />} />
          <Route path="*" element={<NotFound />} />
        </Route>

        <Route path="/checkout" element={<Protected><Checkout /></Protected>} />
        <Route path="/checkout/return" element={<Protected><CheckoutReturn /></Protected>} />
        <Route path="/success" element={<Success />} />
        <Route path="/checkout/cancel" element={<CheckoutCancel />} />

        <Route
          path="/dashboard"
          element={
            <Protected>
              <DashboardLayout />
            </Protected>
          }
        >
          <Route index element={<DashboardOverview />} />
          <Route path="bot" element={<CloudConfigurator />} />
          <Route path="status" element={<DashboardStatus />} />
          <Route path="tickets" element={<Tickets />} />
          <Route path="tickets/:id" element={<TicketDetail />} />
          <Route path="referral" element={<Referral />} />
          <Route path="chat" element={<Chat />} />
        </Route>
      </Routes>
    </>
  );
}
