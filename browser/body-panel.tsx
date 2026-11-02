import {useEffect,useMemo,useRef,useState} from 'react';
import {Activity,ArrowDownRight,ArrowUpRight,Minus,CircleHelp,RefreshCw} from 'lucide-react';
import {bodyAnalysis,bodyInsight,type BodyMetric,type Entry} from './analysis';
const number=(n:number|null,d=1)=>n===null?'—':n.toLocaleString('en-AU',{minimumFractionDigits:d,maximumFractionDigits:d});
const date=(s:string)=>new Date(s+'T12:00:00Z').toLocaleDateString('en-AU',{day:'numeric',month:'short',timeZone:'UTC'});
const signed=(n:number)=>`${n>0?'+':n<0?'−':''}${number(Math.abs(n))}`;
type Props={entries:Entry[];today:string;days:number;setDays:(n:number)=>void;connected:boolean;busy:boolean;onSync:()=>void;onConnect:()=>void;demo:boolean};
export default function BodyPanel({entries,today,days,setDays,connected,busy,onSync,onConnect,demo}:Props){
 const [metric,setMetric]=useState<BodyMetric>('weight'),[info,setInfo]=useState(false);
 const a=useMemo(()=>bodyAnalysis(entries,days,today,metric),[entries,days,today,metric]);
 const fat=metric==='bodyFat',unit=fat?'%':'kg',smoothLabel=fat?'14-day median':'7-day average';
 const insight=useMemo(()=>bodyInsight(entries,days,today),[entries,days,today]);
 const delta=insight.weightDelta;
 const direction=delta===null?'More readings needed':delta===0?'Steady':delta<0?'Down':'Up';
 return <section className={'body-panel '+(fat?'body-fat':'')} aria-label="Body trends">
  <div className="body-chart card">
   <div className="body-chart-title"><div><div className="chart-heading-line"><h2>Body trends</h2><button className="chart-info-button" aria-label="About this chart" aria-expanded={info} aria-controls="chart-explanation" onClick={()=>setInfo(!info)}><CircleHelp size={16}/></button></div><p>{a.daily.length} of {days} days measured</p></div><button className="body-sync" onClick={connected?onSync:onConnect} disabled={busy} aria-label={connected?'Sync Withings':'Connect Withings'}><RefreshCw size={16} className={busy?'spin':''}/>{busy?'Syncing…':connected?'Sync':'Connect'}</button></div>
   {info&&<div className="chart-explanation" id="chart-explanation"><p>{fat?'Body fat uses a 14-day median to soften isolated spikes. It can vary with hydration; changes are percentage points (pp).':'Weight uses a 7-day average to smooth daily fluctuations.'} The insight compares the first and last 14 days: weight averages need 3 measured days per window; paired fat-mass medians need 7. Fat mass is calculated from each weigh-in’s weight and fat percentage. Estimates do not confirm fat or muscle change. Gaps stay blank.</p></div>}
   <div className="chart-view-controls"><div className="metric-switch" role="group" aria-label="Chart measurement">{(['weight','bodyFat'] as const).map(m=><button key={m} aria-pressed={metric===m} onClick={()=>setMetric(m)}>{m==='weight'?'Weight':'Body fat'}</button>)}</div><div className="period-switch" role="group" aria-label="Analysis period">{[30,60,90].map(n=><button key={n} aria-label={`${n} days`} aria-pressed={days===n} className={days===n?'selected':''} onClick={()=>setDays(n)}>{n}<span> days</span></button>)}</div></div>
  <div className="body-summary"><div className="body-stats">
   <div className="body-stat"><p>{fat?'Latest estimate':'Latest daily reading'}</p><strong>{number(a.latest?.value??null)}<small>{unit}</small></strong><span>{a.latest?`${date(a.latest.date)}${a.age!==null&&a.age>0?` · ${a.age} ${a.age===1?'day':'days'} ago`:''}`:'No readings in this period'}</span></div>
   <div className="body-stat emphasis"><p>{smoothLabel}</p><strong>{number(a.currentValue)}<small>{unit}</small></strong><span>{a.current.length} of {a.window} days measured{a.current.length<3?' · need 3+':a.current.length<a.comparisonMinimum?' · limited coverage':''}</span></div>
  </div>
  <div className="period-direction" role="status">
   <div><span className="direction-label">{days}-day weight change</span><div className="direction-value">{delta!==null&&(delta<0?<ArrowDownRight size={25}/>:delta>0?<ArrowUpRight size={25}/>:<Minus size={25}/>)}<strong>{delta===null?'—':signed(delta)}<small>{delta===null?'':' kg'}</small></strong><span>{direction}</span></div></div>
   <p className="combined-insight"><b>{insight.context}</b><span>First vs last 2 weeks</span></p>
  </div>
  </div>
   <div className="body-chart-key"><span><i/>{smoothLabel}</span><span><b/>Daily {fat?'estimate':'reading'}</span></div>
   <BodyChart key={metric+days} analysis={a} today={today} days={days}/>
   <div className="chart-footnote">{a.gaps.length?<span><span className="gap-symbol"/>{Math.max(...a.gaps.map(g=>g.missing))}-day gap · no readings</span>:<span>Measured days only</span>}{demo&&<span>Sample data</span>}</div>
  </div>
 </section>;
}
function BodyChart({analysis:a,today,days}:{analysis:ReturnType<typeof bodyAnalysis>;today:string;days:number}){
 const ref=useRef<HTMLDivElement>(null),[width,setWidth]=useState(360);
 useEffect(()=>{if(!ref.current)return;const observer=new ResizeObserver(([entry])=>setWidth(Math.max(240,Math.round(entry.contentRect.width))));observer.observe(ref.current);return()=>observer.disconnect();},[]);
 const W=width,H=width<600?250:330,L=43,R=14,T=16,B=32,start=Date.parse(today)-(days-1)*86400000;
 const x=(s:string)=>L+(Date.parse(s)-start)/((days-1)*86400000)*(W-L-R),y=(v:number)=>T+(a.high-v)/(a.high-a.low)*(H-T-B);
 const fat=a.metric==='bodyFat';
 if(!a.daily.length)return <div className="body-plot" ref={ref}><div className="body-plot-empty"><Activity size={28}/><p>No {fat?'body fat':'weight'} readings in this period.</p></div></div>;
 return <div className="body-plot" ref={ref}>
  <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${fat?'Body fat':'Weight'}: ${a.daily.length} measured days over ${days} days. Gaps are left blank.`}>
   {a.ticks.map(v=><g key={v}><line x1={L} x2={W-R} y1={y(v)} y2={y(v)} stroke="#e0e7df" strokeDasharray="3 5"/><text x={L-9} y={y(v)+4} textAnchor="end" fill="#6c7b70" fontSize="11">{number(v)}</text></g>)}
   {a.gaps.map(g=><rect key={g.from} x={x(g.from)+3} y={T} width={Math.max(0,x(g.to)-x(g.from)-6)} height={H-T-B} fill="#f2f4f1"/>)}
   {a.smoothSegments.map((segment,i)=>segment.length>1?<polyline key={i} points={segment.map(p=>`${x(p.date)},${y(p.smooth)}`).join(' ')} fill="none" stroke="#275e49" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round"/>:<circle key={i} cx={x(segment[0].date)} cy={y(segment[0].smooth)} r="3.5" fill="#275e49"/>)}
   {a.daily.map((p,i)=><circle key={p.date} cx={x(p.date)} cy={y(p.value)} r={2.5} fill={i===a.daily.length-1?'#275e49':'#91ab9a'} stroke="white" strokeWidth={i===a.daily.length-1?1.5:.7}/>) }
   {Array.from({length:width<600?3:5},(_,i)=>{const count=width<600?2:4,d=new Date(start+(days-1)*86400000*i/count).toISOString().slice(0,10);return <text key={i} x={x(d)} y={H-5} textAnchor={i===0?'start':i===count?'end':'middle'} fill="#6c7b70" fontSize="11">{date(d)}</text>;})}
  </svg>
 </div>;
}
