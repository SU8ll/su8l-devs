import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../i18n';
import { api } from '../api';
import { Spinner } from '../components/ui';

interface Ticket { id:number; subject:string; status:'open'|'answered'|'closed'; priority:'low'|'normal'|'high'; updated_at:string; }

export default function TicketsMobile(){
  const { t } = useI18n();
  const [tickets,setTickets]=useState<Ticket[]|null>(null);
  const [showForm,setShowForm]=useState(false);
  const [subject,setSubject]=useState(''); const [body,setBody]=useState(''); const [priority,setPriority]=useState<'low'|'normal'|'high'>('normal');
  const [creating,setCreating]=useState(false); const [error,setError]=useState('');
  const load=()=> api<{tickets:Ticket[]}>('/api/tickets').then(r=>setTickets(r.tickets)).catch(e=>{ setError(e instanceof Error? e.message : t('tickets.error.generic')); setTickets([]); });
  useEffect(()=>{ void load(); const onChange=()=>void load(); window.addEventListener('su8l:tickets-changed', onChange); return()=>window.removeEventListener('su8l:tickets-changed', onChange); },[]);
  const create=async()=>{
    if(!subject.trim()||!body.trim()||creating) return;
    setCreating(true); setError('');
    try{ await api('/api/tickets',{method:'POST', body:{subject, body, priority}}); setSubject(''); setBody(''); setShowForm(false); await load(); }
    catch(e){ setError(e instanceof Error? e.message : t('tickets.error.generic')); } finally{ setCreating(false); }
  };
  return (
    <div style={{display:'flex', flexDirection:'column', gap:14}}>
      <div style={{display:'flex', alignItems:'flex-end', justifyContent:'space-between', gap:12}}>
        <div>
          <div style={{fontSize:11, fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:'#22D3EE'}}>{t('dash.tickets')}</div>
          <div style={{marginTop:4, fontSize:20, fontWeight:850, letterSpacing:'-0.02em', color:'#F5F5F7'}}>{t('tickets.title')}</div>
          <div style={{marginTop:4, fontSize:13, color:'#9A99A6', lineHeight:1.4}}>{t('tickets.subtitle')}</div>
        </div>
        <button type="button" onClick={()=>setShowForm(v=>!v)} style={{padding:'10px 14px', borderRadius:12, border:'none', background: showForm? 'rgba(255,255,255,0.06)' : '#7C3AED', color: showForm?'#9A99A6':'#fff', fontWeight:700, fontSize:13, flexShrink:0, borderColor:'rgba(255,255,255,0.07)', borderStyle: showForm? 'solid':'none', borderWidth: showForm? 1:0}}>{showForm? '✕' : '+'} {t('tickets.new')}</button>
      </div>

      {showForm && (
        <div className="m-card" style={{padding:16, display:'flex', flexDirection:'column', gap:12}}>
          <label style={{display:'flex', flexDirection:'column', gap:6}}>
            <span style={{fontSize:11, fontWeight:600, letterSpacing:'0.06em', textTransform:'uppercase', color:'#6B6A78'}}>{t('tickets.subject')}</span>
            <input value={subject} onChange={e=>setSubject(e.target.value)} maxLength={120} style={{width:'100%', padding:'12px 14px', borderRadius:12, border:'1px solid rgba(255,255,255,0.08)', background:'rgba(255,255,255,0.04)', color:'#F5F5F7', outline:'none'}}/>
          </label>
          <label style={{display:'flex', flexDirection:'column', gap:6}}>
            <span style={{fontSize:11, fontWeight:600, letterSpacing:'0.06em', textTransform:'uppercase', color:'#6B6A78'}}>{t('tickets.body')}</span>
            <textarea value={body} onChange={e=>setBody(e.target.value)} maxLength={4000} rows={4} style={{width:'100%', padding:'12px 14px', borderRadius:12, border:'1px solid rgba(255,255,255,0.08)', background:'rgba(255,255,255,0.04)', color:'#F5F5F7', outline:'none', resize:'vertical'}}/>
          </label>
          <div>
            <div style={{fontSize:11, fontWeight:600, letterSpacing:'0.06em', textTransform:'uppercase', color:'#6B6A78', marginBottom:8}}>{t('tickets.priority')}</div>
            <div style={{display:'inline-flex', gap:4, padding:4, borderRadius:999, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.06)'}}>
              {(['low','normal','high'] as const).map(p=>(
                <button key={p} type="button" onClick={()=>setPriority(p)} style={{padding:'7px 14px', borderRadius:999, border:'none', background: priority===p? '#7C3AED':'transparent', color: priority===p? '#fff':'#9A99A6', fontWeight:700, fontSize:12}}>{t(`tickets.${p}`)}</button>
              ))}
            </div>
          </div>
          {error && <div style={{padding:'10px 12px', borderRadius:12, border:'1px solid rgba(239,68,68,0.22)', background:'rgba(239,68,68,0.06)', color:'#F87171', fontSize:13}}>{error}</div>}
          <button type="button" onClick={create} disabled={creating} className="m-btn m-btn-primary" style={{width:'100%'}}>{creating?'…': t('tickets.new')}</button>
        </div>
      )}

      {!tickets ? <div className="flex justify-center py-16"><Spinner size={28}/></div>
      : tickets.length===0 ? (
        <div className="m-card" style={{padding:'28px 16px', textAlign:'center'}}>
          <div style={{width:48,height:48,borderRadius:14, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.06)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto', color:'#6B6A78'}}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="3" y="4" width="18" height="16" rx="2.2"/><path d="M6 8h12M6 12h12M6 16h12"/></svg></div>
          <div style={{marginTop:12, fontSize:14, color:'#9A99A6'}}>{t('tickets.empty')}</div>
        </div>
      ) : (
        <div style={{display:'flex', flexDirection:'column', gap:10}}>
          {tickets.map(tk=>(
            <Link key={tk.id} to={`/dashboard/tickets/${tk.id}`} style={{textDecoration:'none'}} className="m-card" >
              <div style={{display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:10}}>
                <div style={{minWidth:0, flex:1}}>
                  <div style={{fontSize:14, fontWeight:700, color:'#F5F5F7', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>#{tk.id} — {tk.subject}</div>
                  <div style={{marginTop:4, fontSize:11, color:'#6B6A78'}}>{new Date(tk.updated_at).toLocaleString()}</div>
                </div>
                <span style={{color:'#6B6A78', flexShrink:0}}>›</span>
              </div>
              <div style={{marginTop:10, display:'flex', gap:6, flexWrap:'wrap'}}>
                <span style={{padding:'4px 8px', borderRadius:999, fontSize:10, fontWeight:800, letterSpacing:'0.06em', textTransform:'uppercase', background: tk.priority==='high'? 'rgba(239,68,68,0.1)': tk.priority==='low'? 'rgba(255,255,255,0.04)':'rgba(245,158,11,0.1)', border:`1px solid ${tk.priority==='high'? 'rgba(239,68,68,0.18)': tk.priority==='low'? 'rgba(255,255,255,0.06)':'rgba(245,158,11,0.16)'}`, color: tk.priority==='high'? '#F87171': tk.priority==='low'? '#9A99A6':'#FBBF24'}}>{t(`tickets.${tk.priority}`)}</span>
                <span style={{padding:'4px 8px', borderRadius:999, fontSize:10, fontWeight:800, letterSpacing:'0.06em', textTransform:'uppercase', background: tk.status==='closed'? 'rgba(255,255,255,0.04)': tk.status==='answered'? 'rgba(16,185,129,0.1)':'rgba(124,58,237,0.1)', border:`1px solid ${tk.status==='closed'? 'rgba(255,255,255,0.06)': tk.status==='answered'? 'rgba(16,185,129,0.18)':'rgba(124,58,237,0.18)'}`, color: tk.status==='closed'? '#9A99A6': tk.status==='answered'? '#6EE7B7':'#A78BFA'}}>{t(`tickets.${tk.status}`)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
