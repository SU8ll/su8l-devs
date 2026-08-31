import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n';
import { useAuth } from '../AuthContext';
import { api, type DashboardDto, type PlanDto, type PlansResponse } from '../api';
import { Spinner } from '../components/ui';
import { productImage } from '../productImages';
import MobileLayout, { MIcons } from './MobileLayout';

type Cycle = 'monthly' | 'yearly';
interface ProductDto {
  key: string; name: string; nameAr: string; tagline: string; taglineAr: string; price: number; icon: string; features: string[]; featuresAr: string[]; hasHostingChoice?: boolean; comingSoon?: boolean;
}

export default function PricingMobile() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAr = lang==='ar';
  const [plans,setPlans]=useState<PlanDto[]|null>(null);
  const [products,setProducts]=useState<ProductDto[]|null>(null);
  const [dashboard,setDashboard]=useState<DashboardDto|null>(null);
  const [cycle,setCycle]=useState<Cycle>('monthly');
  const [hostingModal,setHostingModal]=useState<ProductDto|null>(null);

  useEffect(()=>{ api<PlansResponse>('/api/plans').then(r=>setPlans(r.plans)).catch(()=>{}); api<ProductDto[]>('/api/plans/products').then(setProducts).catch(()=>{}); },[]);
  useEffect(()=>{ if(user) api<DashboardDto>('/api/dashboard').then(setDashboard).catch(()=>{}); },[user]);

  const activeKeys = new Set((dashboard?.subscriptions??[]).filter(s=>s.status==='active').map(s=>s.planKey));
  const nav = [
    {to:'/', label:t('nav.home'), icon:MIcons.home, end:true},
    {to:'/pricing', label:t('nav.pricing'), icon:MIcons.pricing},
    {to:'/status', label:t('nav.status'), icon:MIcons.status},
    {to:'/terms', label:t('nav.terms'), icon:MIcons.terms},
    {to:'/login', label:isAr?'دخول':'Login', icon:MIcons.login},
  ];

  if(!plans) return <MobileLayout title={t('nav.pricing')} subtitle={t('pricing.subtitle')} items={nav} onHome={()=>navigate('/')}><div className="flex justify-center py-20"><Spinner size={28}/></div></MobileLayout>;

  return (
    <MobileLayout title={t('pricing.title')} subtitle={t('pricing.subtitle')} items={nav} onHome={()=>navigate('/')}>
      {/* Cycle */}
      <div style={{display:'flex', justifyContent:'center', margin:'6px 0 18px'}}>
        <div style={{display:'inline-flex', gap:2, padding:3, borderRadius:999, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.08)'}}>
          {(['monthly','yearly'] as const).map(c=>(
            <button key={c} type="button" onClick={()=>setCycle(c)} style={{padding:'8px 18px', borderRadius:999, fontSize:13, fontWeight:700, border:'none', background: cycle===c ? '#7C3AED' : 'transparent', color: cycle===c ? '#fff':'#9A99A6'}}>{t(`pricing.${c}`)}</button>
          ))}
        </div>
      </div>

      {/* Plans */}
      <div style={{display:'flex', flexDirection:'column', gap:14}}>
        {plans.map(p=>{
          const price = cycle==='monthly'? p.monthly : p.yearly;
          const per = cycle==='monthly'? t('pricing.perMonth') : t('pricing.perYear');
          const isElite = p.isHighestTier;
          const active = activeKeys.has(p.key);
          return (
            <div key={p.key} className="m-card" style={{padding:20, borderColor: isElite ? 'rgba(124,58,237,0.22)' : undefined, background: isElite ? 'rgba(124,58,237,0.05)' : undefined}}>
              {p.badge && <div style={{display:'inline-flex', fontSize:10, fontWeight:800, letterSpacing:'0.08em', textTransform:'uppercase', padding:'4px 8px', borderRadius:999, background: isElite? 'rgba(124,58,237,0.14)': 'rgba(16,185,129,0.12)', color: isElite? '#A78BFA':'#6EE7B7', border:`1px solid ${isElite?'rgba(124,58,237,0.22)':'rgba(16,185,129,0.18)'}`}}>{isElite? t('pricing.badge.top') : t('pricing.badge.popular')}</div>}
              <div style={{marginTop:10, fontSize:18, fontWeight:800, letterSpacing:'-0.02em', color:'#F5F5F7'}}>{t(`plan.${p.key}.name`)||p.name}</div>
              <div style={{marginTop:4, fontSize:13, color:'#9A99A6', lineHeight:1.4}}>{t(`plan.${p.key}.tagline`)||p.tagline}</div>
              <div style={{marginTop:14, display:'flex', alignItems:'baseline', gap:6}}>
                <span style={{fontSize:32, fontWeight:900, letterSpacing:'-0.03em', color:'#F5F5F7'}}>${price}</span>
                <span style={{fontSize:12, color:'#6B6A78'}}>{per}</span>
              </div>
              {cycle==='yearly' && <div style={{marginTop:6, display:'flex', alignItems:'center', gap:8, fontSize:12}}><span style={{textDecoration:'line-through', color:'#6B6A78'}}>${p.monthly*12}</span><span style={{padding:'3px 7px', borderRadius:999, background:'rgba(16,185,129,0.12)', color:'#6EE7B7', fontWeight:700, fontSize:11}}>{t('pricing.save')}</span></div>}
              <ul style={{marginTop:16, display:'flex', flexDirection:'column', gap:10, listStyle:'none', padding:0}}>
                {p.features.map((f,i)=>(
                  <li key={f} style={{display:'flex', gap:8, fontSize:13, lineHeight:1.4, color:'#D1D1D6'}}>
                    <span style={{width:18, height:18, borderRadius:999, background:'rgba(124,58,237,0.13)', border:'1px solid rgba(124,58,237,0.16)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:1}}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" strokeWidth="2.8" strokeLinecap="round"><path d="M5 13l4 4L19 7"/></svg>
                    </span>
                    <span>{t(`plan.${p.key}.f${i+1}`)||f}</span>
                  </li>
                ))}
              </ul>
              <div style={{marginTop:18}}>
                {active ? <div style={{textAlign:'center', padding:'12px', borderRadius:12, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)', color:'#9A99A6', fontWeight:600, fontSize:13}}>{t('pricing.current')}</div>
                : <button type="button" className="m-btn m-btn-primary" style={{width:'100%'}} onClick={()=>{
                    if(!user){ navigate('/login', {state:{from:`/checkout?plan=${p.key}&cycle=${cycle}`}}); return; }
                    navigate(`/checkout?plan=${p.key}&cycle=${cycle}`);
                  }}>{t('pricing.buy')}</button>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Products */}
      {products && products.length>0 && (
        <div style={{marginTop:26}}>
          <div style={{textAlign:'center', marginBottom:14}}>
            <div style={{fontSize:11, fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:'#6B6A78'}}>{isAr?'منتجات أخرى':'Other products'}</div>
            <div style={{marginTop:6, fontSize:13, color:'#9A99A6'}}>{isAr?'أدوات احترافية — جاهزة للعمل':'Professional tools — ready to deploy'}</div>
          </div>
          <div style={{display:'flex', flexDirection:'column', gap:12}}>
            {products.map(prod=>(
              <div key={prod.key} className="m-card" style={{padding:18}}>
                <div style={{display:'flex', gap:12, alignItems:'center'}}>
                  <div style={{width:52,height:52,borderRadius:14, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', flexShrink:0}}>
                    {productImage(prod.key)? <img src={productImage(prod.key)!} alt="" style={{width:40,height:40, objectFit:'contain'}}/> : <span style={{fontSize:22}}>{prod.icon}</span>}
                  </div>
                  <div style={{minWidth:0}}>
                    <div style={{fontSize:15, fontWeight:750, color:'#F5F5F7'}}>{isAr? prod.nameAr : prod.name}</div>
                    <div style={{fontSize:12.5, color:'#9A99A6', lineHeight:1.4, marginTop:2}}>{isAr? prod.taglineAr : prod.tagline}</div>
                  </div>
                </div>
                <div style={{marginTop:12, display:'flex', alignItems:'baseline', gap:6}}>
                  <span style={{fontSize:22, fontWeight:850, color:'#F5F5F7'}}>${prod.price}</span>
                  <span style={{fontSize:11, color:'#6B6A78'}}>{isAr?'دفعة واحدة':'one-time'}</span>
                </div>
                <ul style={{marginTop:12, display:'flex', flexDirection:'column', gap:7, listStyle:'none', padding:0}}>
                  {(isAr? prod.featuresAr: prod.features).map(f=>(
                    <li key={f} style={{display:'flex', gap:7, fontSize:12.5, color:'#B8B7C2'}}><span style={{color:'#A78BFA', marginTop:2}}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6"><path d="M5 13l4 4L19 7"/></svg></span>{f}</li>
                  ))}
                </ul>
                <div style={{marginTop:14}}>
                  {prod.comingSoon? <div style={{textAlign:'center', padding:'11px', borderRadius:12, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', color:'#6B6A78', fontWeight:600}}>{isAr?'قيد التطوير':'Coming soon'}</div>
                  : <button type="button" className="m-btn m-btn-primary" style={{width:'100%', minHeight:44}} onClick={()=>{
                      if(prod.hasHostingChoice){ setHostingModal(prod); return; }
                      if(!user){ navigate('/login', {state:{from:`/checkout?plan=${prod.key}&cycle=monthly`}}); return; }
                      navigate(`/checkout?plan=${prod.key}&cycle=monthly`);
                    }}>{isAr?'شراء':'Buy now'}</button>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {hostingModal && (
        <div onClick={()=>setHostingModal(null)} style={{position:'fixed', inset:0, zIndex:80, background:'rgba(0,0,0,0.62)', backdropFilter:'blur(10px)', display:'flex', alignItems:'flex-end', padding:16}}>
          <div onClick={e=>e.stopPropagation()} className="m-card" style={{width:'100%', padding:20, borderRadius:20, maxWidth:520, margin:'0 auto'}}>
            <div style={{width:36,height:4,borderRadius:999,background:'rgba(255,255,255,0.14)', margin:'0 auto 14px'}}/>
            <div style={{textAlign:'center', fontWeight:800, color:'#F5F5F7'}}>{isAr? hostingModal.nameAr : hostingModal.name}</div>
            <div style={{textAlign:'center', fontSize:12.5, color:'#9A99A6', marginTop:4}}>{isAr?'اختر نوع الاستضافة':'Choose hosting type'}</div>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginTop:16}}>
              <button type="button" onClick={()=>{ setHostingModal(null); if(!user){ navigate('/login', {state:{from:`/checkout?plan=${hostingModal.key}&cycle=monthly`}}); return;} navigate(`/checkout?plan=${hostingModal.key}&cycle=monthly`); }} style={{padding:16, borderRadius:14, border:'1px solid rgba(16,185,129,0.18)', background:'rgba(16,185,129,0.06)', textAlign:'center'}}>
                <div style={{fontSize:22}}>🏠</div><div style={{marginTop:6, fontWeight:700, color:'#6EE7B7', fontSize:13}}>{isAr?'محلي':'Local'}</div><div style={{fontSize:11, color:'#9A99A6', marginTop:2}}>{isAr?'مجاني':'Free'}</div><div style={{marginTop:8, fontSize:13, fontWeight:800, color:'#10B981'}}>$0</div>
              </button>
              <button type="button" onClick={()=>{ setHostingModal(null); if(!user){ navigate('/login', {state:{from:`/checkout?plan=${hostingModal.key}&cycle=monthly&cloud=1`}}); return;} navigate(`/checkout?plan=${hostingModal.key}&cycle=monthly&cloud=1`); }} style={{padding:16, borderRadius:14, border:'1px solid rgba(124,58,237,0.22)', background:'rgba(124,58,237,0.08)', textAlign:'center'}}>
                <div style={{fontSize:22}}>☁️</div><div style={{marginTop:6, fontWeight:700, color:'#A78BFA', fontSize:13}}>{isAr?'سحابي':'Cloud'}</div><div style={{fontSize:11, color:'#9A99A6', marginTop:2}}>24/7</div><div style={{marginTop:8, fontSize:13, fontWeight:800, color:'#A78BFA'}}>$8<span style={{fontSize:11, fontWeight:500, color:'#9A99A6'}}>/mo</span></div>
              </button>
            </div>
            <button type="button" onClick={()=>setHostingModal(null)} style={{width:'100%', marginTop:12, padding:12, borderRadius:12, border:'1px solid rgba(255,255,255,0.07)', background:'rgba(255,255,255,0.04)', color:'#9A99A6', fontWeight:600}}>{isAr?'إلغاء':'Cancel'}</button>
          </div>
        </div>
      )}

      <div style={{textAlign:'center', marginTop:20, fontSize:12, color:'#3F3E48'}}><Link to="/refund" style={{color:'#6B6A78', textDecoration:'none'}}>{t('nav.refund')}</Link> · <Link to="/terms" style={{color:'#6B6A78', textDecoration:'none'}}>{t('nav.terms')}</Link></div>
    </MobileLayout>
  );
}
