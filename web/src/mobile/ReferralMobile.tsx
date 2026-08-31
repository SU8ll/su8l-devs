import { useEffect, useMemo, useState } from 'react';
import { useI18n } from '../i18n';
import { claimReferralReward, getReferral, type ReferralDto } from '../api';
import { Spinner, formatDate } from '../components/ui';

export default function ReferralMobile(){
  const { t } = useI18n();
  const [data,setData]=useState<ReferralDto|null>(null);
  const [error,setError]=useState('');
  const [copied,setCopied]=useState(false);
  const [claiming,setClaiming]=useState(false);
  const [claimMsg,setClaimMsg]=useState<{ok:boolean; text:string}|null>(null);
  const load=()=> getReferral().then(setData).catch(()=> setError('Failed to load referral'));
  useEffect(()=>{ load(); },[]);
  const goal = data?.goal ?? data?.freeMonthThreshold ?? 5;
  const progress = useMemo(()=> data? Math.min(100, (data.count/goal)*100) : 0, [data, goal]);
  async function copy(){ try{ await navigator.clipboard.writeText(data!.shareUrl); setCopied(true); setTimeout(()=>setCopied(false),2000);}catch{} }
  async function onClaim(){ if(claiming) return; setClaiming(true); setClaimMsg(null); try{ const r=await claimReferralReward(); setClaimMsg({ok:true, text: t('referral.claimSuccess').replace('{plan}', r.freePlanName)}); load(); }catch{ setClaimMsg({ok:false, text: t('referral.claimFailed')}); } finally{ setClaiming(false);} }
  if(error) return <div style={{color:'#F87171', padding:16}}>{error}</div>;
  if(!data) return <div className="flex justify-center py-20"><Spinner size={28}/></div>;
  const rewardEarned=data.claimed;
  return (
    <div style={{display:'flex', flexDirection:'column', gap:14}}>
      <div className="m-card" style={{padding:18}}>
        <div style={{fontSize:11, fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:'#6B6A78'}}>{t('referral.title')}</div>
        <div style={{marginTop:8, fontSize:18, fontWeight:800, letterSpacing:'-0.02em', color:'#F5F5F7'}}>{t('referral.headline')}</div>
        <div style={{marginTop:6, fontSize:13, lineHeight:1.5, color:'#9A99A6'}}>{t('referral.subtitle')}</div>

        <div className="m-stats" style={{marginTop:14, gridTemplateColumns:'repeat(3,1fr)', gap:8}}>
          <div className="m-stat" style={{padding:'12px 6px'}}><div style={{fontSize:18, fontWeight:850, color:'#A78BFA'}}>{data.discount}%</div><div style={{fontSize:10, letterSpacing:'0.06em', textTransform:'uppercase', color:'#6B6A78', marginTop:4}}>{t('referral.statDiscount')}</div></div>
          <div className="m-stat" style={{padding:'12px 6px'}}><div style={{fontSize:18, fontWeight:850, color:'#F5F5F7'}}>{data.count}/{goal}</div><div style={{fontSize:10, letterSpacing:'0.06em', textTransform:'uppercase', color:'#6B6A78', marginTop:4}}>{t('referral.statFriends')}</div></div>
          <div className="m-stat" style={{padding:'12px 6px'}}><div style={{fontSize:18, fontWeight:850, color:'#F5F5F7'}}>1 {t('referral.freeMonth')}</div><div style={{fontSize:10, letterSpacing:'0.06em', textTransform:'uppercase', color:'#6B6A78', marginTop:4}}>{t('referral.statReward')}</div></div>
        </div>

        <div style={{marginTop:16, padding:14, borderRadius:14, border:'1px solid rgba(255,255,255,0.07)', background:'rgba(255,255,255,0.02)'}}>
          <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8}}>
            <span style={{fontSize:11, fontWeight:600, letterSpacing:'0.08em', textTransform:'uppercase', color:'#6B6A78'}}>{t('referral.yourCode')}</span>
            <span style={{fontSize:11, fontFamily:'monospace', color:'#6B6A78'}}>{data.count} {t('referral.friendsLabel')}</span>
          </div>
          <div style={{display:'flex', gap:8, alignItems:'center'}}>
            <div style={{flex:1, padding:'12px 14px', borderRadius:12, background:'rgba(0,0,0,0.28)', border:'1px solid rgba(255,255,255,0.06)', fontFamily:'monospace', fontSize:16, fontWeight:800, letterSpacing:'0.12em', color:'#A78BFA', textAlign:'center'}}>{data.code}</div>
            <button type="button" onClick={copy} style={{padding:'12px 16px', borderRadius:12, border:'none', background:'#7C3AED', color:'#fff', fontWeight:700, fontSize:13, flexShrink:0}}>{copied? t('referral.copied') : t('referral.copy')}</button>
          </div>
          <div style={{marginTop:8, fontSize:11, color:'#6B6A78', wordBreak:'break-all'}}>{data.shareUrl}</div>
        </div>

        <div style={{marginTop:16}}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:8}}>
            <span style={{fontSize:12, fontWeight:600, color:'#9A99A6'}}>{t('referral.progressTitle')}</span>
            <span style={{fontSize:13, fontWeight:800, color:'#A78BFA'}}>{data.count} / {goal}</span>
          </div>
          <div style={{height:8, borderRadius:999, background:'rgba(255,255,255,0.06)', overflow:'hidden'}}>
            <div style={{height:'100%', width:`${progress}%`, background:'#7C3AED', borderRadius:999, transition:'width 0.5s ease'}}/>
          </div>
          <div style={{marginTop:8, fontSize:12, color:'#6B6A78'}}>{data.canClaim? t('referral.rewardReady') : rewardEarned? t('referral.rewardEarned') : t('referral.rewardRemaining').replace('{n}', String(Math.max(0, goal-data.count)))}</div>
        </div>

        {data.canClaim && (
          <div style={{marginTop:16, padding:16, borderRadius:14, border:'1px solid rgba(124,58,237,0.22)', background:'rgba(124,58,237,0.06)', textAlign:'center'}}>
            <div style={{fontSize:13, fontWeight:700, color:'#A78BFA', marginBottom:10}}>{t('referral.rewardReadyTitle')}</div>
            <button type="button" onClick={onClaim} disabled={claiming} className="m-btn m-btn-primary" style={{width:'100%'}}>{claiming? t('referral.claiming') : t('referral.claimButton')}</button>
            {claimMsg && <div style={{marginTop:10, fontSize:12, color: claimMsg.ok? '#6EE7B7':'#F87171'}}>{claimMsg.text}</div>}
          </div>
        )}
        {rewardEarned && !data.canClaim && (
          <div style={{marginTop:16, padding:14, borderRadius:14, border:'1px solid rgba(16,185,129,0.18)', background:'rgba(16,185,129,0.06)', textAlign:'center', color:'#6EE7B7', fontWeight:600, fontSize:13}}>{t('referral.claimedNotice')}</div>
        )}
      </div>

      {data.invitees.length>0 && (
        <div>
          <div style={{fontSize:11, fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:'#6B6A78', marginBottom:10, paddingLeft:2}}>{t('referral.friendsTitle')}</div>
          <div className="m-card" style={{padding:'6px 14px'}}>
            {data.invitees.map((inv,i)=>(
              <div key={i} style={{display:'flex', alignItems:'center', gap:10, padding:'12px 0', borderBottom: i===data.invitees.length-1? 'none':'1px solid rgba(255,255,255,0.05)'}}>
                {inv.avatar? <img src={inv.avatar} alt="" style={{width:36,height:36,borderRadius:10,objectFit:'cover', border:'1px solid rgba(255,255,255,0.06)'}}/> : <div style={{width:36,height:36,borderRadius:10, background:'linear-gradient(135deg,#7C3AED,#A78BFA)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:800, fontSize:12}}>{inv.username[0]?.toUpperCase()??'?'}</div>}
                <div style={{flex:1, minWidth:0}}>
                  <div style={{fontSize:13, fontWeight:700, color:'#F5F5F7', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{inv.username}</div>
                  <div style={{fontSize:11, color:'#6B6A78'}}>{formatDate(new Date(inv.joinedAt).getTime())}</div>
                </div>
                <span style={{padding:'4px 8px', borderRadius:999, background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.18)', color:'#6EE7B7', fontSize:10, fontWeight:800, letterSpacing:'0.06em', textTransform:'uppercase'}}>{t('referral.eliteBadge')}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <div style={{textAlign:'center', fontSize:11, color:'#3F3E48', padding:'4px 0'}}>{t('referral.footnote')}</div>
    </div>
  );
}
