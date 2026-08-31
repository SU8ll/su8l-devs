import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../i18n';
import { useAuth } from '../AuthContext';
import { api, type DashboardDto } from '../api';
import { Badge, Spinner, formatDate } from '../components/ui';

export default function OverviewMobile({ openAvatarPicker }: { openAvatarPicker?: () => void }) {
  const { t } = useI18n();
  const { user } = useAuth();
  const [data, setData] = useState<DashboardDto | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api<DashboardDto>('/api/dashboard').then(setData).catch(() => setError('Failed to load dashboard'));
  }, [user?.avatar]);

  if (error) return <div style={{color:'#F87171', fontSize:14, padding:24}}>{error}</div>;
  if (!data) return <div className="flex justify-center py-20"><Spinner size={28} /></div>;

  const statusUp = data.status.current?.up;
  const ping = data.status.current?.latencyMs;

  return (
    <div style={{display:'flex', flexDirection:'column', gap:18}}>
      {/* Profile — editorial */}
      <section className="m-card" style={{display:'flex', alignItems:'center', gap:14, padding:18}}>
        <button type="button" onClick={openAvatarPicker} style={{position:'relative', flexShrink:0, border:'none', background:'none', padding:0}}>
          {data.user.avatar ? (
            <img src={data.user.avatar} alt="" style={{width:56, height:56, borderRadius:14, objectFit:'cover', border:'1px solid rgba(255,255,255,0.08)', display:'block'}} />
          ) : (
            <div style={{width:56, height:56, borderRadius:14, display:'flex', alignItems:'center', justifyContent:'center', background:'linear-gradient(135deg,#7C3AED,#A78BFA)', color:'#fff', fontWeight:800, fontSize:18}}>{data.user.username[0]?.toUpperCase() ?? '?'}</div>
          )}
          <span style={{position:'absolute', right:-4, bottom:-4, width:20, height:20, borderRadius:999, background:'#111114', border:'1px solid rgba(255,255,255,0.08)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10}}>✎</span>
        </button>
        <div style={{minWidth:0, flex:1}}>
          <div style={{fontSize:17, fontWeight:750, letterSpacing:'-0.015em', color:'#F5F5F7', lineHeight:1.1, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{data.user.username}</div>
          <div style={{fontSize:12.5, color:'#9A99A6', marginTop:3, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{data.user.email}</div>
          <div style={{marginTop:8}}><Badge tone="green">✓ ACTIVE</Badge></div>
        </div>
      </section>

      {/* Stats — two metrics */}
      <section>
        <div className="m-section-title">At a glance</div>
        <div className="m-stats">
          <div className="m-stat">
            <div style={{fontSize:28, fontWeight:800, letterSpacing:'-0.03em', color:'#A78BFA', lineHeight:1}}>{data.activeSubscriptions}</div>
            <div style={{marginTop:6, fontSize:10.5, fontWeight:600, letterSpacing:'0.08em', textTransform:'uppercase', color:'#6B6A78'}}>Active plan</div>
          </div>
          <div className="m-stat">
            <div style={{fontSize:28, fontWeight:800, letterSpacing:'-0.03em', color: data.ownsExtraSlot ? '#A78BFA' : '#3F3E48', lineHeight:1}}>{data.ownsExtraSlot ? '+1' : '—'}</div>
            <div style={{marginTop:6, fontSize:10.5, fontWeight:600, letterSpacing:'0.08em', textTransform:'uppercase', color:'#6B6A78'}}>Extra slot</div>
          </div>
        </div>
      </section>

      {/* Active subscription — Elite */}
      <section>
        <div className="m-section-title">Active subscription</div>
        {data.subscriptions.length === 0 ? (
          <div className="m-card" style={{textAlign:'center', padding:'22px 16px'}}>
            <div style={{fontSize:22}}>◆</div>
            <div style={{marginTop:8, fontWeight:700, color:'#F5F5F7'}}>No active plan</div>
            <div style={{marginTop:4, fontSize:13, color:'#9A99A6'}}>{t('dash.noSubDesc')}</div>
            <Link to="/pricing" className="m-btn m-btn-primary" style={{width:'100%', marginTop:16}}>{t('dash.upgrade')}</Link>
          </div>
        ) : (
          <div style={{display:'flex', flexDirection:'column', gap:10}}>
            {data.subscriptions.map((s) => (
              <div key={s.id} className="m-card" style={{padding:16}}>
                <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', gap:12}}>
                  <div style={{fontSize:16, fontWeight:750, color:'#F5F5F7'}}>{s.planName}</div>
                  <Badge tone={s.active ? 'green' : s.status === 'expired' ? 'red' : 'slate'}>{s.active ? t('dash.statusActive') : s.status === 'expired' ? t('dash.statusExpired') : t('dash.statusCancelled')}</Badge>
                </div>
                <div style={{marginTop:14, display:'flex', flexDirection:'column', gap:10, borderTop:'1px solid rgba(255,255,255,0.06)', paddingTop:12}}>
                  <Row label={t('checkout.cycle')} value={t(`pricing.${s.cycle}`)} />
                  <Row label={t('checkout.amount')} value={`$${s.amount}`} />
                  <Row label={t('dash.expires')} value={formatDate(s.currentPeriodEnd)} mono />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Expand fleet */}
      {data.activeSubscriptions > 0 && (
        <section className="m-card" style={{padding:18}}>
          <div style={{fontSize:15, fontWeight:750, color:'#F5F5F7'}}>Expand your fleet</div>
          <div style={{marginTop:6, fontSize:13, lineHeight:1.5, color:'#9A99A6'}}>{t('dash.extraSlotDesc')}</div>
          <div style={{marginTop:12, display:'flex', alignItems:'center', gap:8}}>
            <span style={{fontSize:13, fontWeight:700, padding:'6px 10px', borderRadius:999, background:'rgba(124,58,237,0.13)', border:'1px solid rgba(124,58,237,0.18)', color:'#A78BFA'}}>$15</span>
            <span style={{fontSize:12, color:'#6B6A78'}}>one-time · permanent</span>
          </div>
          {data.ownsExtraSlot ? (
            <div style={{marginTop:14}}><Badge tone="green">{t('dash.extraSlotOwned')}</Badge></div>
          ) : (
            <Link to="/checkout?extra=1" className="m-btn m-btn-primary" style={{width:'100%', marginTop:16}}>{t('dash.extraSlotCta')}</Link>
          )}
        </section>
      )}

      {/* Status */}
      <section className="m-card" style={{padding:16}}>
        <div style={{display:'flex', alignItems:'center', gap:10}}>
          <span style={{width:8, height:8, borderRadius:999, background: statusUp ? '#10B981' : '#EF4444', boxShadow: statusUp ? '0 0 8px rgba(16,185,129,0.6)' : undefined, flexShrink:0}} />
          <div style={{flex:1, minWidth:0}}>
            <div style={{fontSize:14, fontWeight:700, color:'#F5F5F7'}}>{statusUp === undefined ? '…' : statusUp ? t('status.operational') : t('status.degraded')}</div>
            <div style={{fontSize:12, color:'#6B6A78', marginTop:2}}>{t('dash.livePing')}: {ping != null ? `${ping}ms` : '—'}</div>
          </div>
          <Link to="/dashboard/status" style={{fontSize:12.5, fontWeight:600, color:'#A78BFA', textDecoration:'none', whiteSpace:'nowrap'}}>Status →</Link>
        </div>
        <div className="m-stats" style={{marginTop:14}}>
          <div className="m-stat" style={{padding:'10px 8px'}}><div style={{fontSize:16, fontWeight:800, color:'#F5F5F7'}}>{data.status.uptime24h}%</div><div style={{fontSize:10, letterSpacing:'0.08em', textTransform:'uppercase', color:'#6B6A78', marginTop:4}}>{t('status.uptime24')}</div></div>
          <div className="m-stat" style={{padding:'10px 8px'}}><div style={{fontSize:16, fontWeight:800, color:'#F5F5F7'}}>{data.status.uptime7d}%</div><div style={{fontSize:10, letterSpacing:'0.08em', textTransform:'uppercase', color:'#6B6A78', marginTop:4}}>{t('status.uptime7')}</div></div>
        </div>
      </section>

      {/* Rewards */}
      <section className="m-card" style={{padding:18}}>
        <div style={{fontSize:15, fontWeight:750, color:'#F5F5F7'}}>{t('referral.headline')}</div>
        <div style={{marginTop:6, fontSize:13, lineHeight:1.5, color:'#9A99A6'}}>{t('referral.subtitle')}</div>
        <Link to="/dashboard/referral" className="m-btn m-btn-ghost" style={{width:'100%', marginTop:14}}>Friends &amp; Rewards</Link>
      </section>

      {/* Quick actions */}
      <section>
        <div className="m-section-title">Quick actions</div>
        <div style={{display:'flex', flexDirection:'column', gap:10}}>
          <Link to="/dashboard/bot" className="m-card" style={{display:'flex', alignItems:'center', gap:12, padding:'14px 16px', textDecoration:'none'}}>
            <span style={{width:36, height:36, borderRadius:11, background:'rgba(124,58,237,0.12)', border:'1px solid rgba(124,58,237,0.16)', display:'flex', alignItems:'center', justifyContent:'center', color:'#A78BFA', flexShrink:0}}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M12 2.8 4.2 7v10L12 21.2 19.8 17V7L12 2.8Z"/></svg></span>
            <span style={{flex:1, minWidth:0}}><span style={{display:'block', fontSize:14, fontWeight:700, color:'#F5F5F7'}}>{t('dash.manageBot')}</span><span style={{display:'block', fontSize:12.5, color:'#9A99A6'}}>{t('dash.botPanel')}</span></span>
            <span style={{color:'#6B6A78'}}>›</span>
          </Link>
          <Link to="/dashboard/tickets" className="m-card" style={{display:'flex', alignItems:'center', gap:12, padding:'14px 16px', textDecoration:'none'}}>
            <span style={{width:36, height:36, borderRadius:11, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)', display:'flex', alignItems:'center', justifyContent:'center', color:'#9A99A6', flexShrink:0}}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M6 7h12M6 11h12M6 15h12"/><rect x="3" y="4" width="18" height="16" rx="2.2"/></svg></span>
            <span style={{flex:1, minWidth:0}}><span style={{display:'block', fontSize:14, fontWeight:700, color:'#F5F5F7'}}>{t('dash.openTickets')}</span><span style={{display:'block', fontSize:12.5, color:'#9A99A6', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{t('tickets.subtitle')}</span></span>
            <span style={{color:'#6B6A78'}}>›</span>
          </Link>
        </div>
      </section>
      <div style={{textAlign:'center', fontSize:11, color:'#3F3E48', padding:'8px 0 4px'}}>{user?.username} · su8ldevs.eu.cc</div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', gap:12}}>
      <span style={{fontSize:13, color:'#9A99A6'}}>{label}</span>
      <span style={{fontSize:13.5, fontWeight:600, color:'#F5F5F7', fontFamily: mono ? 'ui-monospace, SFMono-Regular, Menlo, monospace' : undefined, textTransform: label.toLowerCase().includes('cycle') ? 'capitalize' : undefined}}>{value}</span>
    </div>
  );
}
