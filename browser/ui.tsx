import {useEffect,useRef,useState,type FormEvent} from 'react';
import {Check,Download,Loader2,Plus,Trash2,Utensils,X} from 'lucide-react';
import {api,dateKey} from './local-api.mjs';
import {vault} from './vault.mjs';
import {deviceTimezone} from './timezone.mjs';
import {calorieWeek,type CalorieEntry} from './calorie-week';
import {watchAppUpdates} from './app-updates.mjs';
import {dismissLegacyNotifications} from './retire-notifications.mjs';

type NewEntry = {kind:'food';date:string;time:string;value:number;label:string};
type InstallEvent = Event & {
 prompt(): Promise<void>;
 userChoice: Promise<{outcome:'accepted'|'dismissed'}>;
};
type Modal = 'food'|'install'|'vault';
const fmt=(value:number, digits=0)=>value.toLocaleString('en-AU',{minimumFractionDigits:digits,maximumFractionDigits:digits});
const shortDate=(date:string)=>new Date(date+'T12:00:00Z').toLocaleDateString('en-AU',{day:'numeric',month:'short',timeZone:'UTC'});

export default function Dashboard(){
 const [entries,setEntries]=useState<CalorieEntry[]>([]);
 const [loading,setLoading]=useState(true);
 const [ready,setReady]=useState(false);
 const [modal,setModal]=useState<Modal|null>(null);
 const [error,setError]=useState('');
 const [toast,setToast]=useState('');
 const [busy,setBusy]=useState(false);
 const [undoEntry,setUndoEntry]=useState<CalorieEntry|null>(null);
 const [updateWorker,setUpdateWorker]=useState<ServiceWorker|null>(null);
 const [updating,setUpdating]=useState(false);
 const [installed,setInstalled]=useState(()=>window.matchMedia('(display-mode: standalone)').matches);
 const [installEvent,setInstallEvent]=useState<InstallEvent|null>(null);
 const [,tick]=useState(0);
 const dialog=useRef<HTMLDialogElement>(null);
 const reloadForUpdate=useRef(false);
 const timezone=deviceTimezone();
 const now=new Date();
 const today=dateKey(now,timezone);

 async function refresh(){
  const data=await api('data');
  setEntries(data.entries);
  setReady(true);
 }

 async function openVault(){
  setLoading(true);
  setError('');
  try{
   if(await vault.open()) await refresh();
   else setModal('vault');
  }catch(error){
   setError((error as Error).message);
  }finally{
   setLoading(false);
  }
 }

 useEffect(()=>{
  void openVault();
  const resume=()=>{
   if(document.visibilityState==='visible'&&vault?.isUnlocked()){
    vault.open().then((opened:boolean)=>{if(opened)return refresh();}).catch(()=>{});
   }
  };
  const beforeInstall=(event:Event)=>{event.preventDefault();setInstallEvent(event as InstallEvent);};
  const afterInstall=()=>{setInstalled(true);setInstallEvent(null);};
  const controllerChanged=()=>{if(reloadForUpdate.current)window.location.reload();};
  const serviceWorker=navigator.serviceWorker;
  let stopUpdates=()=>{};
  let disposed=false;
  document.addEventListener('visibilitychange',resume);
  window.addEventListener('beforeinstallprompt',beforeInstall);
  window.addEventListener('appinstalled',afterInstall);
  serviceWorker?.addEventListener('controllerchange',controllerChanged);
  serviceWorker?.register('./sw.js').then(registration=>{
   void dismissLegacyNotifications(registration);
   if(!disposed)stopUpdates=watchAppUpdates(registration,setUpdateWorker);
  }).catch(()=>{});
  const timer=setInterval(()=>tick(value=>value+1),60000);
  return()=>{
   disposed=true;
   stopUpdates();
   clearInterval(timer);
   document.removeEventListener('visibilitychange',resume);
   window.removeEventListener('beforeinstallprompt',beforeInstall);
   window.removeEventListener('appinstalled',afterInstall);
   serviceWorker?.removeEventListener('controllerchange',controllerChanged);
  };
 },[]);

 useEffect(()=>{
  if(!toast)return;
  const timer=setTimeout(()=>setToast(''),6000);
  return()=>clearTimeout(timer);
 },[toast]);

 useEffect(()=>{
  if(!modal){dialog.current?.close();return;}
  if(!dialog.current?.open)dialog.current?.showModal();
  const previous=document.body.style.overflow;
  document.body.style.overflow='hidden';
  return()=>{document.body.style.overflow=previous;};
 },[modal]);

 async function remove(entry:CalorieEntry){
  setBusy(true);
  try{
   await api('records',{id:entry.id},'DELETE');
   await refresh();
   setUndoEntry(entry);
  }catch(error){
   setToast((error as Error).message);
  }finally{
   setBusy(false);
  }
 }

 async function undo(){
  if(!undoEntry)return;
  setBusy(true);
  try{
   await api('records',undoEntry,'PUT');
   await refresh();
   setUndoEntry(null);
   setToast('Entry restored.');
  }catch(error){
   setToast((error as Error).message);
  }finally{
   setBusy(false);
  }
 }

 async function install(){
  if(!installEvent)return;
  setInstallEvent(null);
  try{
   await installEvent.prompt();
   if((await installEvent.userChoice).outcome==='accepted'){
    setInstalled(true);
    setModal(null);
    setToast('Forum added to your device.');
   }
  }catch{
   // The install dialog still offers Chrome's manual instructions.
  }
 }

 return <div className="app-shell simple-layout">
  <div className="main-wrap">
   <header className="topbar">
    <a className="brand" href="./" aria-label="Forum home"><span className="brand-word" aria-hidden="true">form<span className="brand-dot">.</span></span></a>
    {!installed&&<button className="header-action" onClick={()=>setModal('install')}><Download size={17}/>Install app</button>}
   </header>
   <main>
    <section className="page-heading"><div className="page-heading-copy">
     <h1>Today</h1>
     <time dateTime={today}>{now.toLocaleDateString('en-AU',{weekday:'long',day:'numeric',month:'long',timeZone:timezone})}</time>
    </div></section>
    {updateWorker&&!modal&&!busy&&!undoEntry&&<div className="update-notice" role="status"><span>Update available</span><button disabled={updating} onClick={()=>{reloadForUpdate.current=true;setUpdating(true);updateWorker.postMessage({type:'ACTIVATE_UPDATE'});}}>{updating?'Updating…':'Refresh'}</button></div>}
    {error&&<div className="notice error" role="alert"><span>{error}</span><button onClick={openVault}>Retry</button></div>}
    {loading&&<p className="loading-note" role="status"><Loader2 size={14} className="spin"/>Opening your journal…</p>}
    {!loading&&!ready&&!error&&<button className="button primary" onClick={()=>setModal('vault')}>Open your saved entries</button>}
    {ready&&<CalorieCard entries={entries} today={today} timezone={timezone} onLog={()=>setModal('food')} onRemove={remove} busy={busy}/>}
   </main>
  </div>
  {undoEntry&&<div className="undo-notice" role="status"><span>Calorie entry deleted</span><button disabled={busy} onClick={undo}>Undo</button><button aria-label="Dismiss undo" onClick={()=>setUndoEntry(null)}><X size={16}/></button></div>}
  {toast&&<div className="toast" role="status"><Check size={17}/><span>{toast}</span><button aria-label="Dismiss message" onClick={()=>setToast('')}><X size={16}/></button></div>}
  <dialog aria-labelledby={modal ? modal+'-title' : undefined} ref={dialog} onCancel={()=>setModal(null)} onClick={event=>{if(event.target===dialog.current)setModal(null);}}>
   <div className="modal-content">
    <button className="modal-close icon-button" aria-label="Close dialog" onClick={()=>setModal(null)}><X size={20}/></button>
    {modal==='food'&&ready&&<EntryForm today={today} timezone={timezone} onSave={async entry=>{await api('records',entry);await refresh();setModal(null);setToast('Calories saved.');}}/>}
    {modal==='vault'&&<VaultForm onUnlocked={async()=>{await refresh();setError('');setModal(null);}}/>}
    {modal==='install'&&<>
     <h2 id="install-title">Install Forum</h2>
     {installEvent?<button className="button primary full" onClick={install}><Download size={17}/>Install app</button>:<p className="modal-description">In Chrome, open the menu and choose <strong>Add to Home screen</strong> or <strong>Install app</strong>.</p>}
    </>}
   </div>
  </dialog>
 </div>;
}

function CalorieCard({entries,today,timezone,onLog,onRemove,busy}:{
 entries:CalorieEntry[];
 today:string;
 timezone:string;
 onLog:()=>void;
 onRemove:(entry:CalorieEntry)=>void;
 busy:boolean;
}){
 const foods=entries.filter(entry=>entry.date===today);
 const total=foods.reduce((sum,entry)=>sum+entry.value,0);
 const timeFormat=new Intl.DateTimeFormat('en-AU',{hour:'numeric',minute:'2-digit',timeZone:timezone});
 return <section className="calorie-card">
  <div className="calorie-card-heading">
   <span className="calorie-icon"><Utensils size={19}/></span><h2>Calorie journal</h2>
  </div>
  <p className="calorie-label">Today's intake</p>
  <div className="calorie-summary">
   <strong className="calorie-total">{foods.length?fmt(total):'—'}<small> kcal</small></strong>
   <p className="calorie-count">{foods.length?`${foods.length} ${foods.length===1?'entry':'entries'} today`:'Nothing logged today'}</p>
  </div>
  <button className="button calorie-log" onClick={onLog}><Plus size={17}/>Log calories</button>
  <CalorieWeek entries={entries} today={today}/>
  {foods.length>0&&<div className="calorie-history">
   <h3>Today's entries <span>{foods.length}</span></h3>
   <div className="calorie-history-list" aria-label="Today's calorie entries">
    {foods.map(entry=><div className="journal-row" key={entry.id}>
     <div>
      <b>{entry.label||'Calories'}</b>
      <small>{entry.loggedAt?entry.loggedAt.slice(11,16):entry.createdAt?timeFormat.format(new Date(entry.createdAt)):'Today'}</small>
     </div>
     <strong>{fmt(entry.value)}<small> kcal</small></strong>
     <button className="icon-button delete" title="Delete entry" aria-label={`Delete ${fmt(entry.value)} calorie entry`} disabled={busy} onClick={()=>onRemove(entry)}><Trash2 size={17}/></button>
    </div>)}
   </div>
  </div>}
 </section>;
}

function CalorieWeek({entries,today}:{entries:CalorieEntry[];today:string}){
 const {days,average}=calorieWeek(entries,today);
 const logged=days.filter(day=>day.count>0);
 const [selectedKey,setSelectedKey]=useState<string|null>(null);
 const selected=days.find(day=>day.key===selectedKey);
 const maximum=Math.max(1,...logged.map(day=>day.total));
 return <section className="calorie-week" aria-labelledby="calorie-week-title">
  <div className="calorie-week-heading"><h3 id="calorie-week-title">Last 7 days</h3><span>{logged.length}/7 logged</span></div>
  <div className="calorie-bars" role="group" aria-label="Daily calorie totals, oldest first">
   {days.map(day=>{
    const isToday=day.key===today;
    const weekday=new Date(day.key+'T12:00:00Z').toLocaleDateString('en-AU',{weekday:'short',timeZone:'UTC'});
    const detail=day.count?fmt(day.total,0)+' kcal':'No entries';
    return <button className={isToday?'calorie-day calorie-day--today':'calorie-day'} key={day.key} type="button" aria-label={`${isToday?'Today':weekday} ${shortDate(day.key)}, ${detail}${isToday&&day.count?' so far':''}`} aria-pressed={selected?.key===day.key} onClick={()=>setSelectedKey(selected?.key===day.key?null:day.key)}>
     <span className="calorie-day-track" aria-hidden="true">{day.count>0&&<span className="calorie-day-bar" style={{height:`${day.total/maximum*100}%`}}/>}</span><span aria-hidden="true">{isToday?'Today':weekday}</span>
    </button>;
   })}
  </div>
  <p className="calorie-week-detail" aria-live="polite">{selected?<>{selected.key===today?'Today so far':shortDate(selected.key)} <strong>{selected.count?fmt(selected.total,0)+' kcal':'No entries'}</strong></>:average===null?'No completed days logged':<>Avg. on prior logged days <strong>{fmt(average,0)} kcal</strong></>}</p>
 </section>;
}
function EntryForm({today,timezone,onSave}:{timezone:string;today:string;onSave:(entry:NewEntry)=>Promise<void>}){
 const [error,setError]=useState(''),[saving,setSaving]=useState(false);
 async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();setSaving(true);setError('');const f=new FormData(e.currentTarget);try{await onSave({kind:'food',date:String(f.get('date')),time:String(f.get('time')),value:Number(f.get('value')),label:''});}catch(e){setError((e as Error).message);}finally{setSaving(false);}}
 return <form onSubmit={submit}><span className="modal-feature-icon peach"><Utensils size={26}/></span><h2 id="food-title">Log calories</h2><p className="modal-description">Just an amount and a time. Change the date for an earlier entry.</p><label>Calories (kcal)<input name="value" type="number" step="1" min={1} max={10000} placeholder="450" required autoFocus/></label><div className="form-row"><label>Date<input type="date" name="date" defaultValue={today} max={today} required/></label><label>Time<input type="time" name="time" defaultValue={new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit',hour12:false,timeZone:timezone}).format(new Date())} required/></label></div>{error&&<p className="form-error" role="alert">{error}</p>}<button className="button primary full" disabled={saving}>{saving?<Loader2 className="spin" size={17}/>:<Plus size={17}/>}Save calories</button></form>;
}
function VaultForm({onUnlocked}:{onUnlocked:()=>Promise<void>}){
 const [error,setError]=useState(''),[saving,setSaving]=useState(false);
 return <form onSubmit={async e=>{e.preventDefault();setSaving(true);setError('');try{await vault.unlock(String(new FormData(e.currentTarget).get('passphrase')));await vault.remember();await onUnlocked();}catch(e){setError((e as Error).message);}finally{setSaving(false);}}}><h2 id="vault-title">Open your saved entries</h2><p className="modal-description">Enter your old vault passphrase once to move to automatic opening. After this, Forum opens directly on this device.</p><label>Previous vault passphrase<input name="passphrase" type="password" autoComplete="current-password" required autoFocus/></label>{error&&<p className="form-error" role="alert">{error}</p>}<button className="button primary full" disabled={saving}>{saving?'Opening…':'Continue without future unlocks'}</button><p className="fine-print">Anyone using this browser can open your records. Your phone’s screen lock protects access to the device.</p></form>;
}
