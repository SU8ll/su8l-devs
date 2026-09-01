import { useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n';
import { useAuth } from '../AuthContext';
import MobileLayout, { MIcons } from './MobileLayout';

const SECTIONS_T = ['s1','s2','s3','s4','s5','s6','s7'];
const SECTIONS_R = ['s1','s2','s3','s4','s5'];

export function TermsMobile(){
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const navigate=useNavigate();
  const isAr=lang==='ar';
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
  return (
    <MobileLayout title={t('terms.title')} subtitle={t('terms.intro').slice(0,48)+'…'} items={nav} onHome={()=>navigate('/')}>
      <div style={{textAlign:'center', padding:'8px 0 14px'}}>
        <div style={{fontSize:22, fontWeight:850, letterSpacing:'-0.02em', color:'#F5F5F7'}}>{t('terms.title')}</div>
      </div>
      <div className="m-card" style={{padding:18}}>
        <div style={{fontSize:13, lineHeight:1.6, color:'#9A99A6'}}>{t('terms.intro')}</div>
        <div style={{marginTop:18, display:'flex', flexDirection:'column', gap:18}}>
          {SECTIONS_T.map(s=>(
            <section key={s}>
              <div style={{fontSize:14, fontWeight:800, color:'#A78BFA'}}>{t(`terms.${s}t`)}</div>
              <div style={{marginTop:6, fontSize:13, lineHeight:1.6, color:'#D1D1D6'}}>{t(`terms.${s}d`)}</div>
            </section>
          ))}
        </div>
        <div style={{marginTop:18, paddingTop:14, borderTop:'1px solid rgba(255,255,255,0.06)', fontSize:11, color:'#6B6A78'}}>{t('terms.foot')}: {new Date().toLocaleDateString()} · su8ldevs.eu.cc</div>
      </div>
    </MobileLayout>
  );
}

export function RefundMobile(){
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const navigate=useNavigate();
  const isAr=lang==='ar';
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
  return (
    <MobileLayout title={t('refund.title')} subtitle={t('refund.intro').slice(0,48)+'…'} items={nav} onHome={()=>navigate('/')}>
      <div style={{textAlign:'center', padding:'8px 0 14px'}}>
        <div style={{fontSize:22, fontWeight:850, letterSpacing:'-0.02em', color:'#F5F5F7'}}>{t('refund.title')}</div>
      </div>
      <div className="m-card" style={{padding:18}}>
        <div style={{fontSize:13, lineHeight:1.6, color:'#9A99A6'}}>{t('refund.intro')}</div>
        <div style={{marginTop:18, display:'flex', flexDirection:'column', gap:18}}>
          {SECTIONS_R.map(s=>(
            <section key={s}>
              <div style={{fontSize:14, fontWeight:800, color:'#A78BFA'}}>{t(`refund.${s}t`)}</div>
              <div style={{marginTop:6, fontSize:13, lineHeight:1.6, color:'#D1D1D6'}}>{t(`refund.${s}d`)}</div>
            </section>
          ))}
        </div>
        <div style={{marginTop:16, padding:12, borderRadius:12, border:'1px solid rgba(239,68,68,0.18)', background:'rgba(239,68,68,0.06)', color:'#F87171', fontSize:13}}>⚠ {t('refund.s1d')}</div>
        <div style={{marginTop:12, paddingTop:12, borderTop:'1px solid rgba(255,255,255,0.06)', fontSize:11, color:'#6B6A78'}}>{t('refund.foot')}</div>
      </div>
    </MobileLayout>
  );
}
