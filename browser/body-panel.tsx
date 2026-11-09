import {useEffect,useMemo,useRef,useState,type KeyboardEvent,type MouseEvent} from 'react';
import {Activity,ChevronLeft,ChevronRight} from 'lucide-react';
import {bodyAnalysis,type Entry} from './analysis';
const number=(n:number|null)=>n===null?'—':n.toLocaleString('en-AU',{minimumFractionDigits:1,maximumFractionDigits:1});
const date=(s:string)=>new Date(s+'T12:00:00Z').toLocaleDateString('en-AU',{day:'numeric',month:'short',timeZone:'UTC'});
type Props={entries:Entry[];today:string;days:number;setDays:(n:number)=>void;demo:boolean;connected:boolean};
export default function BodyPanel({entries,today,days,setDays,demo,connected}:Props){
 const weight=useMemo(()=>bodyAnalysis(entries,days,today,'weight'),[entries,days,today]);
 const fat=useMemo(()=>bodyAnalysis(entries,90,today,'bodyFat'),[entries,today]);
 const [selected,setSelected]=useState<string|null>(null);
 useEffect(()=>setSelected(null),[days,today]);
 const selectedDate=selected??weight.daily.at(-1)?.date??null;
 const selectedIndex=weight.daily.findIndex(p=>p.date===selectedDate);
 const selectedGap=selectedDate&&weight.gaps.find(g=>selectedDate>g.from&&selectedDate<g.to);
 const sharedDate=weight.all.at(-1)?.date&&weight.all.at(-1)?.date===fat.all.at(-1)?.date?weight.all.at(-1)!.date:null;
 const point=selectedIndex>=0?weight.daily[selectedIndex]:null;
 return <section className="body-panel" aria-label="Measurements"><div className="body-chart card">
  <div className="body-stats"><div className="body-stat"><p>Weight</p><strong>{number(weight.all.at(-1)?.value??null)}<small>kg</small></strong>{!sharedDate&&<span>{weight.all.length?date(weight.all.at(-1)!.date):'No readings yet'}</span>}</div><div className="body-stat"><p>Body fat</p><strong>{number(fat.all.at(-1)?.value??null)}<small>%</small></strong>{!sharedDate&&<span>{fat.all.length?date(fat.all.at(-1)!.date):'No estimate yet'}</span>}</div></div>
  {sharedDate&&<p className="measurement-date">Latest readings · {date(sharedDate)}{sharedDate!==today&&<strong className="reading-age">{Math.round((Date.parse(today)-Date.parse(sharedDate))/86400000)} days ago</strong>}</p>}
  <div className="body-chart-title"><h2>Weight history</h2><div className="period-switch" role="group" aria-label="Chart period">{[30,90].map(n=><button key={n} aria-label={`${n} days`} aria-pressed={days===n} onClick={()=>setDays(n)}>{n} days</button>)}</div></div>
  <BodyChart analysis={weight} today={today} days={days} selected={selectedDate} onSelect={setSelected} connected={connected||demo}/>
  <div className="body-chart-key"><span><b/>Daily weight</span><span><i/>7-day average</span></div>
  <div className="point-slot">{weight.daily.length>0&&<div className="point-nav" aria-live="polite"><button aria-label="Previous reading" disabled={selectedIndex===0} onClick={()=>setSelected(weight.daily[selectedIndex<0?Math.max(0,weight.daily.findIndex(p=>p.date>selectedDate!)-1):selectedIndex-1].date)}><ChevronLeft size={20}/></button><div className="point-reading">{point?<><span>{date(point.date)}</span><strong>{number(point.value)} kg</strong></>:<span>{selectedGap?`${date(selectedDate!)} · No readings`:'No readings in this period'}</span>}</div><button aria-label="Next reading" disabled={selectedIndex>=weight.daily.length-1} onClick={()=>setSelected(weight.daily[selectedIndex<0?Math.max(0,weight.daily.findIndex(p=>p.date>selectedDate!)):selectedIndex+1].date)}><ChevronRight size={20}/></button></div>}</div>
  <div className="chart-footnote">{demo&&<span>Sample data</span>}</div>
 </div></section>;
}
function BodyChart({analysis:a,today,days,selected,onSelect,connected}:{analysis:ReturnType<typeof bodyAnalysis>;today:string;days:number;selected:string|null;onSelect:(s:string)=>void;connected:boolean}){
 const ref=useRef<HTMLDivElement>(null),[width,setWidth]=useState(360);
 useEffect(()=>{if(!ref.current)return;const observer=new ResizeObserver(([entry])=>setWidth(Math.max(240,Math.round(entry.contentRect.width))));observer.observe(ref.current);return()=>observer.disconnect();},[]);
 const W=width,H=width<600?220:310,L=36,R=15,T=26,B=32,start=Date.parse(today)-(days-1)*86400000;
 const x=(s:string)=>L+(Date.parse(s)-start)/((days-1)*86400000)*(W-L-R),y=(v:number)=>T+(a.high-v)/(a.high-a.low)*(H-T-B);
 function selectNearest(e:MouseEvent<SVGSVGElement>){const rect=e.currentTarget.getBoundingClientRect(),px=(e.clientX-rect.left)*W/rect.width,py=(e.clientY-rect.top)*H/rect.height;
  if(px<L-12||px>W-R+12||py<T-14||py>H-B+14)return;
  const clickedDate=new Date(start+Math.round((px-L)/(W-L-R)*(days-1))*86400000).toISOString().slice(0,10);
  if(a.gaps.some(g=>clickedDate>g.from&&clickedDate<g.to)){onSelect(clickedDate);return;}
  const nearest=a.daily.reduce((best,p)=>{const distance=((px-x(p.date))/1.4)**2+(py-y(p.value))**2;return distance<best.distance?{date:p.date,distance}:best;},{date:a.daily[0].date,distance:Infinity});if(nearest.distance<784)onSelect(nearest.date);
 }
 function selectWithKeys(e:KeyboardEvent<SVGSVGElement>){const index=a.daily.findIndex(p=>p.date===selected);if(e.key==='Enter'||e.key===' '){e.preventDefault();onSelect(a.daily.at(-1)!.date);}else if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();onSelect(a.daily[Math.max(0,Math.min(a.daily.length-1,(index<0?a.daily.length-1:index)+(e.key==='ArrowLeft'?-1:1)))].date);}}
 if(!a.daily.length)return <div className="body-plot" ref={ref}><div className="body-plot-empty"><Activity size={28}/><p>{connected?'No weight readings in this period.':'Connect Withings to see your measurements.'}</p></div></div>;
 return <div className="body-plot" ref={ref}><svg viewBox={`0 0 ${W} ${H}`} role="img" tabIndex={0} aria-label={`Weight chart: ${a.daily.length} weigh-in days over ${days} days. Tap near a dot, or use arrow keys, to inspect a reading.`} onClick={selectNearest} onKeyDown={selectWithKeys}>
  {a.ticks.map(v=><g key={v}><line x1={L} x2={W-R} y1={y(v)} y2={y(v)} stroke="#e8ede6" strokeDasharray="3 5"/><text x={L-9} y={y(v)+4} textAnchor="end" fill="#6c7b70" fontSize="12">{Number.isInteger(v)?v:v.toFixed(1)}</text></g>)}
  <text x={L-9} y={12} textAnchor="end" fill="#6c7b70" fontSize="12">kg</text>
  {selected&&a.daily.some(p=>p.date===selected)&&<line x1={x(selected)} x2={x(selected)} y1={T} y2={H-B} stroke="#718e76" strokeWidth="1.5" strokeDasharray="3 4"/>}
  {a.smoothSegments.map((segment,i)=>segment.length>1?<polyline key={i} points={segment.map(p=>`${x(p.date)},${y(p.smooth)}`).join(' ')} fill="none" stroke="#275e49" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round"/>:null)}
  {a.daily.map((p,i)=><circle key={p.date} cx={x(p.date)} cy={y(p.value)} r={selected===p.date?6:days===90?3.2:3.8} fill={selected===p.date?'#254e3b':i===a.daily.length-1?'#275e49':'#739381'} opacity={1} stroke="white" strokeWidth={selected===p.date?2.5:1} className="chart-dot"/>)}
  {Array.from({length:width<600?3:5},(_,i)=>{const count=width<600?2:4,d=new Date(start+(days-1)*86400000*i/count).toISOString().slice(0,10);return <text key={i} x={x(d)} y={H-5} textAnchor={i===0?'start':i===count?'end':'middle'} fill="#6c7b70" fontSize="12">{date(d)}</text>;})}
 </svg></div>;
}
