'use client';
import {useEffect,useMemo,useRef,useState,type FormEvent} from 'react';
import {CircleHelp,ArrowRight,Check,Copy,Download,ExternalLink,Loader2,Pencil,Plus,RefreshCw,ShieldCheck,SlidersHorizontal,Trash2,Utensils,X} from 'lucide-react';
import {dayKey,demoEntries,type Entry} from './analysis';
import {api,isRemoteBusy,cancelWithings} from './local-api.mjs';
import {vault} from './vault.mjs';
import {deviceTimezone} from './timezone.mjs';
import {callbackUrl} from './withings.mjs';
import BodyPanel from './body-panel';
import {completedDayTotals} from './calorie-week';
import {watchAppUpdates} from './app-updates.mjs';
import {dismissLegacyNotifications} from './retire-notifications.mjs';
export type Prefs={calories:number;water:number;timezone:string};
type EntryUpdate={value:number;date?:string;time?:string};
type Conn={configured:boolean;connected:boolean;syncedAt:number|null};
const defaults:Prefs={calories:2000,water:2500,timezone:deviceTimezone()};
const fmt=(v:number|null,d=1)=>v===null?'—':v.toLocaleString('en-AU',{minimumFractionDigits:d,maximumFractionDigits:d});
const shortDate=(date:string)=>new Date(date+'T12:00:00Z').toLocaleDateString('en-AU',{day:'numeric',month:'short',timeZone:'UTC'});
export default function Dashboard(){
 const [entries,setEntries]=useState<Entry[]>([]),[prefs,setPrefs]=useState(defaults),[conn,setConn]=useState<Conn>({configured:false,connected:false,syncedAt:null});
 const [loading,setLoading]=useState(true),[demo,setDemo]=useState(false),[modal,setModal]=useState<'food'|'weight'|'settings'|'vault'|null>(null),[toast,setToast]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[ready,setReady]=useState(false);
 const [editingCalories,setEditingCalories]=useState<Entry|null>(null),[editingWeights,setEditingWeights]=useState<Entry[]>([]);
 const [undoEntry,setUndoEntry]=useState<Entry|null>(null),[syncError,setSyncError]=useState('');
 const [syncing,setSyncing]=useState(false),[updateWorker,setUpdateWorker]=useState<ServiceWorker|null>(null),[updating,setUpdating]=useState(false);
 const reloadForUpdate=useRef(false);
 useEffect(()=>{if(!('serviceWorker' in navigator))return;const changed=()=>{if(reloadForUpdate.current)window.location.reload();};navigator.serviceWorker.addEventListener('controllerchange',changed);return()=>navigator.serviceWorker.removeEventListener('controllerchange',changed);},[]);
 const [installed,setInstalled]=useState(()=>window.matchMedia('(display-mode: standalone)').matches);
 useEffect(()=>{const done=()=>setInstalled(true);window.addEventListener('appinstalled',done);return()=>window.removeEventListener('appinstalled',done);},[]);
 const [vaultExists,setVaultExists]=useState(false),[installEvent,setInstallEvent]=useState<any>(null);
 const dialog=useRef<HTMLDialogElement>(null),syncAttempt=useRef(false);
 const [,tick]=useState(0);useEffect(()=>{const timer=setInterval(()=>tick(n=>n+1),60000);return()=>clearInterval(timer);},[]);
 const today=dayKey(new Date(),prefs.timezone);
 const active=useMemo(()=>demo?demoEntries(today):entries,[demo,entries,today]);
 async function refresh(){const d=await api('data');setEntries(d.entries);setPrefs(d.preferences);setConn(d.withings);setReady(true);return d;}
 useEffect(()=>{vault.open().then(async(open:boolean)=>{setVaultExists(true);if(open){const d=await refresh();setDemo(!d.entries.some((e:Entry)=>e.kind==='weight'||e.kind==='bodyFat')&&!d.withings.connected);}else{setDemo(true);setModal('vault');}}).catch((e:Error)=>setError(e.message)).finally(()=>setLoading(false));
  const resume=()=>{if(document.visibilityState==='visible'&&!isRemoteBusy())vault.open().then((open:boolean)=>{if(open)refresh().catch(()=>{});}).catch(()=>{});};document.addEventListener('visibilitychange',resume);
  const fn=(e:Event)=>{e.preventDefault();setInstallEvent(e);};window.addEventListener('beforeinstallprompt',fn);
  let stopUpdates=()=>{},disposed=false;
  if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').then(reg=>{dismissLegacyNotifications(reg);if(!disposed)stopUpdates=watchAppUpdates(reg,setUpdateWorker);}).catch(()=>{});
  return()=>{disposed=true;stopUpdates();window.removeEventListener('beforeinstallprompt',fn);document.removeEventListener('visibilitychange',resume);};
 },[]);
 useEffect(()=>{if(conn.connected&&navigator.onLine&&(!conn.syncedAt||Date.now()-conn.syncedAt>3600000)&&!syncAttempt.current){syncAttempt.current=true;sync();}},[conn.connected,conn.syncedAt]);
 useEffect(()=>{if(!toast)return;const t=setTimeout(()=>setToast(''),6000);return()=>clearTimeout(t);},[toast]);
 useEffect(()=>{if(modal){if(dialog.current&&!dialog.current.open)dialog.current.showModal();}else dialog.current?.close();if(modal==='settings'){const heading=dialog.current?.querySelector<HTMLElement>('.modal-toolbar h2');heading?.focus();const body=dialog.current?.querySelector('.modal-body');if(body)body.scrollTop=0;}},[modal]);
 useEffect(()=>{if(!modal)return;const previous=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=previous;};},[modal]);
 async function sync(){if(syncing)return;setSyncError('');setSyncing(true);try{await api('withings/sync',{});await refresh();setDemo(false);}catch(e){setSyncError((e as Error).message);}finally{setSyncing(false);}}
 async function saveCalorie(update:EntryUpdate){
  if(editingCalories)await api('records',{...update,id:editingCalories.id},'PATCH');
  else await api('records',{...update,kind:'food'});
  await refresh();
  setModal(null);
  setToast(editingCalories?'Calorie entry updated.':'Calories saved.');
 }
 async function saveWeight(id:string,value:number){
  await api('records',{id,value},'PATCH');
  await refresh();
  setModal(null);
  setToast('Weight reading updated.');
 }
 async function remove(e:Entry){if(e.source==='withings')return;setBusy(true);try{await api('records',{id:e.id},'DELETE');await refresh();setUndoEntry(e);}catch(e){setToast((e as Error).message);}finally{setBusy(false);}}
 return <div className="app-shell simple-layout">
  <div className="main-wrap">
   <header className="topbar"><a className="brand" href="./" aria-label="Forum home"><span className="brand-word" aria-hidden="true">form<span className="brand-dot">.</span></span></a><div className="header-actions"><button className="header-action" aria-label="Open settings" title="Settings" onClick={()=>setModal('settings')}><SlidersHorizontal size={19}/><span>Settings</span></button></div></header>
   <main>
    <section className="page-heading"><div className="page-heading-copy"><h1>Today</h1><time dateTime={today}>{new Date().toLocaleDateString('en-AU',{weekday:'long',day:'numeric',month:'long',timeZone:prefs.timezone})}</time></div><div className="sync-area"><button className="page-sync-action" title={conn.connected?"Sync Withings":"Connect Withings"} onClick={conn.connected?()=>sync():()=>setModal('settings')} disabled={syncing||loading} aria-label={conn.connected?(syncing?'Syncing Withings measurements':'Sync Withings measurements'):'Connect Withings'}><RefreshCw size={17} className={syncing?'spin':''}/>{!conn.connected&&<span>Connect</span>}</button><span className="sync-status" role="status">{loading||!conn.connected?'':syncError?'Sync failed':syncing?'Syncing…':conn.syncedAt?Date.now()-conn.syncedAt<60000?'Synced just now':`Synced ${dayKey(new Date(conn.syncedAt),prefs.timezone)===today?new Date(conn.syncedAt).toLocaleTimeString('en-AU',{hour:'numeric',minute:'2-digit'}):new Date(conn.syncedAt).toLocaleDateString('en-AU',{day:'numeric',month:'short'})}`:'Not synced yet'}</span></div></section>
    {syncError&&<div className="notice error" role="alert"><span>{syncError}</span><button disabled={syncing} onClick={()=>sync()}>Retry sync</button></div>}
    {updateWorker&&!modal&&!busy&&!syncing&&!undoEntry&&<div className="update-notice" role="status"><span>Update available</span><button disabled={updating} onClick={()=>{reloadForUpdate.current=true;setUpdating(true);updateWorker.postMessage({type:'ACTIVATE_UPDATE'});}}>{updating?'Updating…':'Refresh'}</button></div>}
    {error&&<div className="notice error"><CircleHelp size={18}/><span>{error}</span><button onClick={()=>{setLoading(true);refresh().then(()=>{setError('');setDemo(false);}).catch(e=>setError(e.message)).finally(()=>setLoading(false));}}>Retry</button></div>}
    {loading&&<p className="loading-note"><Loader2 size={14} className="spin"/>Opening your space…</p>}
    {demo&&<div className="demo-banner"><span><span className="demo-dot"/><b>Demo preview</b><span className="demo-description">Sample measurements, not your health data.</span></span><button onClick={()=>{setDemo(false);setModal(!ready?'vault':'settings');}}>Use my data<ArrowRight size={15}/></button></div>}
    <Overview entries={active} logEntries={entries} prefs={prefs} today={today} busy={busy} demo={demo} ready={ready} onLog={()=>{setEditingCalories(null);setModal('food');}} onRemove={remove}
      onEditCalories={entry=>{setEditingCalories(entry);setModal('food');}}
      onEditWeight={readings=>{setEditingWeights(readings);setModal('weight');}} connected={conn.connected}/>
   </main>
  </div>
  {undoEntry&&<div className="undo-notice" role="status"><span>Calorie entry deleted</span><button disabled={busy} onClick={async()=>{setBusy(true);try{await api('records',{kind:'food',date:undoEntry.date,time:undoEntry.loggedAt?.slice(11,16)||new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit',hour12:false,timeZone:prefs.timezone}).format(new Date(undoEntry.createdAt||Date.now())),value:undoEntry.value,label:undoEntry.label||''});await refresh();setUndoEntry(null);setToast('Entry restored.');}catch(e){setToast((e as Error).message);}finally{setBusy(false);}}}>Undo</button><button aria-label="Dismiss undo" onClick={()=>setUndoEntry(null)}><X size={16}/></button></div>}
  {toast&&<div className="toast" role="status"><Check size={17}/><span>{toast}</span><button aria-label="Dismiss message" onClick={()=>setToast('')}><X size={16}/></button></div>}
  <dialog className={modal==='settings'?'settings-panel':undefined} aria-labelledby={modal==='settings'?'settings-title':modal==='weight'||modal==='food'?'entry-title':undefined} ref={dialog} onCancel={()=>setModal(null)} onClick={e=>{if(e.target===dialog.current)setModal(null);}}><div className="modal-content">{modal==='settings'&&<header className="modal-toolbar"><h2 id="settings-title" tabIndex={-1}>Settings</h2></header>}<button className="modal-close icon-button" aria-label="Close dialog" onClick={()=>setModal(null)}><X size={20}/></button>
   <div className="modal-body">
   {modal==='food'&&ready&&<EntryForm key={editingCalories?.id??'new'} today={today} timezone={prefs.timezone} entry={editingCalories} onSave={saveCalorie}/>}
   {modal==='weight'&&ready&&<WeightEditForm entries={editingWeights} timezone={prefs.timezone} onSave={saveWeight}/>}
   {modal==='vault'&&<VaultForm exists={vaultExists} onUnlocked={async()=>{setVaultExists(true);const d=await refresh();setDemo(!d.entries.some((e:Entry)=>e.kind==='weight'||e.kind==='bodyFat')&&!d.withings.connected);setError('');setModal(null);}}/>}
   {modal==='settings'&&<>
    <section className="settings-section" aria-labelledby="withings-title">
     <h3 id="withings-title">Withings</h3>
     <ConnectForm conn={conn} onSync={sync} busy={syncing} onChange={async()=>{await refresh();}} ready={ready} onMessage={setToast}/>
    </section>
    {!installed&&<section className="settings-section settings-install" aria-labelledby="install-title">
     <h3 id="install-title">Install Forum</h3>
     {installEvent?<button className="button secondary" onClick={async()=>{await installEvent.prompt();const result=await installEvent.userChoice;if(result.outcome==='accepted'){setInstalled(true);setInstallEvent(null);setModal(null);setToast('Forum added to your device.');}}}><Download size={17}/>Install Forum</button>:<p className="modal-description">In Chrome, open the menu and choose <strong>Add to Home screen</strong> or <strong>Install app</strong>.</p>}
    </section>}
   </>}
  </div></div></dialog>
 </div>;
}
export function Overview({entries,logEntries,prefs,today,busy,demo,ready,onLog,onRemove,onEditCalories,onEditWeight,connected}:{entries:Entry[];logEntries:Entry[];prefs:Prefs;today:string;busy:boolean;demo:boolean;ready:boolean;onLog:()=>void;onRemove:(entry:Entry)=>void;onEditCalories:(entry:Entry)=>void;onEditWeight:(entries:Entry[])=>void;connected:boolean}){
 return <div className="overview-grid">
  <BodyPanel entries={entries} today={today} demo={demo} connected={connected} onEdit={onEditWeight}/>
  {ready&&<CalorieCard entries={logEntries} today={today} timezone={prefs.timezone} onLog={onLog} onRemove={onRemove} onEdit={onEditCalories} busy={busy}/>}
 </div>;
}
function entryTime(entry:Entry,timezone:string){
 if(entry.loggedAt)return entry.loggedAt.slice(11,16);
 if(!entry.createdAt)return '';
 return new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit',hourCycle:'h23',timeZone:timezone}).format(new Date(entry.createdAt));
}
type CalorieActions={timezone:string;busy:boolean;onEdit:(entry:Entry)=>void;onRemove:(entry:Entry)=>void};
export function CalorieCard({entries,today,onLog,...actions}:CalorieActions&{entries:Entry[];today:string;onLog:()=>void}){
 const history=entries.filter(e=>e.kind==='food').sort((a,b)=>b.date.localeCompare(a.date)||(b.loggedAt||'').localeCompare(a.loggedAt||'')||(b.createdAt||0)-(a.createdAt||0));
 const foods=history.filter(e=>e.date===today),total=foods.reduce((sum,entry)=>sum+entry.value,0);
 return <section className="calorie-card">
  <div className="calorie-card-heading"><span className="calorie-icon"><Utensils size={19}/></span><h2>Calorie journal</h2></div>
  <p className="calorie-label">Today's intake</p>
  <div className="calorie-summary"><strong className="calorie-total">{foods.length?fmt(total,0):'—'}<small> kcal</small></strong><p className="calorie-count">{foods.length?`${foods.length} ${foods.length===1?'entry':'entries'} today`:'Nothing logged today'}</p></div>
  <button className="button calorie-log" onClick={onLog}><Plus size={17}/>Log calories</button>
  {foods.length>0&&<CalorieEntries entries={foods} title="Today's entries" {...actions}/>}
  <CalorieWeek entries={history} today={today} {...actions}/>
 </section>;
}
function CalorieEntries({entries,title,timezone,onEdit,onRemove,busy}:CalorieActions&{entries:Entry[];title:string}){
 return <div className="calorie-history">
  <h3>{title} <span>{entries.length}</span></h3>
  <div className="calorie-history-list" aria-label={title}>
   {entries.map(entry=>{
    const time=entryTime(entry,timezone);
    const amount=fmt(entry.value,0);
    return <div className="journal-row" key={entry.id}>
     <div><b>{entry.label||'Calories'}</b>{time&&<small>{time}</small>}</div>
     <strong>{amount}<small> kcal</small></strong>
     {entry.source==='manual'&&<button type="button" className="icon-button entry-edit" title="Edit entry" aria-label={`Edit ${amount} calorie entry${time?' at '+time:''}`} disabled={busy} onClick={()=>onEdit(entry)}><Pencil size={16}/></button>}
     <button type="button" className="icon-button delete" title="Delete entry" aria-label={`Delete ${amount} calorie entry`} disabled={busy} onClick={()=>onRemove(entry)}><Trash2 size={17}/></button>
    </div>;
   })}
  </div>
 </div>;
}
function CalorieWeek({entries,today,...actions}:CalorieActions&{entries:Entry[];today:string}){
 const week=completedDayTotals(entries,today).reverse();
 const logged=week.filter(day=>day.count>0);
 const [selectedKey,setSelectedKey]=useState<string|null>(null);
 const selected=week.find(day=>day.key===selectedKey);
 const maximum=Math.max(1,...logged.map(day=>day.total));
 const average=logged.length?logged.reduce((sum,day)=>sum+day.total,0)/logged.length:null;
 return <section className="calorie-week" aria-labelledby="calorie-week-title">
  <div className="calorie-week-heading"><h3 id="calorie-week-title">Previous 7 days</h3><span>{logged.length}/7 logged</span></div>
  <div className="calorie-bars" role="group" aria-label="Daily calorie totals, oldest first">
   {week.map(day=>{
    const weekday=new Date(day.key+'T12:00:00Z').toLocaleDateString('en-AU',{weekday:'short',timeZone:'UTC'});
    const detail=day.count?fmt(day.total,0)+' kcal':'No entries';
    return <button className="calorie-day" key={day.key} type="button" aria-label={`${weekday} ${shortDate(day.key)}, ${detail}`} aria-pressed={selected?.key===day.key} onClick={()=>setSelectedKey(selected?.key===day.key?null:day.key)}>
     <span className="calorie-day-track" aria-hidden="true">{day.count>0&&<span className="calorie-day-bar" style={{height:`${day.total/maximum*100}%`}}/>}</span><span aria-hidden="true">{weekday}</span>
    </button>;
   })}
  </div>
  <p className="calorie-week-detail" aria-live="polite">{selected?<>{shortDate(selected.key)} <strong>{selected.count?fmt(selected.total,0)+' kcal':'No entries'}</strong></>:average===null?'No entries this week':<>Average on logged days <strong>{fmt(average,0)} kcal</strong></>}</p>
  {selected&&selected.count>0&&<CalorieEntries entries={entries.filter(entry=>entry.date===selected.key)} title={`Entries for ${shortDate(selected.key)}`} {...actions}/>}
 </section>;
}
function EntryForm({today,timezone,entry,onSave}:{timezone:string;today:string;entry:Entry|null;onSave:(update:EntryUpdate)=>Promise<void>}){
 const [error,setError]=useState(''),[saving,setSaving]=useState(false);
 const defaultTime=entry?entryTime(entry,timezone):new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit',hourCycle:'h23',timeZone:timezone}).format(new Date());
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  setSaving(true);
  setError('');
  const data=new FormData(event.currentTarget);
  try{await onSave({value:Number(data.get('value')),date:String(data.get('date')),time:String(data.get('time'))||undefined});}
  catch(e){setError((e as Error).message);}
  finally{setSaving(false);}
 }
 return <form onSubmit={submit}>
  <span className="modal-feature-icon peach"><Utensils size={26}/></span>
  <h2 id="entry-title">{entry?'Edit calories':'Log calories'}</h2>
  <label>Calories (kcal)<input name="value" type="number" step={entry?"any":1} min={1} max={10000} placeholder="450" defaultValue={entry?.value} required autoFocus/></label>
  <div className="form-row">
   <label>Date<input type="date" name="date" defaultValue={entry?.date??today} max={today} required/></label>
   <label>Time<input type="time" name="time" defaultValue={defaultTime} required={!entry||!!defaultTime}/></label>
  </div>
  {error&&<p className="form-error" role="alert">{error}</p>}
  <button className="button primary full" disabled={saving}>{saving?<Loader2 className="spin" size={17}/>:entry?<Check size={17}/>:<Plus size={17}/>} {entry?'Save changes':'Save calories'}</button>
 </form>;
}
function WeightEditForm({entries,timezone,onSave}:{entries:Entry[];timezone:string;onSave:(id:string,value:number)=>Promise<void>}){
 const [entryId,setEntryId]=useState(entries[0].id);
 const [error,setError]=useState(''),[saving,setSaving]=useState(false);
 const entry=entries.find(reading=>reading.id===entryId)!;
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  setSaving(true);
  setError('');
  const value=Number(new FormData(event.currentTarget).get('value'));
  try{await onSave(entryId,value);}
  catch(e){setError((e as Error).message);}
  finally{setSaving(false);}
 }
 return <form onSubmit={submit}>
  <span className="modal-feature-icon"><Pencil size={24}/></span>
  <h2 id="entry-title">Edit weight reading</h2>
  <p className="modal-description">{shortDate(entry.date)}{entry.source==='withings'?' · Withings correction on this device':''}</p>
  {entries.length>1&&<label>Reading<select value={entryId} disabled={saving} onChange={event=>{setEntryId(event.target.value);setError('');}}>
   {entries.map((reading,index)=><option key={reading.id} value={reading.id}>{entryTime(reading,timezone)||`Reading ${index+1}`} · {reading.value.toLocaleString('en-AU',{maximumFractionDigits:3})} kg · {reading.source==='withings'?'Withings':reading.source==='csv'?'Imported':'Manual'}</option>)}
  </select></label>}
  <label>Weight (kg)<input key={entryId} name="value" type="number" min={20} max={400} step="any" defaultValue={entry.value} required autoFocus/></label>
  {error&&<p className="form-error" role="alert">{error}</p>}
  <button className="button primary full" disabled={saving}>{saving?<Loader2 className="spin" size={17}/>:<Check size={17}/>} Save changes</button>
 </form>;
}
function ConnectForm({conn,onSync,busy,onChange,onMessage,ready}:{conn:Conn;onSync:()=>void;busy:boolean;onChange:()=>Promise<void>;onMessage:(s:string)=>void;ready:boolean}){
 const [error,setError]=useState(''),[saving,setSaving]=useState(false),[edit,setEdit]=useState(false),[confirm,setConfirm]=useState(false);
 const callback=callbackUrl();
 async function connect(){setSaving(true);setError('');try{await api('withings/connect',{});await onChange();onMessage('Withings connected. Tap Sync to fetch your measurements.');}catch(e){setError((e as Error).message);}finally{setSaving(false);}}
 return <><p className="modal-description">Sync weight and body fat from your scale. Forum reads your last 90 days of measurements.</p>
 {conn.connected&&!edit?<><div className="connection-status"><span className="connected-dot"/><div><b>Withings is connected</b><small>{conn.syncedAt?'Last synced '+new Date(conn.syncedAt).toLocaleString('en-AU'):'Ready to import your measurements'}</small></div><Check size={18}/></div><button className="button primary full" disabled={busy} onClick={onSync}><RefreshCw size={17} className={busy?'spin':''}/>{busy?'Syncing…':'Sync last 90 days'}</button><p className="fine-print">Forum checks for new readings when opened after an hour. Your scale must sync to Withings first.</p><div className="connection-links"><button disabled={saving} onClick={connect}>{saving?'Connecting…':'Reconnect'}</button><button onClick={()=>setConfirm(true)}>Disconnect</button></div>{confirm&&<div className="setup-step"><b>Disconnect Withings?</b><p>This removes the connection and credentials from this device’s storage. Imported measurements stay in your history. You can also revoke Forum in your Withings account.</p><button className="button danger" disabled={saving} onClick={async()=>{setSaving(true);try{await api('withings/disconnect',{});await onChange();onMessage('Withings disconnected.');setConfirm(false);}catch(e){setError((e as Error).message);}finally{setSaving(false);}}}>Disconnect</button></div>}</>:<>
 <div className="setup-step"><span className="step-number">1</span><div><b>Create your Withings developer app</b><p>Register a personal app and use the callback URL below. Withings will give you a Client ID and Client Secret.</p><a href="https://developer.withings.com/dashboard/" target="_blank" rel="noreferrer">Open Withings dashboard<ExternalLink size={13}/></a></div></div>
 <label>Callback URL<div className="copy-field"><input value={callback} readOnly aria-label="Withings callback URL"/><button type="button" aria-label="Copy callback URL" onClick={()=>navigator.clipboard.writeText(callback).then(()=>onMessage('Callback URL copied.')).catch(()=>onMessage('Select the callback URL and copy it.'))}><Copy size={16}/></button></div></label>
 <div className="setup-step"><span className="step-number">2</span><div><b>{conn.configured?'Authorise your account':'Save your app credentials'}</b><p>{conn.configured?'Your credentials are saved locally. Continue to Withings to grant access.':'These stay in your browser on this device. Your Withings account password is entered only on Withings’ own login page.'}</p></div></div>
 {conn.configured&&!edit?<><button className="button primary full" disabled={saving||!ready} onClick={connect}>{saving?<Loader2 size={17} className="spin"/>:<ArrowRight size={17}/>} {saving?'Complete login in the Withings window…':'Connect Withings'}</button><button className="text-button centered" onClick={()=>setEdit(true)}>Replace app credentials</button></>:<form onSubmit={async e=>{e.preventDefault();setSaving(true);setError('');const f=new FormData(e.currentTarget);try{await api('withings/configure',{clientId:f.get('clientId'),clientSecret:f.get('clientSecret')});await onChange();setEdit(false);onMessage('Credentials saved. You can now connect Withings.');}catch(e){setError((e as Error).message);}finally{setSaving(false);}}}><label>Client ID<input name="clientId" autoComplete="off" placeholder="From the Withings developer dashboard" required minLength={8}/></label><label>Client Secret<input name="clientSecret" type="password" autoComplete="new-password" placeholder="Saved on this device" required minLength={8}/></label><button className="button primary full" disabled={saving||!ready}>{saving?<Loader2 className="spin" size={17}/>:<ShieldCheck size={17}/>}Save credentials</button></form>}
 </>}{saving&&<button className="text-button centered" onClick={cancelWithings}>Cancel connection</button>}{error&&<p className="form-error" role="alert">{error}</p>}<p className="fine-print"><ShieldCheck size={13}/>Connection details stay on this device. Keep Forum open during login.</p></>;
}
function VaultForm({onUnlocked}:{exists:boolean;onUnlocked:()=>Promise<void>}){
 const [error,setError]=useState(''),[saving,setSaving]=useState(false);
 return <form onSubmit={async e=>{e.preventDefault();setSaving(true);setError('');try{await vault.unlock(String(new FormData(e.currentTarget).get('passphrase')));await vault.remember();await onUnlocked();}catch(e){setError((e as Error).message);}finally{setSaving(false);}}}><h2>Keep your existing records.</h2><p className="modal-description">Enter your old vault passphrase once to move to automatic opening. After this, Forum opens directly on this device.</p><label>Previous vault passphrase<input name="passphrase" type="password" autoComplete="current-password" required autoFocus/></label>{error&&<p className="form-error" role="alert">{error}</p>}<button className="button primary full" disabled={saving}>{saving?'Opening…':'Continue without future unlocks'}</button><p className="fine-print">Anyone using this browser can open your records. Your phone’s screen lock protects access to the device.</p></form>;
}
