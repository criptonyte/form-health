import {useEffect,useMemo,useRef,useState,type MouseEvent} from 'react';
import {Activity,ChevronLeft,ChevronRight,RefreshCw} from 'lucide-react';
import {bodyAnalysis,type Entry} from './analysis';
const number=(n:number|null)=>n===null?'—':n.toLocaleString('en-AU',{minimumFractionDigits:1,maximumFractionDigits:1});
const date=(s:string)=>new Date(s+'T12:00:00Z').toLocaleDateString('en-AU',{day:'numeric',month:'short',timeZone:'UTC'});
type Props={entries:Entry[];today:string;days:number;setDays:(n:number)=>void;connected:boolean;busy:boolean;onSync:()=>void;onConnect:()=>void;demo:boolean};
export default function BodyPanel({entries,today,days,setDays,connected,busy,onSync,onConnect,demo}:Props){
 const weight=useMemo(()=>bodyAnalysis(entries,days,today,'weight'),[entries,days,today]);
 const fat=useMemo(()=>bodyAnalysis(entries,90,today,'bodyFat'),[entries,today]);
 const [selected,setSelected]=useState<string|null>(null);
 useEffect(()=>setSelected(null),[days,today]);
 const selectedIndex=selected===null?-1:weight.daily.findIndex(p=>p.date===selected);
 const point=selectedIndex>=0?weight.daily[selectedIndex]:null;
 return <section className="body-panel" aria-label="Body trends"><div className="body-chart card">
  <div className="body-chart-title"><div><h2>Body trends</h2><p>{weight.daily.length} of {days} days measured</p></div><button className="body-sync" onClick={connected?onSync:onConnect} disabled={busy} aria-label={connected?'Sync Withings':'Connect Withings'}><RefreshCw size={16} className={busy?'spin':''}/>{busy?'Syncing…':connected?'Sync':'Connect'}</button></div>
  <div className="chart-view-controls"><span className="chart-view-label">Weight history</span><div className="period-switch" role="group" aria-label="Chart period">{[30,60,90].map(n=><button key={n} aria-label={`${n} days`} aria-pressed={days===n} onClick={()=>setDays(n)}>{n}<span> days</span></button>)}</div></div>
  <div className="body-stats"><div className="body-stat"><p>Latest weight</p><strong>{number(weight.all.at(-1)?.value??null)}<small>kg</small></strong><span>{weight.all.length?date(weight.all.at(-1)!.date):'No readings yet'}</span></div><div className="body-stat"><p>Latest body fat</p><strong>{number(fat.all.at(-1)?.value??null)}<small>%</small></strong><span>{fat.all.length?date(fat.all.at(-1)!.date):'No estimate yet'}</span></div></div>
  <div className="body-chart-key"><span><i/>7-day average</span><span><b/>Daily weight</span></div>
  <BodyChart analysis={weight} today={today} days={days} selected={point?.date??null} onSelect={setSelected}/>
  {point&&<div className="point-nav" aria-live="polite"><div className="point-reading"><span>{date(point.date)}</span><strong>{number(point.value)} kg</strong></div><div className="point-nav-actions"><button aria-label="Previous reading" disabled={selectedIndex<=0} onClick={()=>setSelected(weight.daily[selectedIndex-1].date)}><ChevronLeft size={18}/></button><span>{selectedIndex+1} / {weight.daily.length}</span><button aria-label="Next reading" disabled={selectedIndex>=weight.daily.length-1} onClick={()=>setSelected(weight.daily[selectedIndex+1].date)}><ChevronRight size={18}/></button></div></div>}
  <div className="chart-footnote">{weight.gaps.length?<span><span className="gap-symbol"/>{Math.max(...weight.gaps.map(g=>g.missing))}-day gap · no readings</span>:<span>Tap a dot to explore readings</span>}{demo&&<span>Sample data</span>}</div>
 </div></section>;
}
function BodyChart({analysis:a,today,days,selected,onSelect}:{analysis:ReturnType<typeof bodyAnalysis>;today:string;days:number;selected:string|null;onSelect:(s:string)=>void}){
 const ref=useRef<HTMLDivElement>(null),[width,setWidth]=useState(360);
 useEffect(()=>{if(!ref.current)return;const observer=new ResizeObserver(([entry])=>setWidth(Math.max(240,Math.round(entry.contentRect.width))));observer.observe(ref.current);return()=>observer.disconnect();},[]);
 const W=width,H=width<600?250:330,L=43,R=14,T=16,B=32,start=Date.parse(today)-(days-1)*86400000;
 const x=(s:string)=>L+(Date.parse(s)-start)/((days-1)*86400000)*(W-L-R),y=(v:number)=>T+(a.high-v)/(a.high-a.low)*(H-T-B);
 function selectNearest(e:MouseEvent<SVGSVGElement>){const rect=e.currentTarget.getBoundingClientRect(),px=(e.clientX-rect.left)*W/rect.width,py=(e.clientY-rect.top)*H/rect.height;
  if(px<L-12||px>W-R+12||py<T-14||py>H-B+14)return;
  const nearest=a.daily.reduce((best,p)=>{const distance=((px-x(p.date))/1.4)**2+(py-y(p.value))**2;return distance<best.distance?{date:p.date,distance}:best;},{date:a.daily[0].date,distance:Infinity});if(nearest.distance<400)onSelect(nearest.date);
 }
 if(!a.daily.length)return <div className="body-plot" ref={ref}><div className="body-plot-empty"><Activity size={28}/><p>No weight readings in this period.</p></div></div>;
 return <div className="body-plot" ref={ref}><svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Weight: ${a.daily.length} measured days over ${days} days. Tap a dot to inspect a reading.`} onClick={selectNearest}>
  {a.ticks.map(v=><g key={v}><line x1={L} x2={W-R} y1={y(v)} y2={y(v)} stroke="#e0e7df" strokeDasharray="3 5"/><text x={L-9} y={y(v)+4} textAnchor="end" fill="#6c7b70" fontSize="11">{number(v)}</text></g>)}
  {a.gaps.map(g=><rect key={g.from} x={x(g.from)+3} y={T} width={Math.max(0,x(g.to)-x(g.from)-6)} height={H-T-B} fill="#f2f4f1"/>)}
  {a.smoothSegments.map((segment,i)=>segment.length>1?<polyline key={i} points={segment.map(p=>`${x(p.date)},${y(p.smooth)}`).join(' ')} fill="none" stroke="#275e49" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round"/>:<circle key={i} cx={x(segment[0].date)} cy={y(segment[0].smooth)} r="3.5" fill="#275e49"/>)}
  {a.daily.map((p,i)=><circle key={p.date} cx={x(p.date)} cy={y(p.value)} r={selected===p.date?6:3.2} fill={selected===p.date?'#254e3b':i===a.daily.length-1?'#275e49':'#91ab9a'} stroke="white" strokeWidth={selected===p.date?2:1} className="chart-dot"/>)}
  {Array.from({length:width<600?3:5},(_,i)=>{const count=width<600?2:4,d=new Date(start+(days-1)*86400000*i/count).toISOString().slice(0,10);return <text key={i} x={x(d)} y={H-5} textAnchor={i===0?'start':i===count?'end':'middle'} fill="#6c7b70" fontSize="11">{date(d)}</text>;})}
 </svg></div>;
}
