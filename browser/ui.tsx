import {useEffect,useRef,useState,type FormEvent} from 'react';
import {CalendarDays,Check,ChevronLeft,ChevronRight,Download,Loader2,Plus,Trash2,X} from 'lucide-react';
import {api,dateKey,FIRST_LOG_DATE} from './local-api.mjs';
import {vault} from './vault.mjs';
import {deviceTimezone} from './timezone.mjs';
import {calorieWeek,journalWeekEnd,shiftDay,type CalorieEntry} from './calorie-week';
import {watchAppUpdates} from './app-updates.mjs';
import {dismissLegacyNotifications} from './retire-notifications.mjs';

type NewEntry = {kind:'food';date:string;time:string;value:number;label:string};
type InstallEvent = Event & {
 prompt(): Promise<void>;
 userChoice: Promise<{outcome:'accepted'|'dismissed'}>;
};
type Modal = 'food'|'install'|'vault';
const fmt=(value:number)=>value.toLocaleString('en-AU',{maximumFractionDigits:0});
const shortDate=(date:string)=>new Date(date+'T12:00:00Z').toLocaleDateString('en-AU',{day:'numeric',month:'short',timeZone:'UTC'});

export default function Dashboard(){
 const [entries,setEntries]=useState<CalorieEntry[]>([]);
 const [selectedDate,setSelectedDate]=useState<string|null>(null);
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
 const day=selectedDate&&selectedDate<=today?selectedDate:today;
 const dailyEntries=entries.filter(entry=>entry.date===day);
 const dailyTotal=dailyEntries.reduce((total,entry)=>total+entry.value,0);
 const week=calorieWeek(entries,journalWeekEnd(day,today),today);
 const selectDay=(date:string)=>setSelectedDate(date===today?null:date);

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
  if(modal==='food')dialog.current?.querySelector<HTMLInputElement>('input[name="value"]')?.focus();
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
    setToast('Form added to your device.');
   }
  }catch{
   // The install dialog still offers Chrome's manual instructions.
  }
 }

 return <div className="app-shell">
  <div className="main-wrap">
   <header className="topbar">
    <a className="brand" href="./" aria-label="Form home"><span className="brand-word" aria-hidden="true">form<span className="brand-dot">.</span></span></a>
    {!installed&&<button className="header-action" onClick={()=>setModal('install')}><Download size={17}/>Install app</button>}
   </header>
   <main>
    {updateWorker&&!modal&&!busy&&!undoEntry&&<div className="update-notice" role="status"><span>Update available</span><button disabled={updating} onClick={()=>{reloadForUpdate.current=true;setUpdating(true);updateWorker.postMessage({type:'ACTIVATE_UPDATE'});}}>{updating?'Updating…':'Refresh'}</button></div>}
    {error&&<div className="notice error" role="alert"><span>{error}</span><button onClick={openVault}>Retry</button></div>}
    {loading&&<p className="loading-note" role="status"><Loader2 size={14} className="spin"/>Opening your journal…</p>}
    {!loading&&!ready&&!error&&<button className="button primary" onClick={()=>setModal('vault')}>Open your saved entries</button>}
    {ready&&<>
     <DaySummary day={day} today={today} total={dailyTotal} onSelect={selectDay} onLog={()=>setModal('food')}/>
     <CalorieWeek week={week} selectedDay={day} today={today} onSelect={selectDay}/>
     <DayEntries entries={dailyEntries} day={day} today={today} timezone={timezone} busy={busy} onRemove={remove}/>
    </>}
   </main>
  </div>
  {undoEntry&&<div className="undo-notice" role="status"><span>Calorie entry deleted</span><button disabled={busy} onClick={undo}>Undo</button><button aria-label="Dismiss undo" onClick={()=>setUndoEntry(null)}><X size={16}/></button></div>}
  {toast&&<div className="toast" role="status"><Check size={17}/><span>{toast}</span><button aria-label="Dismiss message" onClick={()=>setToast('')}><X size={16}/></button></div>}
  <dialog className={modal==='food'?'log-sheet':undefined} aria-labelledby={modal ? modal+'-title' : undefined} ref={dialog} onCancel={()=>setModal(null)} onClick={event=>{if(event.target===dialog.current)setModal(null);}}>
   <div className="modal-content">
    <button className="modal-close icon-button" aria-label="Close dialog" onClick={()=>setModal(null)}><X size={20}/></button>
    {modal==='food'&&ready&&<EntryForm day={day} today={today} timezone={timezone} onSave={async entry=>{await api('records',entry);await refresh();selectDay(entry.date);setModal(null);setToast('Entry saved.');}}/>}
    {modal==='vault'&&<VaultForm onUnlocked={async()=>{await refresh();setError('');setModal(null);}}/>}
    {modal==='install'&&<>
     <h2 id="install-title">Install Form</h2>
     {installEvent?<button className="button primary full" onClick={install}><Download size={17}/>Install app</button>:<p className="modal-description">In Chrome, open the menu and choose <strong>Add to Home screen</strong> or <strong>Install app</strong>.</p>}
    </>}
   </div>
  </dialog>
 </div>;
}

type Week = ReturnType<typeof calorieWeek>;

function DaySummary({day,today,total,onSelect,onLog}:{
 day:string;
 today:string;
 total:number;
 onSelect:(day:string)=>void;
 onLog:()=>void;
}){
 const current=day===today;
 const date=new Date(day+'T12:00:00Z');
 const title=current?'Today':date.toLocaleDateString('en-AU',{weekday:'long',timeZone:'UTC'});
 const dateLabel=date.toLocaleDateString('en-AU',{day:'numeric',month:'long',year:date.getUTCFullYear()!==Number(today.slice(0,4))?'numeric':undefined,timeZone:'UTC'});
 return <section className="day-summary" aria-labelledby="day-title">
  <div className="day-heading">
   <div className="day-title-group">
    <h1 id="day-title">{title}</h1>
    <label className="date-picker">
     <span aria-hidden="true">{dateLabel}<CalendarDays size={14}/></span>
     <input type="date" aria-label="Choose a journal date" value={day} min={FIRST_LOG_DATE} max={today}
      onInput={event=>{
       const next=event.currentTarget.value;
       if(next>=FIRST_LOG_DATE&&next<=today)onSelect(next);
      }}
      onClick={event=>{if(event.currentTarget.showPicker)event.currentTarget.showPicker();}}/>
    </label>
   </div>
   <div className="day-nav" role="group" aria-label="Browse days">
    <button type="button" className="icon-button" aria-label="Previous day" disabled={day===FIRST_LOG_DATE} onClick={()=>onSelect(shiftDay(day,-1))}><ChevronLeft size={22}/></button>
    <button type="button" className="icon-button" aria-label="Next day" disabled={current} onClick={()=>onSelect(shiftDay(day,1))}><ChevronRight size={22}/></button>
   </div>
  </div>
  <div className="day-total" aria-live="polite">
   <span className="total-label">Calories logged</span>
   <p><strong>{fmt(total)}</strong><span>kcal</span></p>
  </div>
  <div className="day-actions">
   <button className="button primary log-button" type="button" onClick={onLog}><Plus size={21}/>Log calories</button>
   {!current&&<button className="button secondary" type="button" onClick={()=>onSelect(today)}>Back to today</button>}
  </div>
 </section>;
}

function CalorieWeek({week,selectedDay,today,onSelect}:{week:Week;selectedDay:string;today:string;onSelect:(day:string)=>void}){
 const {days,average}=week;
 const maximum=Math.max(1,...days.map(day=>day.total));
 return <section className="journal-panel calorie-week" aria-labelledby="calorie-week-title">
  <div className="panel-heading">
   <h2 id="calorie-week-title">{days.at(-1)?.key===today?'Last 7 days':'7-day intake'}</h2>
   <span className="week-range">{shortDate(days[0].key)} – {shortDate(days[6].key)}</span>
  </div>
  <div className="calorie-bars" role="group" aria-label="Daily totals, oldest first">
   {days.map(day=>{
    const current=day.key===today;
    const weekday=new Date(day.key+'T12:00:00Z').toLocaleDateString('en-AU',{weekday:'short',timeZone:'UTC'});
    const detail=day.count?fmt(day.total)+' kcal':'No entries';
    return <button className="calorie-day" key={day.key} type="button"
     data-today={current} aria-pressed={selectedDay===day.key} disabled={day.key<FIRST_LOG_DATE}
     aria-label={(current?'Today, ':weekday+' ')+shortDate(day.key)+', '+detail}
     onClick={()=>onSelect(day.key)}>
     <span className="calorie-track" aria-hidden="true">
      {day.count>0?<span className="calorie-bar" style={{height:(day.total/maximum*100)+'%'}}/>:<span className="calorie-empty"/>}
     </span>
     <span aria-hidden="true">{current?'Today':weekday}</span>
    </button>;
   })}
  </div>
  {average!==null&&<p className="week-average"><span>Average per completed logged day</span><strong>{fmt(average)} kcal</strong></p>}
 </section>;
}

function DayEntries({entries,day,today,timezone,busy,onRemove}:{
 entries:CalorieEntry[];
 day:string;
 today:string;
 timezone:string;
 busy:boolean;
 onRemove:(entry:CalorieEntry)=>void;
}){
 const timeOptions={hour:'numeric',minute:'2-digit'} as const;
 const clock=new Intl.DateTimeFormat('en-AU',{...timeOptions,timeZone:timezone});
 const savedTime=new Intl.DateTimeFormat('en-AU',{...timeOptions,timeZone:'UTC'});
 return <section className="journal-panel day-entries" aria-labelledby="entries-title">
  <div className="panel-heading"><h2 id="entries-title">Entries</h2>
   {entries.length>0&&<span>{entries.length} {entries.length===1?'entry':'entries'}</span>}
  </div>
  {entries.length>0?<ul className="entry-list">
   {entries.map(entry=>{
    const time=entry.loggedAt?savedTime.format(new Date(entry.loggedAt+'Z')):entry.createdAt?clock.format(new Date(entry.createdAt)):'';
    return <li className="entry-row" key={entry.id}>
     <div className="entry-description">
      {entry.label&&<strong>{entry.label}</strong>}
      <span>{time||(entry.label?'':'Calories')}</span>
     </div>
     <strong className="entry-value">{fmt(entry.value)} <span>kcal</span></strong>
     <button className="icon-button delete-button" type="button" title="Delete entry"
      aria-label={'Delete '+fmt(entry.value)+' calorie entry'+(time?' at '+time:'')}
      disabled={busy} onClick={()=>onRemove(entry)}><Trash2 size={17}/></button>
    </li>;
   })}
  </ul>:<p className="entries-empty">{day===today?'Nothing logged today.':'Nothing logged for this day.'}</p>}
 </section>;
}

function EntryForm({day,today,timezone,onSave}:{
 day:string;
 today:string;
 timezone:string;
 onSave:(entry:NewEntry)=>Promise<void>;
}){
 const [error,setError]=useState('');
 const [saving,setSaving]=useState(false);
 const currentTime=new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit',hourCycle:'h23',timeZone:timezone}).format(new Date());
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  if(saving)return;
  setSaving(true);
  setError('');
  const fields=new FormData(event.currentTarget);
  try{
   await onSave({
    kind:'food',
    date:String(fields.get('date')),
    time:String(fields.get('time')),
    value:Number(fields.get('value')),
    label:'',
   });
  }catch(error){
   setError((error as Error).message);
  }finally{
   setSaving(false);
  }
 }
 return <form onSubmit={submit}>
  <h2 id="food-title">Log calories</h2>
  <label className="amount-field">Amount
   <span className="amount-input">
    <input name="value" type="number" inputMode="numeric" step="1" min={1} max={10000} placeholder="0" required/>
    <span>kcal</span>
   </span>
  </label>
  <div className="form-row">
   <label>Date<input type="date" name="date" defaultValue={day} min={FIRST_LOG_DATE} max={today} required/></label>
   <label>Time<input type="time" name="time" defaultValue={currentTime} required/></label>
  </div>
  {error&&<p className="form-error" role="alert">{error}</p>}
  <button className="button primary full" disabled={saving}>{saving&&<Loader2 className="spin" size={17}/>}{saving?'Saving…':'Save entry'}</button>
 </form>;
}
function VaultForm({onUnlocked}:{onUnlocked:()=>Promise<void>}){
 const [error,setError]=useState(''),[saving,setSaving]=useState(false);
 return <form onSubmit={async e=>{e.preventDefault();setSaving(true);setError('');try{await vault.unlock(String(new FormData(e.currentTarget).get('passphrase')));await vault.remember();await onUnlocked();}catch(e){setError((e as Error).message);}finally{setSaving(false);}}}><h2 id="vault-title">Open your saved entries</h2><p className="modal-description">Enter your old vault passphrase once to move to automatic opening. After this, Form opens directly on this device.</p><label>Previous vault passphrase<input name="passphrase" type="password" autoComplete="current-password" required autoFocus/></label>{error&&<p className="form-error" role="alert">{error}</p>}<button className="button primary full" disabled={saving}>{saving?'Opening…':'Continue without future unlocks'}</button><p className="fine-print">Anyone using this browser can open your records. Your phone’s screen lock protects access to the device.</p></form>;
}
