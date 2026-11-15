import {useEffect,useMemo,useRef,useState,type MouseEvent} from 'react';
import {Activity,ChevronLeft,ChevronRight,Pencil} from 'lucide-react';
import {bodyAnalysis,type Entry} from './analysis';
const number=(n:number|null)=>n===null?'—':n.toLocaleString('en-AU',{minimumFractionDigits:1,maximumFractionDigits:1});
const date=(s:string)=>new Date(s+'T12:00:00Z').toLocaleDateString('en-AU',{day:'numeric',month:'short',timeZone:'UTC'});
const CHART_DAYS=90;
type Props={entries:Entry[];today:string;demo:boolean;connected:boolean;onEdit:(entries:Entry[])=>void};
export default function BodyPanel({entries,today,demo,connected,onEdit}:Props){
 const weight=useMemo(()=>bodyAnalysis(entries,CHART_DAYS,today,'weight'),[entries,today]);
 const fat=useMemo(()=>bodyAnalysis(entries,CHART_DAYS,today,'bodyFat'),[entries,today]);
 const [selected,setSelected]=useState<string|null>(null);
 const [showGuide,setShowGuide]=useState(false);
 const panel=useRef<HTMLElement>(null);
 useEffect(()=>{setSelected(null);setShowGuide(false);},[today,demo]);
 useEffect(()=>{
  if(!showGuide)return;
  function dismissOutside(event:globalThis.MouseEvent){
   const control=event.target instanceof Element&&event.target.closest('[data-weight-selection]');
   if(!control||!panel.current?.contains(control))setShowGuide(false);
  }
  function dismissWithEscape(event:KeyboardEvent){if(event.key==='Escape')setShowGuide(false);}
  document.addEventListener('click',dismissOutside,true);
  document.addEventListener('keydown',dismissWithEscape);
  return()=>{
   document.removeEventListener('click',dismissOutside,true);
   document.removeEventListener('keydown',dismissWithEscape);
  };
 },[showGuide]);
 function selectReading(date:string){setSelected(date);setShowGuide(true);}
 const selectedIndex=weight.daily.findIndex(point=>point.date===selected);
 const readingIndex=selectedIndex===-1?weight.daily.length-1:selectedIndex;
 const point=weight.daily[readingIndex];
 const editable=!demo&&point?entries.filter(entry=>entry.kind==='weight'&&entry.date===point.date):[];
 const previous=weight.daily.slice(-4,-1).reverse();
 const fatByDate=new Map(fat.daily.map(reading=>[reading.date,reading.value]));
 const sharedDate=weight.all.at(-1)?.date&&weight.all.at(-1)?.date===fat.all.at(-1)?.date?weight.all.at(-1)!.date:null;
 return <section ref={panel} className="body-panel" aria-label="Measurements"><div className="body-chart card">
  <div className="body-stats"><div className="body-stat"><p>Weight</p><strong>{number(weight.all.at(-1)?.value??null)}<small>kg</small></strong>{!sharedDate&&<span>{weight.all.length?date(weight.all.at(-1)!.date):'No readings yet'}</span>}</div><div className="body-stat"><p>Body fat</p><strong>{number(fat.all.at(-1)?.value??null)}<small>%</small></strong>{!sharedDate&&<span>{fat.all.length?date(fat.all.at(-1)!.date):'No estimate yet'}</span>}</div></div>
  {sharedDate&&<p className="measurement-date">Latest readings · {date(sharedDate)}{sharedDate!==today&&<strong className="reading-age">{Math.round((Date.parse(today)-Date.parse(sharedDate))/86400000)===1?'Yesterday':`${Math.round((Date.parse(today)-Date.parse(sharedDate))/86400000)} days ago`}</strong>}</p>}
  <BodyChart analysis={weight} today={today} selected={showGuide&&selectedIndex!==-1?selected:null} onSelect={selectReading} connected={connected||demo}/>
  {point&&<>
   <div className="body-chart-key weight-chart-legend"><span><b/>Daily weight</span><span><i/>7-day average</span></div>
   <div className="point-slot">
    <div className="point-nav" role="group" aria-label="Browse weight readings">
     <button type="button" aria-label="Previous reading" data-weight-selection aria-disabled={readingIndex===0} onClick={()=>{const previous=weight.daily[readingIndex-1];if(previous)selectReading(previous.date);}}><ChevronLeft size={20}/></button>
     <div className="point-reading">
      <p aria-live="polite"><time dateTime={point.date}>{date(point.date)}</time> <strong>{number(point.value)} kg</strong></p>
      {editable.length>0&&<button type="button" className="icon-button weight-edit" aria-label="Edit weight reading" title="Edit weight reading" onClick={()=>onEdit(editable)}><Pencil size={15}/></button>}
     </div>
     <button type="button" aria-label="Next reading" data-weight-selection aria-disabled={readingIndex===weight.daily.length-1} onClick={()=>{const next=weight.daily[readingIndex+1];if(next)selectReading(next.date);}}><ChevronRight size={20}/></button>
    </div>
   </div>
  </>}
  {previous.length>0&&<section className="reading-shortcuts" aria-labelledby="reading-shortcuts-title">
   <h2 id="reading-shortcuts-title">Recent readings</h2>
   <div className="reading-shortcut-list">
    {previous.map(reading=>{
     const bodyFat=fatByDate.get(reading.date);
     return <button type="button" key={reading.date} data-weight-selection aria-pressed={reading.date===selected} onClick={()=>selectReading(reading.date)}>
      <time dateTime={reading.date}>{date(reading.date)}</time>
      <strong>{number(reading.value)} kg</strong>
      {bodyFat!==undefined&&<span>{number(bodyFat)}% <span className="reading-fat-label">body fat</span></span>}
     </button>;
    })}
   </div>
  </section>}

 </div></section>;
}
function BodyChart({analysis:a,today,selected,onSelect,connected}:{analysis:ReturnType<typeof bodyAnalysis>;today:string;selected:string|null;onSelect:(date:string)=>void;connected:boolean}){
 const ref=useRef<HTMLDivElement>(null),[width,setWidth]=useState(360);
 useEffect(()=>{if(!ref.current)return;const observer=new ResizeObserver(([entry])=>setWidth(Math.max(240,Math.round(entry.contentRect.width))));observer.observe(ref.current);return()=>observer.disconnect();},[]);
 const W=width,H=width<600?204:284,L=35,R=10,T=12,B=29,start=Date.parse(today)-(CHART_DAYS-1)*86400000;
 const x=(s:string)=>L+(Date.parse(s)-start)/((CHART_DAYS-1)*86400000)*(W-L-R),y=(v:number)=>T+(a.high-v)/(a.high-a.low)*(H-T-B);
 function selectNearest(e:MouseEvent<SVGSVGElement>){
  const rect=e.currentTarget.getBoundingClientRect();
  const px=(e.clientX-rect.left)*W/rect.width;
  const py=(e.clientY-rect.top)*H/rect.height;
  if(px<L-8||px>W-R+8||py<T-8||py>H-B+8)return;
  const nearest=a.daily.reduce((best,point)=>Math.abs(px-x(point.date))<Math.abs(px-x(best.date))?point:best);
  onSelect(nearest.date);
 }
 if(!a.daily.length)return <div className="body-plot" ref={ref}><div className="body-plot-empty"><Activity size={28}/><p>{connected?'No weight readings in this period.':'Connect Withings to see your measurements.'}</p></div></div>;
 return <div className="body-plot" ref={ref}><svg data-weight-selection viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Weight chart in kilograms: ${a.daily.length} weigh-in days over ${CHART_DAYS} days. Use the previous and next reading buttons to browse dates.`} onClick={selectNearest}>
  {a.ticks.map(v=><g key={v}><line x1={L} x2={W-R} y1={y(v)} y2={y(v)} stroke="#e5ebe4"/><text x={L-9} y={y(v)+4} textAnchor="end" fill="#6c7b70" fontSize="12">{Number.isInteger(v)?v:v.toFixed(1)}</text></g>)}
  {selected&&a.daily.some(p=>p.date===selected)&&<line x1={x(selected)} x2={x(selected)} y1={T} y2={H-B} stroke="#718e76" strokeWidth="1.5" strokeDasharray="3 4"/>}
  {a.smoothSegments.map((segment,i)=>segment.length>1?<polyline key={i} points={segment.map(p=>`${x(p.date)},${y(p.smooth)}`).join(' ')} fill="none" stroke="#275e49" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>:null)}
  {a.daily.map((p,i)=><circle key={p.date} cx={x(p.date)} cy={y(p.value)} r={selected===p.date?5.5:i===a.daily.length-1?4.3:2.7} fill={selected===p.date?'#254e3b':i===a.daily.length-1?'#275e49':'#739381'} stroke="white" strokeWidth={selected===p.date?1.5:.75} className="chart-dot"/>)}
  {Array.from({length:width<600?3:5},(_,i)=>{const count=width<600?2:4,d=new Date(start+(CHART_DAYS-1)*86400000*i/count).toISOString().slice(0,10);return <text key={i} x={x(d)} y={H-5} textAnchor={i===0?'start':i===count?'end':'middle'} fill="#6c7b70" fontSize="12">{date(d)}</text>;})}
 </svg></div>;
}
