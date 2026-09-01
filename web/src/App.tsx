import { useEffect, useState } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation, useOutletContext } from 'react-router-dom';
import Background from './components/Background';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import { useAuth } from './AuthContext';
import { Spinner } from './components/ui';
import Landing from './pages/Landing';
import LandingMobile from './mobile/LandingMobile';
import Pricing from './pages/Pricing';
import PricingMobile from './mobile/PricingMobile';
import StatusPage from './pages/StatusPage';
import StatusMobile from './mobile/StatusMobile';
import Login from './pages/Login';
import Register from './pages/Register';
import { LoginMobile, RegisterMobile } from './mobile/AuthMobile';
import { TermsMobile, RefundMobile } from './mobile/TermsMobile';
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
import OverviewMobile from './mobile/OverviewMobile';
import CloudConfigurator from './pages/dashboard/CloudConfigurator';
import CloudMobile from './mobile/CloudMobile';
import DashboardStatus from './pages/dashboard/DashboardStatus';
import Tickets from './pages/dashboard/Tickets';
import TicketsMobile from './mobile/TicketsMobile';
import TicketDetail from './pages/dashboard/TicketDetail';
import TicketDetailMobile from './mobile/TicketDetailMobile';
import Referral from './pages/dashboard/Referral';
import ReferralMobile from './mobile/ReferralMobile';
import Chat from './pages/dashboard/Chat';
import { useTicketNotifications } from './pages/dashboard/useTicketNotifications';
import { useIsMobile } from './hooks/useIsMobile';
import { api, type StatusHistoryDto, type StatusSummaryDto } from './api';
import { useI18n } from './i18n';
import UptimeChart from './components/UptimeChart';

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
function RefCapture(){
  const { search } = useLocation();
  useEffect(()=>{
    // The referral code now only ever lives in the CURRENT url (?ref=CODE).
    // We never persist it to localStorage: a persisted copy leaks from older
    // accounts/sessions and wrongly marks new accounts as invited.
    try{ localStorage.removeItem('su8l_ref'); }catch{}
  },[search]);
  return null;
}

function OverviewSwitch() {
  const isMobile = useIsMobile();
  const ctx = useOutletContext<{ openAvatarPicker: () => void }>();
  if (isMobile) return <OverviewMobile openAvatarPicker={ctx?.openAvatarPicker} />;
  return <DashboardOverview />;
}

function HomeRoute() {
  const isMobile = useIsMobile();
  if (isMobile) return <LandingMobile />;
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 pt-24">
        <Landing />
      </main>
      <Footer />
    </div>
  );
}
function PricingSwitch(){ const isMobile=useIsMobile(); if(isMobile) return <PricingMobile/>; return (<div className="flex min-h-screen flex-col"><Navbar/><main className="flex-1 pt-24"><Pricing/></main><Footer/></div>); }
function StatusSwitch(){ const isMobile=useIsMobile(); if(isMobile) return <StatusMobile/>; return (<div className="flex min-h-screen flex-col"><Navbar/><main className="flex-1 pt-24"><StatusPage/></main><Footer/></div>); }
function LoginSwitch(){ const isMobile=useIsMobile(); if(isMobile) return <LoginMobile/>; return (<div className="flex min-h-screen flex-col"><Navbar/><main className="flex-1 pt-24"><Login/></main><Footer/></div>); }
function RegisterSwitch(){ const isMobile=useIsMobile(); if(isMobile) return <RegisterMobile/>; return (<div className="flex min-h-screen flex-col"><Navbar/><main className="flex-1 pt-24"><Register/></main><Footer/></div>); }
function TermsSwitch(){ const isMobile=useIsMobile(); if(isMobile) return <TermsMobile/>; return (<div className="flex min-h-screen flex-col"><Navbar/><main className="flex-1 pt-24"><Terms/></main><Footer/></div>); }
function RefundSwitch(){ const isMobile=useIsMobile(); if(isMobile) return <RefundMobile/>; return (<div className="flex min-h-screen flex-col"><Navbar/><main className="flex-1 pt-24"><Refund/></main><Footer/></div>); }

function CloudSwitch(){ const isMobile=useIsMobile(); if(isMobile) return <CloudMobile/>; return <CloudConfigurator/>; }
function TicketsSwitch(){ const isMobile=useIsMobile(); if(isMobile) return <TicketsMobile/>; return <Tickets/>; }
function TicketDetailSwitch(){ const isMobile=useIsMobile(); if(isMobile) return <TicketDetailMobile/>; return <TicketDetail/>; }
function ReferralSwitch(){ const isMobile=useIsMobile(); if(isMobile) return <ReferralMobile/>; return <Referral/>; }
function StatusDashSwitch(){ const isMobile=useIsMobile(); if(isMobile) return <DashboardStatusMobile />; return <DashboardStatus/>; }

function DashboardStatusMobile(){
  const { t } = useI18n();
  const [summary,setSummary]=useState<StatusSummaryDto|null>(null);
  const [history,setHistory]=useState<StatusHistoryDto|null>(null);
  const load=async()=>{ try{ const [s,h]=await Promise.all([api<StatusSummaryDto>('/api/status/summary'), api<StatusHistoryDto>('/api/status/history?days=30')]); setSummary(s); setHistory(h);}catch{} };
  useEffect(()=>{ void load(); },[]);
  if(!summary) return <div className="flex justify-center py-16"><Spinner size={26}/></div>;
  const up=summary.current?.up;
  return (
    <div style={{display:'flex', flexDirection:'column', gap:12}}>
      <div className="m-card" style={{padding:16, display:'flex', alignItems:'center', gap:10}}>
        <span style={{width:8,height:8,borderRadius:999, background: up? '#10B981':'#EF4444'}}/>
        <span style={{fontWeight:700, color:'#F5F5F7'}}>{up? t('status.operational'): t('status.degraded')}</span>
        <span style={{marginLeft:'auto', fontSize:11, color:'#6B6A78'}}>{summary.uptime24h}% 24h</span>
      </div>
      <div className="m-card" style={{padding:16}}>
        <div style={{fontWeight:700, color:'#F5F5F7', marginBottom:10}}>{t('status.history')}</div>
        {history? <UptimeChart history={history.history}/> : <Spinner size={22}/>}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <RefCapture />
      <Background />
      <NotificationBridge />
      <Routes>
        <Route path="/" element={<HomeRoute />} />
        <Route path="/pricing" element={<PricingSwitch />} />
        <Route path="/status" element={<StatusSwitch />} />
        <Route path="/login" element={<LoginSwitch />} />
        <Route path="/register" element={<RegisterSwitch />} />
        <Route path="/terms" element={<TermsSwitch />} />
        <Route path="/refund" element={<RefundSwitch />} />

        <Route element={<PublicLayout />}>
          <Route path="/auth/callback" element={<AuthCallback />} />
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
          <Route index element={<OverviewSwitch />} />
          <Route path="bot" element={<CloudSwitch />} />
          <Route path="status" element={<StatusDashSwitch />} />
          <Route path="tickets" element={<TicketsSwitch />} />
          <Route path="tickets/:id" element={<TicketDetailSwitch />} />
          <Route path="referral" element={<ReferralSwitch />} />
          <Route path="chat" element={<Chat />} />
        </Route>
      </Routes>
    </>
  );
}
