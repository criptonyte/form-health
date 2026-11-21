import {deviceTimezone} from './timezone.mjs';
import {vault,VaultError} from './vault.mjs';

export const FIRST_LOG_DATE='2000-01-01';

export function dateKey(date=new Date(),timezone=deviceTimezone()){
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);
 return ['year','month','day'].map(type=>parts.find(part=>part.type===type).value).join('-');
}

export function validateEntry(body){
 if(body?.kind!=='food')throw new VaultError('Choose a calorie entry.');
 const {date,time,value}=body;
 if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||
    new Date(date).toISOString().slice(0,10)!==date||date>dateKey()||date<FIRST_LOG_DATE){
  throw new VaultError('Choose a valid date, today or earlier.');
 }
 if(time!==undefined&&(typeof time!=='string'||!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))){
  throw new VaultError('Choose a valid time.');
 }
 if(typeof value!=='number'||!Number.isFinite(value)||value<1||value>10000){
  throw new VaultError('Enter a number between 1 and 10000.');
 }
 const label=typeof body.label==='string'?body.label.trim().slice(0,120):'';
 return {id:crypto.randomUUID(),kind:'food',date,value,loggedAt:time?date+'T'+time:null,label,source:'manual',createdAt:Date.now()};
}

export function createLocalApi(engine){
 return async function api(path,body,method='POST'){
  if(!engine)throw new VaultError('This browser does not support local database storage.');
  if(path==='data'){
   const today=dateKey();
   const entries=engine.snapshot().entries
    .filter(entry=>entry.kind==='food'&&entry.date<=today)
    .sort((a,b)=>b.date.localeCompare(a.date)||
     (b.loggedAt||'').localeCompare(a.loggedAt||'')||
     (b.createdAt||0)-(a.createdAt||0));
   return {entries};
  }
  if(path!=='records')throw new VaultError('This operation is not available.');
  if(method==='DELETE'){
   await engine.mutate(data=>{
    data.entries=data.entries.filter(entry=>entry.kind!=='food'||entry.id!==body.id);
   });
   return {ok:true};
  }
  if(method==='PUT'){
   if(body?.kind!=='food')throw new VaultError('Choose a calorie entry.');
   await engine.mutate(data=>{
    if(!data.entries.some(entry=>entry.id===body.id))data.entries.push(body);
   });
   return {id:body.id};
  }
  if(method!=='POST')throw new VaultError('This operation is not available.');
  const entry=validateEntry(body);
  await engine.mutate(data=>data.entries.push(entry));
  return {id:entry.id};
 };
}

export const api=createLocalApi(vault);
