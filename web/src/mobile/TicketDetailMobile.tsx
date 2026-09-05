import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useI18n } from '../i18n';
import { api } from '../api';
import { Spinner } from '../components/ui';

interface Message{ id:number; author:'user'|'staff'; body:string; created_at:string;}
interface Detail{ ticket:{id:number; subject:string; status:'open'|'answered'|'closed'; priority:'low'|'normal'|'high'; created_at:string; updated_at:string;}; messages:Message[]; staff:boolean; }

export default function TicketDetailMobile(){
  const { t } = useI18n();
  const { id } = useParams();
  const [data,setData]=useState<Detail|null>(null);
  const [reply,setReply]=useState(''); const [sending,setSending]=useState(false); const [error,setError]=useState('');
  const sendingRef=useRef(false);
  const load=()=> api<Detail>(`/api/tickets/${id}`).then(setData).catch(e=>setError(e.message));
  useEffect(()=>{ sendingRef.current=false; void load(); const timer=window.setInterval(()=>{ if(!sendingRef.current) void load(); },15000); const onChange=(e:Event)=>{ const d=(e as CustomEvent).detail as {ticketId?:number}|undefined; if(d?.ticketId===Number(id)) void load(); }; window.addEventListener('su8l:tickets-changed', onChange); return()=>{ window.clearInterval(timer); window.removeEventListener('su8l:tickets-changed', onChange); }; },[id]);
  if(error) return <div style={{color:'#F87171', padding:16}}>{error}</div>;
  if(!data) return <div className="flex justify-center py-20"><Spinner size={28}/></div>;
  const send=async()=>{ if(!reply.trim()||sending) return; sendingRef.current=true; setSending(true); try{ await api(`/api/tickets/${data.ticket.id}/messages`,{method:'POST', body:{body:reply}}); setReply(''); await load(); }catch(e){ setError(e instanceof Error? e.message : t('tickets.error.sendFailed')); } finally{ sendingRef.current=false; setSending(false);} };
  const setStatus=async(status:'open'|'closed')=>{ await api(`/api/tickets/${data.ticket.id}/status`,{method:'POST', body:{status}}); await load(); };
  return (
    <div style={{display:'flex', flexDirection:'column', gap:12}}>
      <Link to="/dashboard/tickets" style={{fontSize:13, color:'#A78BFA', textDecoration:'none', display:'inline-flex', alignItems:'center', gap:4}}>← {t('tickets.back')}</Link>
      <div className="m-card" style={{padding:16}}>
        <div style={{fontSize:11, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'#6B6A78'}}>#{data.ticket.id}</div>
        <div style={{marginTop:4, fontSize:16, fontWeight:800, color:'#F5F5F7', lineHeight:1.2}}>{data.ticket.subject}</div>
        <div style={{marginTop:10, display:'flex', gap:6, flexWrap:'wrap', alignItems:'center'}}>
          <span style={{padding:'4px 8px', borderRadius:999, fontSize:10, fontWeight:800, letterSpacing:'0.06em', textTransform:'uppercase', background:'rgba(124,58,237,0.1)', border:'1px solid rgba(124,58,237,0.18)', color:'#A78BFA'}}>{t(`tickets.${data.ticket.priority}`)}</span>
          <span style={{padding:'4px 8px', borderRadius:999, fontSize:10, fontWeight:800, letterSpacing:'0.06em', textTransform:'uppercase', background: data.ticket.status==='closed'? 'rgba(255,255,255,0.04)': data.ticket.status==='answered'? 'rgba(16,185,129,0.1)':'rgba(245,158,11,0.1)', color: data.ticket.status==='closed'? '#9A99A6': data.ticket.status==='answered'? '#6EE7B7':'#FBBF24'}}>{t(`tickets.${data.ticket.status}`)}</span>
          {data.staff && <button type="button" onClick={()=>setStatus(data.ticket.status==='closed'?'open':'closed')} style={{marginLeft:'auto', padding:'7px 12px', borderRadius:10, border:'1px solid rgba(255,255,255,0.08)', background:'rgba(255,255,255,0.04)', color:'#D1D1D6', fontWeight:600, fontSize:12}}>{data.ticket.status==='closed'? t('tickets.reopen') : t('tickets.close')}</button>}
        </div>
      </div>

      <div style={{display:'flex', flexDirection:'column', gap:10}}>
        {data.messages.map(m=>(
          <div key={m.id} className="m-card" style={{padding:14, borderColor: m.author==='staff'? 'rgba(124,58,237,0.18)' : undefined, background: m.author==='staff'? 'rgba(124,58,237,0.05)' : undefined}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
              <span style={{fontSize:10, fontWeight:800, letterSpacing:'0.08em', textTransform:'uppercase', color: m.author==='staff'? '#A78BFA':'#6B6A78'}}>{m.author==='staff'? t('tickets.staff') : t('tickets.you')}</span>
              <span style={{fontSize:11, color:'#6B6A78'}}>{new Date(m.created_at).toLocaleString()}</span>
            </div>
            <div style={{marginTop:8, fontSize:13.5, lineHeight:1.6, color:'#E5E5E7', whiteSpace:'pre-wrap', wordBreak:'break-word'}}>{m.body}</div>
          </div>
        ))}
      </div>

      {data.ticket.status!=='closed' && (
        <div className="m-card" style={{padding:14}}>
          <div style={{fontSize:12, fontWeight:700, color:'#F5F5F7', marginBottom:8}}>{t('tickets.reply')}</div>
          <textarea value={reply} onChange={e=>setReply(e.target.value)} maxLength={4000} rows={3} placeholder={t('tickets.body')} style={{width:'100%', padding:'12px 14px', borderRadius:12, border:'1px solid rgba(255,255,255,0.08)', background:'rgba(255,255,255,0.04)', color:'#F5F5F7', outline:'none', resize:'vertical'}}/>
          {error && <div style={{marginTop:8, color:'#F87171', fontSize:12}}>{error}</div>}
          <button type="button" onClick={send} disabled={sending} className="m-btn m-btn-primary" style={{width:'100%', marginTop:10}}>{sending?'…': t('tickets.send')}</button>
        </div>
      )}
    </div>
  );
}
