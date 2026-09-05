import { useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useI18n } from '../i18n';
import { useAuth } from '../AuthContext';
import { api, apiUrl } from '../api';
import MobileLayout, { MIcons } from './MobileLayout';

export function LoginMobile(){
  const { t } = useI18n();
  const { user } = useAuth();
  const location=useLocation();
  const navigate=useNavigate();
  const params=new URLSearchParams(location.search);
  const error=params.get('error');
  const registered=params.get('registered');
  const from=(location.state as {from?:string}|null)?.from;
  const [mode,setMode]=useState<'email'|'oauth'>('email');
  const [identifier,setIdentifier]=useState('');
  const [password,setPassword]=useState('');
  const [loading,setLoading]=useState(false);
  const [formError,setFormError]=useState('');
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
        {to:'/login', label:t('nav.login'), icon:MIcons.login},
      ];
  const handleEmailLogin=async(e:React.FormEvent)=>{
    e.preventDefault(); setFormError(''); setLoading(true);
    try{
      const data=await api<{ok:boolean; token:string}>('/api/auth/login',{method:'POST', body:{identifier,password}});
      if(data.ok && data.token){ localStorage.setItem('su8l_token', data.token); window.location.href='/dashboard'; }
    }catch(err:unknown){
      const apiErr=err as {detail?:{error?:string}; message?:string};
      setFormError(apiErr?.detail?.error || apiErr?.message || t('login.error.generic'));
    }finally{ setLoading(false); }
  };
  return (
    <MobileLayout title={t('login.title')} subtitle={t('login.subtitle')} items={nav} onHome={()=>navigate('/')}>
      <div style={{maxWidth:420, margin:'0 auto', width:'100%'}}>
        <div className="m-card" style={{padding:20}}>
          <div style={{textAlign:'center'}}>
            <div style={{width:48,height:48,borderRadius:14, background:'#1A1A22', border:'1px solid rgba(255,255,255,0.08)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto', fontWeight:900, color:'#fff'}}>SU</div>
            <div style={{marginTop:10, fontSize:18, fontWeight:800, color:'#F5F5F7'}}>{t('login.title')}</div>
            <div style={{marginTop:4, fontSize:13, color:'#9A99A6'}}>{t('login.subtitle')}</div>
          </div>

          {(error || registered) && (
            <div style={{marginTop:14, padding:'10px 12px', borderRadius:12, border:`1px solid ${error?'rgba(239,68,68,0.22)':'rgba(16,185,129,0.18)'}`, background: error?'rgba(239,68,68,0.06)':'rgba(16,185,129,0.06)', color: error?'#F87171':'#6EE7B7', fontSize:13}}>
              {error ? t(`login.error.${error}`) ?? t('login.error.oauth_failed') : t('login.registeredSuccess')}
            </div>
          )}

          <div style={{display:'flex', gap:6, marginTop:16, padding:3, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:12}}>
            {(['email','oauth'] as const).map(m=>(
              <button key={m} type="button" onClick={()=>{setMode(m); setFormError('');}} style={{flex:1, padding:'9px', borderRadius:9, border:'1px solid '+(mode===m?'rgba(124,58,237,0.3)':'transparent'), background: mode===m?'rgba(124,58,237,0.13)':'transparent', color: mode===m?'#A78BFA':'#9A99A6', fontWeight:600, fontSize:13}}>{m==='email'? t('login.emailMode') : t('login.socialMode')}</button>
            ))}
          </div>

          {mode==='email' ? (
            <form onSubmit={handleEmailLogin} style={{marginTop:16, display:'flex', flexDirection:'column', gap:12}}>
              {formError && <div style={{padding:'10px 12px', borderRadius:12, border:'1px solid rgba(239,68,68,0.22)', background:'rgba(239,68,68,0.06)', color:'#F87171', fontSize:13}}>{formError}</div>}
              <label style={{display:'flex', flexDirection:'column', gap:6}}>
                <span style={{fontSize:11, fontWeight:600, letterSpacing:'0.06em', textTransform:'uppercase', color:'#6B6A78'}}>{t('login.identifierLabel')}</span>
                <input value={identifier} onChange={e=>setIdentifier(e.target.value)} placeholder={t('login.identifierPlaceholder')} required style={{width:'100%', padding:'13px 14px', borderRadius:12, border:'1px solid rgba(255,255,255,0.08)', background:'rgba(255,255,255,0.04)', color:'#F5F5F7', outline:'none'}}/>
              </label>
              <label style={{display:'flex', flexDirection:'column', gap:6}}>
                <span style={{fontSize:11, fontWeight:600, letterSpacing:'0.06em', textTransform:'uppercase', color:'#6B6A78'}}>{t('login.passwordLabel')}</span>
                <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder={t('login.passwordPlaceholder')} required style={{width:'100%', padding:'13px 14px', borderRadius:12, border:'1px solid rgba(255,255,255,0.08)', background:'rgba(255,255,255,0.04)', color:'#F5F5F7', outline:'none'}}/>
              </label>
              <button type="submit" disabled={loading} className="m-btn m-btn-primary" style={{width:'100%', marginTop:4}}>{loading? t('login.loggingIn') : t('login.loginBtn')}</button>
              <div style={{textAlign:'center', fontSize:12.5, color:'#9A99A6'}}>{t('login.noAccount')} <Link to="/register" style={{color:'#A78BFA', textDecoration:'none', fontWeight:700}}>{t('login.registerLink')}</Link></div>
            </form>
          ) : (
            <div style={{marginTop:16, display:'flex', flexDirection:'column', gap:10}}>
              <button type="button" onClick={()=>window.location.href=apiUrl('/api/auth/discord')} style={{width:'100%', padding:'13px', borderRadius:12, border:'1px solid rgba(255,255,255,0.08)', background:'#5865F2', color:'#fff', fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', gap:8}}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.3 4.4A19.8 19.8 0 0 0 15.9 3l-.4.9a13.4 13.4 0 0 0-7 0L8.1 3a19.8 19.8 0 0 0-4.4 1.5C1.2 8.2.4 11.8.8 15.4A20 20 0 0 0 6.6 18l.9-1.5a8 8 0 0 1-1.4-.7l.3-.2a14.2 14.2 0 0 0 12.4 0l.3.2c-.4.3-.9.6-1.4.7l.9 1.5a19.8 19.8 0 0 0 5.8-2.6c.4-4.2-.7-7.8-2.1-11.2zM8.7 13.1c-.9 0-1.7-.9-1.7-2s.8-2 1.7-2 1.7.9 1.7 2-.8 2-1.7 2zm6.6 0c-.9 0-1.7-.9-1.7-2s.8-2 1.7-2 1.7.9 1.7 2-.8 2-1.7 2z"/></svg> {t('login.discord')}
              </button>
              <div style={{fontSize:11, color:'#6B6A78', textAlign:'center'}}>{t('login.securedNote')}</div>
            </div>
          )}
          {from && from!=='/' && <div style={{marginTop:10, textAlign:'center', fontSize:11, color:'#6B6A78'}}>{t('login.returnTo')} <span style={{fontFamily:'monospace', color:'#9A99A6'}}>{from}</span></div>}
        </div>
        <div style={{textAlign:'center', marginTop:14, fontSize:11, color:'#6B6A78'}}><Link to="/terms" style={{color:'#9A99A6', textDecoration:'none'}}>{t('nav.terms')}</Link> · <Link to="/refund" style={{color:'#9A99A6', textDecoration:'none'}}>{t('refund.title')}</Link></div>
      </div>
    </MobileLayout>
  );
}

export function RegisterMobile(){
  const { t } = useI18n();
  const { user } = useAuth();
  const [params]=useSearchParams();
  const refCode=params.get('ref')??undefined;
  const navigate=useNavigate();
  const [email,setEmail]=useState(''); const [username,setUsername]=useState(''); const [password,setPassword]=useState(''); const [confirmPassword,setConfirmPassword]=useState('');
  const [loading,setLoading]=useState(false); const [formError,setFormError]=useState('');
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
        {to:'/login', label:t('nav.login'), icon:MIcons.login},
      ];
  const handleSubmit=async(e:React.FormEvent)=>{
    e.preventDefault(); setFormError('');
    if(password!==confirmPassword){ setFormError(t('register.error.passwordMismatch')); return; }
    if(password.length<6){ setFormError(t('register.error.passwordShort')); return; }
    if(username.length<3||username.length>32){ setFormError(t('register.error.usernameLength')); return; }
    setLoading(true);
    try{ const data=await api<{ok:boolean; userId:string}>('/api/auth/register',{method:'POST', body:{email,username,password,ref:refCode}}); if(data.ok) window.location.href='/login?registered=1'; }
    catch(err:unknown){ const apiErr=err as {detail?:{error?:string}; message?:string}; setFormError(apiErr?.detail?.error || apiErr?.message || t('register.error.generic')); } finally{ setLoading(false); }
  };
  return (
    <MobileLayout title={t('register.title')} subtitle={t('register.subtitle')} items={nav} onHome={()=>navigate('/')}>
      <div style={{maxWidth:420, margin:'0 auto', width:'100%'}}>
        <div className="m-card" style={{padding:20}}>
          <div style={{textAlign:'center'}}>
            <div style={{width:48,height:48,borderRadius:14, background:'#1A1A22', border:'1px solid rgba(255,255,255,0.08)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto', fontWeight:900, color:'#fff'}}>SU</div>
            <div style={{marginTop:10, fontSize:18, fontWeight:800, color:'#F5F5F7'}}>{t('register.title')}</div>
            <div style={{marginTop:4, fontSize:13, color:'#9A99A6'}}>{t('register.subtitle')}</div>
          </div>
          <form onSubmit={handleSubmit} style={{marginTop:16, display:'flex', flexDirection:'column', gap:12}}>
            {formError && <div style={{padding:'10px 12px', borderRadius:12, border:'1px solid rgba(239,68,68,0.22)', background:'rgba(239,68,68,0.06)', color:'#F87171', fontSize:13}}>{formError}</div>}
            <label style={{display:'flex', flexDirection:'column', gap:6}}><span style={{fontSize:11, fontWeight:600, letterSpacing:'0.06em', textTransform:'uppercase', color:'#6B6A78'}}>{t('register.emailLabel')}</span><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder={t('register.emailPlaceholder')} required style={{width:'100%', padding:'13px 14px', borderRadius:12, border:'1px solid rgba(255,255,255,0.08)', background:'rgba(255,255,255,0.04)', color:'#F5F5F7', outline:'none'}}/></label>
            <label style={{display:'flex', flexDirection:'column', gap:6}}><span style={{fontSize:11, fontWeight:600, letterSpacing:'0.06em', textTransform:'uppercase', color:'#6B6A78'}}>{t('register.usernameLabel')}</span><input type="text" value={username} onChange={e=>setUsername(e.target.value)} placeholder={t('register.usernamePlaceholder')} required minLength={3} maxLength={32} style={{width:'100%', padding:'13px 14px', borderRadius:12, border:'1px solid rgba(255,255,255,0.08)', background:'rgba(255,255,255,0.04)', color:'#F5F5F7', outline:'none'}}/></label>
            <label style={{display:'flex', flexDirection:'column', gap:6}}><span style={{fontSize:11, fontWeight:600, letterSpacing:'0.06em', textTransform:'uppercase', color:'#6B6A78'}}>{t('register.passwordLabel')}</span><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder={t('register.passwordPlaceholder')} required minLength={6} style={{width:'100%', padding:'13px 14px', borderRadius:12, border:'1px solid rgba(255,255,255,0.08)', background:'rgba(255,255,255,0.04)', color:'#F5F5F7', outline:'none'}}/></label>
            <label style={{display:'flex', flexDirection:'column', gap:6}}><span style={{fontSize:11, fontWeight:600, letterSpacing:'0.06em', textTransform:'uppercase', color:'#6B6A78'}}>{t('register.confirmPasswordLabel')}</span><input type="password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} placeholder={t('register.confirmPasswordPlaceholder')} required minLength={6} style={{width:'100%', padding:'13px 14px', borderRadius:12, border:'1px solid rgba(255,255,255,0.08)', background:'rgba(255,255,255,0.04)', color:'#F5F5F7', outline:'none'}}/></label>
            <button type="submit" disabled={loading} className="m-btn m-btn-primary" style={{width:'100%', marginTop:4}}>{loading? t('register.creating') : t('register.createBtn')}</button>
            <div style={{padding:'10px 12px', borderRadius:12, border:'1px solid rgba(245,158,11,0.18)', background:'rgba(245,158,11,0.06)', color:'#FBBF24', fontSize:12, lineHeight:1.5}}><strong style={{display:'block', marginBottom:4}}>{t('register.warning.title')}</strong>{t('register.warning.body')}</div>
            <div style={{textAlign:'center', fontSize:12.5, color:'#9A99A6'}}>{t('register.hasAccount')} <Link to="/login" style={{color:'#A78BFA', textDecoration:'none', fontWeight:700}}>{t('register.loginLink')}</Link></div>
          </form>
        </div>
      </div>
    </MobileLayout>
  );
}
