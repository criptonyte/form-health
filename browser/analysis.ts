export type Entry = { id: string; kind: string; date: string; value: number; label: string; source: string; bodyFat?: number | null; loggedAt?: string; createdAt?:number };
export function dayKey(date: Date = new Date(), timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC') {
 const parts = new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);
 return ['year','month','day'].map(t=>parts.find(p=>p.type===t)?.value).join('-');
}
export function dailyWeights(entries: Entry[]) {
 const days = new Map<string,number[]>();
 for (const e of entries.filter(e=>e.kind==='weight').sort((a,b)=>a.date.localeCompare(b.date))) days.set(e.date,[...(days.get(e.date)||[]),e.value]);
 return [...days].map(([date,v])=>({date,value:v.reduce((a,b)=>a+b,0)/v.length})).sort((a,b)=>a.date.localeCompare(b.date));
}
export function weightAnalysis(entries: Entry[], days: number, today: string) {
 const end=Date.parse(today+'T00:00:00Z'); const start=end-(days-1)*86400000;
 const daily=dailyWeights(entries).filter(e=>Date.parse(e.date+'T00:00:00Z')>=start && e.date<=today);
 const recent=daily.filter(e=>Date.parse(e.date+'T00:00:00Z')>=end-6*86400000);
 const avg=recent.length?recent.reduce((a,b)=>a+b.value,0)/recent.length:null;
 let rate:number|null=null;
 if(daily.length>=3 && Date.parse(daily.at(-1)!.date)-Date.parse(daily[0].date)>=7*86400000){
  const points=daily.map(p=>({x:(Date.parse(p.date)-start)/86400000,y:p.value}));
  const mx=points.reduce((s,p)=>s+p.x,0)/points.length,my=points.reduce((s,p)=>s+p.y,0)/points.length;
  rate=points.reduce((s,p)=>s+(p.x-mx)*(p.y-my),0)/points.reduce((s,p)=>s+(p.x-mx)**2,0)*7;
 }
 const rolling=daily.map(p=>{const cutoff=Date.parse(p.date)-6*86400000; const v=daily.filter(q=>q.date<=p.date && Date.parse(q.date)>=cutoff);return {...p,average:v.reduce((s,q)=>s+q.value,0)/v.length};});
 return {daily,rolling,average:avg,rate,latest:daily.at(-1)?.value??null,change:daily.length>=2?daily.at(-1)!.value-daily[0].value:null};
}
export function demoEntries(today: string): Entry[] {
 const end=Date.parse(today+'T12:00:00Z');const result:Entry[]=[];
 for(let i=0;i<90;i++){if(i%6===2)continue;result.push({id:'demo-'+i,kind:'weight',date:new Date(end-(89-i)*86400000).toISOString().slice(0,10),value:Math.round((94.4-i*.046+Math.sin(i*.76)*.38+Math.cos(i*.29)*.18)*100)/100,bodyFat:i%5===0?null:Math.round((29-i*.018+Math.sin(i*.9)*.8)*10)/10,label:'',source:'demo'});}
 return result;
}

export type BodyMetric='weight'|'bodyFat';
const DAY=86400000;
export const median=(values:number[])=>{const v=[...values].sort((a,b)=>a-b);return v.length%2?v[(v.length-1)/2]:(v[v.length/2-1]+v[v.length/2])/2;};
export function splitAtGaps<T extends {date:string}>(points:T[],maxGap=3):T[][]{
 const segments:T[][]=[];for(const p of points){const last=segments.at(-1);if(!last||Date.parse(p.date)-Date.parse(last.at(-1)!.date)>maxGap*DAY)segments.push([p]);else last.push(p);}return segments;
}
export function bodyAnalysis(entries:Entry[],days:number,today:string,metric:BodyMetric='weight'){
 const end=Date.parse(today),start=end-(days-1)*DAY,window=metric==='weight'?7:14,maxGap=metric==='weight'?3:7;
 const groups=new Map<string,number[]>();
 for(const e of entries){const value=metric==='weight'?(e.kind==='weight'?e.value:null):e.kind==='bodyFat'?e.value:e.kind==='weight'?e.bodyFat:null;
 if(typeof value!=='number'||!Number.isFinite(value)||value<=0||(metric==='weight'?value>400:value>=100)||e.date>today||Date.parse(e.date)<end-89*DAY)continue;
 groups.set(e.date,[...(groups.get(e.date)||[]),value]);}
 const reduce=(v:number[])=>metric==='weight'?v.reduce((s,n)=>s+n,0)/v.length:median(v);
 const all=[...groups].map(([date,v])=>({date,value:reduce(v)})).sort((a,b)=>a.date.localeCompare(b.date));
 const daily=all.filter(p=>Date.parse(p.date)>=start);
 const rolling=daily.map(p=>{const values=all.filter(q=>q.date<=p.date&&Date.parse(q.date)>=Date.parse(p.date)-(window-1)*DAY).map(q=>q.value);return{...p,smooth:values.length>=3?reduce(values):null,count:values.length};});
 const current=all.filter(p=>Date.parse(p.date)>=end-(window-1)*DAY),previous=all.filter(p=>Date.parse(p.date)>=end-(2*window-1)*DAY&&Date.parse(p.date)<end-(window-1)*DAY);
 const currentValue=current.length>=3?reduce(current.map(p=>p.value)):null,previousValue=previous.length>=3?reduce(previous.map(p=>p.value)):null;
 const comparisonMinimum=metric==='bodyFat'?7:3;
 const delta=current.length>=comparisonMinimum&&previous.length>=comparisonMinimum&&currentValue!==null&&previousValue!==null?currentValue-previousValue:null;
 const starting=all.filter(p=>Date.parse(p.date)>=start&&Date.parse(p.date)<start+window*DAY);
 const startingValue=starting.length>=comparisonMinimum?reduce(starting.map(p=>p.value)):null;
 const rangeDelta=days>=2*window&&current.length>=comparisonMinimum&&currentValue!==null&&startingValue!==null?currentValue-startingValue:null;
 const gaps=[] as {from:string;to:string;missing:number}[];
 for(let i=1;i<daily.length;i++){const missing=(Date.parse(daily[i].date)-Date.parse(daily[i-1].date))/DAY-1;if(missing>=maxGap)gaps.push({from:daily[i-1].date,to:daily[i].date,missing});}
 const values=all.map(p=>p.value);const min=values.length?Math.min(...values):0,max=values.length?Math.max(...values):1;
 const rawStep=Math.max((max-min+.6)/4,.5),step=[.5,1,2,2.5,5,10,20,25,50].find(v=>v>=rawStep)??Math.ceil(rawStep/10)*10;
 const low=Math.max(0,Math.floor((min-.3)/step)*step),high=low+Math.max(4,Math.ceil((max+.3-low)/step))*step;
 const ticks=Array.from({length:Math.round((high-low)/step)+1},(_,i)=>high-i*step);
 return{metric,window,maxGap,comparisonMinimum,starting,startingValue,rangeDelta,daily,rolling,all,current,previous,currentValue,previousValue,delta,gaps,low,high,ticks,latest:daily.at(-1)??null,age:daily.length?Math.round((end-Date.parse(daily.at(-1)!.date))/DAY):null,
  smoothSegments:splitAtGaps(rolling.filter((p):p is typeof p&{smooth:number}=>p.smooth!==null),maxGap),rawSegments:splitAtGaps(daily,maxGap)};
}

// One weight-led interpretation, using identical endpoint dates for both signals.
export function bodyInsight(entries:Entry[],days:number,today:string){
 const end=Date.parse(today),start=end-(days-1)*DAY,window=14;
 const weights=new Map<string,number[]>(),fatMass=new Map<string,number[]>();
 for(const e of entries){if(e.kind!=='weight'||!Number.isFinite(e.value)||e.value<20||e.value>400||e.date>today||Date.parse(e.date)<start)continue;
  weights.set(e.date,[...(weights.get(e.date)||[]),e.value]);
  // Calculate each paired reading before aggregating: never multiply separate averages.
  if(typeof e.bodyFat==='number'&&Number.isFinite(e.bodyFat)&&e.bodyFat>0&&e.bodyFat<100)fatMass.set(e.date,[...(fatMass.get(e.date)||[]),e.value*e.bodyFat/100]);
 }
 const dailyWeight=[...weights].map(([date,v])=>({date,value:v.reduce((s,n)=>s+n,0)/v.length}));
 const dailyFat=[...fatMass].map(([date,v])=>({date,value:median(v)}));
 const first=(p:{date:string})=>Date.parse(p.date)>=start&&Date.parse(p.date)<start+window*DAY;
 const last=(p:{date:string})=>Date.parse(p.date)>=end-(window-1)*DAY&&p.date<=today;
 const wStart=dailyWeight.filter(first),wEnd=dailyWeight.filter(last),fStart=dailyFat.filter(first),fEnd=dailyFat.filter(last);
 const mean=(v:{value:number}[])=>v.reduce((s,p)=>s+p.value,0)/v.length;
 const weightDelta=days>=window*2&&wStart.length>=3&&wEnd.length>=3?Math.round((mean(wEnd)-mean(wStart))*10)/10:null;
 const fatDelta=days>=window*2&&fStart.length>=7&&fEnd.length>=7?Math.round((median(fEnd.map(p=>p.value))-median(fStart.map(p=>p.value)))*10)/10:null;
 let context='More weight readings needed.';
 if(weightDelta!==null){
  if(fatDelta===null)context='Too few paired fat readings.';
  else if(weightDelta<0)context=fatDelta<0?'Fat estimate also lower.':'Composition change unclear.';
  else if(weightDelta>0)context=fatDelta>0?'Fat estimate also higher.':'Composition change unclear.';
  else context=fatDelta<0?'Possible composition change; unconfirmed.':'No clear fat-mass change.';
 }
 return{weightDelta,fatDelta,context,window,weightStartCount:wStart.length,weightEndCount:wEnd.length,fatStartCount:fStart.length,fatEndCount:fEnd.length};
}
