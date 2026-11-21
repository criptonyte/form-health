export type CalorieEntry = {
 id: string;
 kind: 'food';
 date: string;
 value: number;
 label: string;
 loggedAt?: string | null;
 createdAt?: number;
};

const DAY_MS=86_400_000;

export function shiftDay(day:string,offset:number){
 return new Date(Date.parse(day)+offset*DAY_MS).toISOString().slice(0,10);
}

export function journalWeekEnd(day:string,today:string){
 const daysAgo=(Date.parse(today)-Date.parse(day))/DAY_MS;
 return shiftDay(today,-7*Math.floor(daysAgo/7));
}

export function calorieWeek(entries:{kind:string;date:string;value:number}[],endDay:string,today=endDay){
 const startDay=shiftDay(endDay,-6);
 const totals=new Map<string,{count:number;total:number}>();
 for(const entry of entries){
  if(entry.kind!=='food'||entry.date<startDay||entry.date>endDay)continue;
  const day=totals.get(entry.date)??{count:0,total:0};
  day.count++;
  day.total+=entry.value;
  totals.set(entry.date,day);
 }
 const days=Array.from({length:7},(_,index)=>{
  const key=shiftDay(startDay,index);
  return {key,...(totals.get(key)??{count:0,total:0})};
 });
 const completed=days.filter(day=>day.key<today&&day.count>0);
 const average=completed.length?completed.reduce((sum,day)=>sum+day.total,0)/completed.length:null;
 return {days,average};
}
