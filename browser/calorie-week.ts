import type {Entry} from './analysis';

export function completedDayTotals(entries:Pick<Entry,'kind'|'date'|'value'>[],today:string){
 const totals=new Map<string,{count:number;total:number}>();
 for(const entry of entries){if(entry.kind!=='food')continue;const day=totals.get(entry.date)??{count:0,total:0};day.count++;day.total+=entry.value;totals.set(entry.date,day);}
 return Array.from({length:7},(_,i)=>{const date=new Date(today+'T12:00:00Z');date.setUTCDate(date.getUTCDate()-i-1);const key=date.toISOString().slice(0,10);return {key,...(totals.get(key)??{count:0,total:0})};});
}
