export type Entry = { id: string; kind: string; date: string; value: number; label: string; source: string; bodyFat?: number | null };
export function dayKey(date: Date = new Date(), timezone = 'Australia/Sydney') {
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
 for(let i=0;i<90;i++){if(i%6===2)continue;result.push({id:'demo-'+i,kind:'weight',date:new Date(end-(89-i)*86400000).toISOString().slice(0,10),value:Math.round((94.4-i*.046+Math.sin(i*.76)*.38+Math.cos(i*.29)*.18)*100)/100,label:'',source:'demo'});}
 return result;
}
