import { getDb } from '../../db';
import { records, connections, preferences } from '../../db/schema';
import { eq, and, lt, gte } from 'drizzle-orm';
import { AppError, connection, seal, unseal } from './server';
import { dayKey } from './analysis';
export type Credentials={clientId:string;clientSecret:string};
export type Tokens={access_token:string;refresh_token:string;expiresAt:number;userid:string};
export async function tokenRequest(credentials:Credentials,params:Record<string,string>):Promise<Tokens>{
 const res=await fetch('https://wbsapi.withings.net/v2/oauth2',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({action:'requesttoken',client_id:credentials.clientId,client_secret:credentials.clientSecret,...params}),signal:AbortSignal.timeout(15000)});
 if(!res.ok)throw new AppError('Withings could not complete authentication. Please reconnect.',502);
 const data=await res.json() as {status:number;body?:{access_token:string;refresh_token:string;expires_in:number;userid:string}};
 if(data.status!==0||!data.body?.access_token||!data.body.refresh_token)throw new AppError('Withings rejected authentication. Check your app credentials and reconnect.',400);
 return {access_token:data.body.access_token,refresh_token:data.body.refresh_token,expiresAt:Date.now()+Number(data.body.expires_in)*1000,userid:String(data.body.userid)};
}
export async function syncWithings(owner:string){
 const db=getDb();const locked=await db.update(connections).set({lockUntil:Date.now()+120000}).where(and(eq(connections.owner,owner),lt(connections.lockUntil,Date.now()))).returning({owner:connections.owner});
 if(!locked.length)throw new AppError('A sync is already running. Try again shortly.',409);
 try{
 const conn=await connection(owner);if(!conn?.tokens)throw new AppError('Connect Withings first.');
 const credentials=await unseal<Credentials>(conn.credentials);let tokens=await unseal<Tokens>(conn.tokens);
 if(tokens.expiresAt<Date.now()+120000){tokens=await tokenRequest(credentials,{grant_type:'refresh_token',refresh_token:tokens.refresh_token});await db.update(connections).set({tokens:await seal(tokens)}).where(eq(connections.owner,owner));}
 const prefs=(await db.select().from(preferences).where(eq(preferences.owner,owner)))[0];const timezone=prefs?.timezone||'Australia/Sydney';
 const end=Math.floor(Date.now()/1000),start=end-91*86400;const cutoff=dayKey(new Date(start*1000),timezone);let offset=0,finished=false;
 const imported: (typeof records.$inferInsert)[]=[];
 for(let page=0;page<20;page++){
  const res=await fetch('https://wbsapi.withings.net/measure',{method:'POST',headers:{Authorization:`Bearer ${tokens.access_token}`,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({action:'getmeas',meastypes:'1,6',category:'1',startdate:String(start),enddate:String(end),offset:String(offset)}),signal:AbortSignal.timeout(15000)});
  if(!res.ok)throw new AppError('Withings is unavailable. Try syncing again later.',502);
  const data=await res.json() as {status:number;body?:{more:number;offset:number;measuregrps:{grpid:number;date:number;measures:{type:number;value:number;unit:number}[]}[]}};
  if(data.status!==0||!data.body)throw new AppError('Withings could not return measurements. Try reconnecting your account.',502);
  for(const g of data.body.measuregrps||[]){const w=g.measures.find(m=>m.type===1),f=g.measures.find(m=>m.type===6);if(!w)continue;const value=w.value*10**w.unit;if(!Number.isFinite(value)||value<20||value>400)continue;
   imported.push({id:`withings:${owner}:${g.grpid}`,owner,kind:'weight',date:dayKey(new Date(g.date*1000),timezone),value:Math.round(value*1000)/1000,bodyFat:f?f.value*10**f.unit:null,label:'',source:'withings',createdAt:Date.now()});}
  if(!data.body.more){finished=true;break;}if(data.body.offset===offset)throw new AppError('Withings returned an incomplete page. Please retry.',502);offset=data.body.offset;
 }
 if(!finished)throw new AppError('There are too many measurements for one sync. Please try again later.',502);
 // Replace the successfully fetched window atomically, preserving manual entries.
 const changes=[db.delete(records).where(and(eq(records.owner,owner),eq(records.source,'withings'),gte(records.date,cutoff)))];
 const writes=[];
 for(let i=0;i<imported.length;i+=10)writes.push(db.insert(records).values(imported.slice(i,i+10)).onConflictDoNothing({target:records.id}));
 await db.batch([...changes,...writes,db.update(connections).set({syncedAt:Date.now()}).where(eq(connections.owner,owner))] as any);
 return {imported:imported.length};
 }finally{await db.update(connections).set({lockUntil:0}).where(eq(connections.owner,owner));}
}
