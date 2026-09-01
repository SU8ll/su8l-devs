import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n';
import { useAuth } from '../AuthContext';
import { api, type StatusHistoryDto, type StatusSummaryDto } from '../api';
import { Spinner } from '../components/ui';
import UptimeChart from '../components/UptimeChart';
import MobileLayout, { MIcons } from './MobileLayout';

export default function StatusMobile(){
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const navigate=useNavigate();
  const isAr=lang==='ar';
  const [summary,setSummary]=useState<StatusSummaryDto|null>(null);
  const [history,setHistory]=useState<StatusHistoryDto|null>(null);
  const [probing,setProbing]=useState(false);

  const load=useCallback(async()=>{
    try{ const [s,h]=await Promise.all([api<StatusSummaryDto>('/api/status/summary'), api<StatusHistoryDto>('/api/status/history?days=30')]); setSummary(s); setHistory(h);}catch{}
  },[]);
  useEffect(()=>{ void load(); const timer=window.setInterval(()=>void load(),30000); return()=>window.clearInterval(timer); },[load]);
  const probe=async()=>{ setProbing(true); try{ const s=await api<StatusSummaryDto>('/api/status/live'); setSummary(s); const h=await api<StatusHistoryDto>('/api/status/history?days=30'); setHistory(h);}catch{} finally{ setProbing(false);} };

  const nav = user
    ? [
        {to:'/', label:t('nav.home'), icon:MIcons.home, end:true},
        {to:'/pricing', label:t('nav.pricing'), icon:MIcons.pricing},
        {to:'/status', label:t('nav.status'), icon:MIcons.status},
        {to:'/dashboard', label:t('nav.dashboard'), icon:MIcons.overview},
        {to:'/terms', label:t('nav.terms'), icon:MIcons.terms},
      ]
    : [
        {to:'/', label:t('nav.home'), icon:MIcons.home, end:true},
        {to:'/pricing', label:t('nav.pricing'), icon:MIcons.pricing},
        {to:'/status', label:t('nav.status'), icon:MIcons.status},
        {to:'/terms', label:t('nav.terms'), icon:MIcons.terms},
        {to:'/login', label:isAr?'دخول':'Login', icon:MIcons.login},
      ];

  if(!summary) return <MobileLayout title={t('status.title')} subtitle={t('status.subtitle')} items={nav} onHome={()=>navigate('/')}><div className="flex justify-center py-20"><Spinner size={28}/></div></MobileLayout>;

  const maintenance = summary.maintenance_mode===1;
  const up=summary.current?.up;
  const ping=summary.current?.latencyMs;

  return (
    <MobileLayout title={t('status.title')} subtitle={t('status.subtitle')} items={nav} onHome={()=>navigate('/')}>
      {maintenance && (
        <div className="m-card" style={{borderColor:'rgba(245,158,11,0.22)', background:'rgba(245,158,11,0.06)', textAlign:'center', padding:18}}>
          <div style={{fontWeight:800, color:'#FBBF24'}}>🔧 {t('status.maintenance')}</div>
          {summary.maintenance_message && <div style={{marginTop:6, fontSize:13, color:'#FDE68A'}}>{summary.maintenance_message}</div>}
        </div>
      )}

      <div className="m-card" style={{padding:18}}>
        <div style={{display:'flex', alignItems:'center', gap:10}}>
          <span style={{width:10, height:10, borderRadius:999, background: maintenance? '#EF4444' : up? '#10B981':'#EF4444', boxShadow: up? '0 0 10px rgba(16,185,129,0.5)':undefined}}/>
          <div style={{flex:1}}>
            <div style={{fontSize:15, fontWeight:800, color:'#F5F5F7'}}>{maintenance? t('status.underMaintenance') : up===undefined?'…': up? t('status.operational') : summary.configured? t('status.down'): t('status.notConfigured')}</div>
            {!maintenance && <div style={{fontSize:12, color:'#6B6A78', marginTop:2}}>{t('dash.livePing')}: {ping!=null? `${ping}ms`:'—'} · {summary.current? new Date(summary.current.at).toLocaleTimeString(): '—'}</div>}
          </div>
          {!maintenance && <button type="button" onClick={probe} disabled={probing} style={{padding:'8px 12px', borderRadius:11, border:'1px solid rgba(255,255,255,0.08)', background:'rgba(255,255,255,0.04)', color:'#D1D1D6', fontWeight:600, fontSize:12}}> {probing?'…':'⟳'} {t('status.checkNow')}</button>}
        </div>
        {!maintenance && (
          <>
            <div className="m-stats" style={{marginTop:16, gridTemplateColumns:'repeat(3,1fr)'}}>
              <div className="m-stat" style={{padding:'12px 6px'}}><div style={{fontSize:18, fontWeight:850, color:'#F5F5F7'}}>{summary.uptime24h}%</div><div style={{fontSize:10, letterSpacing:'0.08em', textTransform:'uppercase', color:'#6B6A78', marginTop:4}}>{t('status.uptime24')}</div></div>
              <div className="m-stat" style={{padding:'12px 6px'}}><div style={{fontSize:18, fontWeight:850, color:'#F5F5F7'}}>{summary.uptime7d}%</div><div style={{fontSize:10, letterSpacing:'0.08em', textTransform:'uppercase', color:'#6B6A78', marginTop:4}}>{t('status.uptime7')}</div></div>
              <div className="m-stat" style={{padding:'12px 6px'}}><div style={{fontSize:18, fontWeight:850, color:'#F5F5F7'}}>{summary.uptime30d}%</div><div style={{fontSize:10, letterSpacing:'0.08em', textTransform:'uppercase', color:'#6B6A78', marginTop:4}}>{t('status.uptime30')}</div></div>
            </div>
            <div style={{marginTop:10, fontSize:11, color:'#6B6A78', display:'flex', gap:6, flexWrap:'wrap'}}>
              <span style={{padding:'5px 9px', borderRadius:999, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.06)'}}>{t('status.target')}: {summary.target || t('status.notSet')}</span>
            </div>
          </>
        )}
      </div>

      {!maintenance && (
        <div className="m-card" style={{marginTop:14, padding:18}}>
          <div style={{fontSize:14, fontWeight:750, color:'#F5F5F7'}}>{t('status.history')}</div>
          {history ? <div style={{marginTop:12}}><UptimeChart history={history.history}/></div> : <div className="flex justify-center py-10"><Spinner size={22}/></div>}
        </div>
      )}
    </MobileLayout>
  );
}
