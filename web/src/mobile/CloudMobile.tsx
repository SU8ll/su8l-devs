import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../i18n';
import { api, renameAccount, type CloudCategorySchema, type CloudConfig, type CloudConfigDto, type CloudFieldSchema, type SaveCloudConfigResponse } from '../api';
import { Spinner } from '../components/ui';

type JsonObject = Record<string, unknown>;
function getValue(root:unknown, path:string[]):unknown{ let cur:unknown=root; for(const k of path){ if(cur && typeof cur==='object' && !Array.isArray(cur)) cur=(cur as JsonObject)[k]; else return undefined;} return cur; }
function setValue(root:CloudConfig, path:string[], value:unknown):CloudConfig{ const clone=JSON.parse(JSON.stringify(root)) as JsonObject; let cur:JsonObject=clone; for(let i=0;i<path.length-1;i++){ const n=cur[path[i]]; if(n && typeof n==='object' && !Array.isArray(n)) cur=n as JsonObject; else cur=(cur[path[i]]={}) as JsonObject; } cur[path[path.length-1]]=value; return clone as unknown as CloudConfig; }

export default function CloudMobile(){
  const { t } = useI18n();
  const [data,setData]=useState<CloudConfigDto|null>(null);
  const [cfg,setCfg]=useState<CloudConfig|null>(null);
  const [snapshot,setSnapshot]=useState('');
  const [activeKey,setActiveKey]=useState('');
  const [activeSlotId,setActiveSlotId]=useState('');
  const [editing,setEditing]=useState(false);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState('');
  const [renameOpen,setRenameOpen]=useState(false);
  const [renameVal,setRenameVal]=useState('');
  const dirty = cfg!==null && JSON.stringify(cfg)!==snapshot;

  const loadConfig=async(slotId?:string)=>{
    setError('');
    try{ const q=slotId? `?slotId=${encodeURIComponent(slotId)}` : ''; const d=await api<CloudConfigDto>(`/api/dashboard/cloud-config${q}`); setData(d); setCfg(d.config); setSnapshot(JSON.stringify(d.config)); setActiveKey(d.schema.categories[0]?.id??''); setActiveSlotId(d.activeSlotId?? slotId ?? ''); setEditing(false); }catch{ setError('Failed to load'); }
  };
  useEffect(()=>{ loadConfig(); },[]);

  const update=(path:string[], value:unknown)=>{
    if(!editing || !cfg) return;
    setCfg(prev=> prev? setValue(prev, path, value) : prev);
  };
  const save=async()=>{
    if(!cfg) return;
    setSaving(true);
    try{ const res=await api<SaveCloudConfigResponse>('/api/dashboard/cloud-config',{method:'PUT', body:{config:cfg, slotId: activeSlotId||undefined}}); setSnapshot(JSON.stringify(res.config)); setCfg(res.config); setActiveSlotId(res.activeSlotId); setEditing(false); }catch(e){ setError(e instanceof Error? e.message:'Failed'); } finally{ setSaving(false); }
  };
  const exitEdit=()=>{ setEditing(false); if(cfg && snapshot) try{ setCfg(JSON.parse(snapshot) as CloudConfig); }catch{} };

  if(error) return <div style={{color:'#F87171', padding:16}}>{error}</div>;
  if(!data || !cfg) return <div className="flex justify-center py-20"><Spinner size={28}/></div>;
  if(data.locked){
    return (
      <div style={{display:'flex', flexDirection:'column', gap:14}}>
        <div style={{fontSize:11, fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:'#6B6A78'}}>{t('dash.botPanel')}</div>
        <div style={{fontSize:20, fontWeight:850, color:'#F5F5F7'}}>{t('cloud.title')}</div>
        <div className="m-card" style={{textAlign:'center', padding:'28px 16px'}}>
          <div style={{fontSize:28}}>🔒</div>
          <div style={{marginTop:10, fontWeight:700, color:'#F5F5F7'}}>{t('cloud.lockedPlan')}</div>
          <Link to="/pricing" className="m-btn m-btn-primary" style={{width:'100%', marginTop:14}}>{t('dash.upgrade')}</Link>
        </div>
      </div>
    );
  }
  const active = data.schema.categories.find(c=>c.id===activeKey) ?? data.schema.categories[0];
  const slots=data.slots;
  const activeSlot = slots.find(s=>s.id===activeSlotId) ?? slots[0];

  return (
    <div style={{display:'flex', flexDirection:'column', gap:14, paddingBottom: editing? 72:0}}>
      {/* Running/account status row */}
      <div style={{display:'flex', alignItems:'center', gap:8, flexWrap:'wrap'}}>
        <span style={{width:8,height:8,borderRadius:999, background:'#10B981', boxShadow:'0 0 8px rgba(16,185,129,0.5)'}}/>
        <span style={{fontSize:12, fontWeight:600, color:'#6EE7B7'}}>{t('botpanel.running')}</span>
        {slots.length>1 && (
          <button type="button" onClick={()=>{ setRenameVal(activeSlot?.name??''); setRenameOpen(true); }} style={{marginLeft:'auto', display:'inline-flex', alignItems:'center', gap:6, padding:'7px 12px', borderRadius:999, border:'1px solid rgba(255,255,255,0.08)', background:'rgba(255,255,255,0.04)', color:'#D1D1D6', fontWeight:600, fontSize:12}}>
            <span style={{width:6,height:6, borderRadius:999, background:'#A78BFA'}}/>{activeSlot?.name ?? 'Account'} <span style={{color:'#6B6A78'}}>›</span>
          </button>
        )}
      </div>

      {/* Edit banner */}
      <div className="m-card" style={{padding:14, display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, borderColor: editing? 'rgba(124,58,237,0.18)' : 'rgba(255,255,255,0.07)', background: editing? 'rgba(124,58,237,0.06)' : undefined}}>
        <div style={{display:'flex', gap:10, alignItems:'center'}}>
          <span style={{width:36,height:36, borderRadius:11, background: editing? '#7C3AED' : 'rgba(255,255,255,0.06)', display:'flex', alignItems:'center', justifyContent:'center', color: editing? '#fff':'#9A99A6'}}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          </span>
          <div>
            <div style={{fontSize:12, fontWeight:800, letterSpacing:'0.08em', textTransform:'uppercase', color: editing? '#A78BFA':'#9A99A6'}}>{editing? t('cloud.editing') : t('cloud.lockedTitle')}</div>
            <div style={{fontSize:11, color:'#6B6A78', marginTop:2}}>{editing? (dirty? t('cloud.unsaved') : '—') : t('cloud.lockedDesc')}</div>
          </div>
        </div>
        {editing? <button type="button" onClick={exitEdit} style={{padding:'8px 14px', borderRadius:11, border:'1px solid rgba(255,255,255,0.08)', background:'rgba(255,255,255,0.04)', color:'#D1D1D6', fontWeight:600}}>{t('cloud.cancel')}</button>
        : <button type="button" onClick={()=>setEditing(true)} style={{padding:'9px 14px', borderRadius:11, border:'none', background:'#7C3AED', color:'#fff', fontWeight:700, display:'flex', alignItems:'center', gap:6}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>{t('cloud.edit')}</button>}
      </div>

      {/* Category pills */}
      <div style={{display:'flex', gap:8, overflowX:'auto', paddingBottom:4, scrollbarWidth:'none'}}>
        {data.schema.categories.map(c=>(
          <button key={c.id} type="button" onClick={()=>setActiveKey(c.id)} style={{flex:'0 0 auto', padding:'10px 14px', borderRadius:12, border: activeKey===c.id? '1px solid rgba(124,58,237,0.28)' : '1px solid rgba(255,255,255,0.07)', background: activeKey===c.id? 'rgba(124,58,237,0.12)' : 'rgba(255,255,255,0.03)', color: activeKey===c.id? '#A78BFA':'#9A99A6', fontWeight:700, fontSize:13, display:'flex', alignItems:'center', gap:6}}>
            <span>{c.icon ?? '⚙️'}</span>{c.title}
          </button>
        ))}
      </div>

      {/* Panel */}
      <div className="m-card" style={{padding:16, opacity: editing? 1 : 0.6, pointerEvents: editing? undefined:'none'}}>
        {active && <MobileCategoryPanel category={active} path={[active.id]} cfg={cfg} disabled={!editing} onChange={update} />}
      </div>

      {/* Save bar sticky */}
      {editing && (
        <div style={{position:'fixed', left:0, right:0, bottom:'calc(64px + env(safe-area-inset-bottom))', background:'rgba(10,10,14,0.96)', backdropFilter:'blur(16px)', borderTop:'1px solid rgba(255,255,255,0.07)', padding:'12px 16px', display:'flex', gap:10, zIndex:30}}>
          <button type="button" onClick={exitEdit} style={{flex:1, padding:'12px', borderRadius:12, border:'1px solid rgba(255,255,255,0.08)', background:'rgba(255,255,255,0.04)', color:'#D1D1D6', fontWeight:600}}>{t('cloud.cancel')}</button>
          <button type="button" onClick={save} disabled={saving || !dirty} style={{flex:1, padding:'12px', borderRadius:12, border:'none', background: dirty? '#7C3AED':'rgba(255,255,255,0.06)', color: dirty? '#fff':'#6B6A78', fontWeight:700, opacity: saving?0.7:1}}>{saving? t('cloud.saving') : t('cloud.save')}</button>
        </div>
      )}

      {renameOpen && (
        <div onClick={()=>setRenameOpen(false)} style={{position:'fixed', inset:0, zIndex:80, background:'rgba(0,0,0,0.6)', backdropFilter:'blur(8px)', display:'flex', alignItems:'center', padding:16}}>
          <div onClick={e=>e.stopPropagation()} className="m-card" style={{width:'100%', maxWidth:420, margin:'0 auto', padding:18}}>
            <div style={{fontWeight:800, color:'#F5F5F7'}}>{t('cloud.renameTitle')}</div>
            <div style={{fontSize:12, color:'#9A99A6', marginTop:4}}>{t('cloud.renameDesc')}</div>
            <input value={renameVal} onChange={e=>setRenameVal(e.target.value)} maxLength={60} autoFocus style={{width:'100%', marginTop:12, padding:'12px 14px', borderRadius:12, border:'1px solid rgba(255,255,255,0.08)', background:'rgba(255,255,255,0.04)', color:'#F5F5F7', outline:'none'}}/>
            <div style={{display:'flex', gap:8, marginTop:12}}>
              <button type="button" onClick={async()=>{ if(!renameVal.trim()) return; await renameAccount(activeSlot.id, renameVal.trim()); setData(prev=> prev? {...prev, slots: prev.slots.map(s=> s.id===activeSlot.id? {...s, name: renameVal.trim()}: s)}: prev); setRenameOpen(false); }} style={{flex:1, padding:'11px', borderRadius:12, border:'none', background:'#7C3AED', color:'#fff', fontWeight:700}}>{t('cloud.renameSave')}</button>
              <button type="button" onClick={()=>setRenameOpen(false)} style={{flex:1, padding:'11px', borderRadius:12, border:'1px solid rgba(255,255,255,0.08)', background:'rgba(255,255,255,0.04)', color:'#D1D1D6', fontWeight:600}}>{t('cloud.renameCancel')}</button>
            </div>
            <div style={{marginTop:10, display:'flex', flexDirection:'column', gap:6, maxHeight:180, overflowY:'auto'}}>
              {slots.map(s=>(
                <button key={s.id} type="button" onClick={()=>{ loadConfig(s.id); setRenameOpen(false); }} style={{textAlign:'left', padding:'10px 12px', borderRadius:10, border: s.id===activeSlotId? '1px solid rgba(124,58,237,0.22)':'1px solid rgba(255,255,255,0.06)', background: s.id===activeSlotId? 'rgba(124,58,237,0.08)':'rgba(255,255,255,0.02)', color: s.id===activeSlotId? '#A78BFA':'#9A99A6', fontWeight:600}}>{s.id===activeSlotId?'● ':'○ '}{s.name}</button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MobileCategoryPanel({ category, path, cfg, disabled, onChange }:{category:CloudCategorySchema; path:string[]; cfg:CloudConfig; disabled:boolean; onChange:(path:string[], v:unknown)=>void; }){
  const fields = category.fields ?? [];
  const booleans = fields.filter(f=> f.type==='boolean');
  const others = fields.filter(f=> f.type!=='boolean');
  return (
    <div style={{display:'flex', flexDirection:'column', gap:16}}>
      <div style={{display:'flex', gap:10, alignItems:'flex-start'}}>
        {category.icon && <span style={{width:36,height:36, borderRadius:11, background:'rgba(124,58,237,0.12)', border:'1px solid rgba(124,58,237,0.14)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0}}>{category.icon}</span>}
        <div>
          <div style={{fontSize:15, fontWeight:800, color:'#F5F5F7'}}>{category.title}</div>
          {category.description && <div style={{fontSize:12.5, color:'#9A99A6', marginTop:2, lineHeight:1.4}}>{category.description}</div>}
        </div>
      </div>

      {booleans.map(f=>(
        <div key={f.key} style={{display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, padding:'14px 14px', borderRadius:12, border:'1px solid rgba(255,255,255,0.07)', background:'rgba(255,255,255,0.02)'}}>
          <div style={{minWidth:0}}>
            <div style={{fontSize:13, fontWeight:600, color:'#F5F5F7'}}>{f.label}</div>
            {f.description && <div style={{fontSize:11.5, color:'#9A99A6', marginTop:2}}>{f.description}</div>}
          </div>
          <Toggle checked={Boolean(getValue(cfg, [...path, f.key]))} disabled={disabled} onChange={v=>onChange([...path,f.key],v)} />
        </div>
      ))}

      {others.map(f=>(
        <div key={f.key} style={{display:'flex', flexDirection:'column', gap:6}}>
          <div style={{fontSize:12, fontWeight:600, color:'#F5F5F7'}}>{f.label}</div>
          {f.description && <div style={{fontSize:11.5, color:'#6B6A78', marginTop:-2}}>{f.description}</div>}
          <FieldControl field={f} value={getValue(cfg,[...path,f.key])} disabled={disabled} onChange={v=>onChange([...path,f.key],v)} />
        </div>
      ))}

      {category.groups?.map(g=>(
        <div key={g.id} style={{padding:14, borderRadius:14, border:'1px solid rgba(124,58,237,0.14)', background:'rgba(124,58,237,0.04)'}}>
          <div style={{display:'flex', gap:8, alignItems:'center'}}>
            {g.icon && <span>{g.icon}</span>}
            <span style={{fontWeight:700, color:'#F5F5F7', fontSize:14}}>{g.title}</span>
          </div>
          {g.description && <div style={{fontSize:12, color:'#9A99A6', marginTop:4}}>{g.description}</div>}
          <div style={{marginTop:12}}>
            <MobileCategoryPanel category={g} path={[...path, g.id]} cfg={cfg} disabled={disabled} onChange={onChange} />
          </div>
        </div>
      ))}
    </div>
  );
}

function FieldControl({ field, value, disabled, onChange }:{field:CloudFieldSchema; value:unknown; disabled:boolean; onChange:(v:unknown)=>void;}){
  switch(field.type){
    case 'number': return <input type="number" value={String(value??0)} min={field.min} max={field.max} step={field.step??1} disabled={disabled} onChange={e=>onChange(Number(e.target.value))} style={inputStyle(disabled)}/>;
    case 'slider': {
      const v=Number(value??0); const min=field.min??0; const max=field.max??100; return (
        <div style={{display:'flex', gap:10, alignItems:'center'}}>
          <input type="range" min={min} max={max} step={field.step??1} value={v} disabled={disabled} onChange={e=>onChange(Number(e.target.value))} style={{flex:1, accentColor:'#7C3AED'}}/>
          <input type="number" value={v} min={min} max={max} disabled={disabled} onChange={e=>onChange(Number(e.target.value))} style={{...inputStyle(disabled), width:72, textAlign:'center' as const}}/>
          {field.unit && <span style={{fontSize:11, color:'#6B6A78'}}>{field.unit}</span>}
        </div>
      );
    }
    case 'string': return <input value={String(value??'')} maxLength={field.maxLength} placeholder={field.placeholder} disabled={disabled} onChange={e=>onChange(e.target.value)} style={inputStyle(disabled)}/>;
    case 'select': return <select value={String(value??'')} disabled={disabled} onChange={e=>onChange(e.target.value)} style={inputStyle(disabled)}>{(field.options??[]).map(o=> <option key={o} value={o}>{o}</option>)}</select>;
    case 'radio': return <div style={{display:'flex', gap:6, flexWrap:'wrap'}}>{(field.options??[]).map(o=> <button key={o} type="button" disabled={disabled} onClick={()=>onChange(o)} style={{padding:'8px 12px', borderRadius:999, border: value===o? '1px solid rgba(124,58,237,0.28)':'1px solid rgba(255,255,255,0.07)', background: value===o? 'rgba(124,58,237,0.12)':'rgba(255,255,255,0.02)', color: value===o? '#A78BFA':'#9A99A6', fontWeight:600, fontSize:12}}>{o}</button>)}</div>;
    default: return null;
  }
}
function inputStyle(disabled:boolean):React.CSSProperties{ return {width:'100%', padding:'11px 12px', borderRadius:11, border:'1px solid rgba(255,255,255,0.08)', background: disabled? 'rgba(255,255,255,0.02)':'rgba(255,255,255,0.04)', color:'#F5F5F7', outline:'none', opacity: disabled?0.6:1};}
function Toggle({checked, disabled, onChange}:{checked:boolean; disabled:boolean; onChange:(v:boolean)=>void}){
  return <button type="button" role="switch" aria-checked={checked} disabled={disabled} onClick={()=>onChange(!checked)} style={{width:44, height:26, borderRadius:999, background: checked? '#7C3AED':'#2A2A32', border:'1px solid '+(checked?'rgba(124,58,237,0.5)':'rgba(255,255,255,0.08)'), position:'relative', flexShrink:0, opacity: disabled?0.6:1}}><span style={{position:'absolute', top:2, left: checked? 'calc(100% - 22px)' : '2px', width:20, height:20, borderRadius:999, background:'#fff', transition:'left 0.16s', boxShadow:'0 1px 4px rgba(0,0,0,0.3)'}}/></button>;
}
