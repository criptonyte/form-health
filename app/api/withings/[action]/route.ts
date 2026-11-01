import { getDb } from '../../../../db';
import { connections, oauthStates } from '../../../../db/schema';
import { eq,and,lt } from 'drizzle-orm';
import { userId,payload,json,fail,AppError,connection,seal,unseal,origin } from '../../../lib/server';
import { tokenRequest,syncWithings,type Credentials } from '../../../lib/withings';
export const dynamic='force-dynamic';
type Context={params:Promise<{action:string}>};
export async function POST(req:Request,ctx:Context){try{const owner=await userId();const {action}=await ctx.params;const b=await payload(req);const db=getDb();
 if(action==='configure'){
  if(typeof b.clientId!=='string'||typeof b.clientSecret!=='string'||b.clientId.trim().length<8||b.clientSecret.trim().length<8||b.clientId.length>500||b.clientSecret.length>500)throw new AppError('Enter the Client ID and Client Secret from Withings.');
  const credentials=await seal({clientId:b.clientId.trim(),clientSecret:b.clientSecret.trim()});
  await db.insert(connections).values({owner,credentials}).onConflictDoUpdate({target:connections.owner,set:{credentials,tokens:null,syncedAt:null,lockUntil:0}});
  return json({ok:true});
 }
 if(action==='sync')return json(await syncWithings(owner));
 if(action==='disconnect'){await db.batch([db.delete(connections).where(eq(connections.owner,owner)),db.delete(oauthStates).where(eq(oauthStates.owner,owner))]);return json({ok:true});}
 throw new AppError('Unknown action.',404);
 }catch(e){return fail(e);}}
export async function GET(req:Request,ctx:Context){const {action}=await ctx.params;try{const owner=await userId();const db=getDb();const base=origin(req),callback=base+'/api/withings/callback';
 if(action==='start'){
  const conn=await connection(owner);if(!conn)throw new AppError('Set up your Withings developer app first.');const c=await unseal<Credentials>(conn.credentials);const state=crypto.randomUUID()+crypto.randomUUID();
  await db.delete(oauthStates).where(lt(oauthStates.expiresAt,Date.now()));await db.insert(oauthStates).values({state,owner,expiresAt:Date.now()+600000});
  const url=new URL('https://account.withings.com/oauth2_user/authorize2');url.search=new URLSearchParams({response_type:'code',client_id:c.clientId,scope:'user.metrics',redirect_uri:callback,state}).toString();
  return new Response(null,{status:302,headers:{Location:url.toString(),'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
 }
 if(action==='callback'){
  const url=new URL(req.url),state=url.searchParams.get('state');if(!state)throw new AppError('Authorization expired. Please connect again.');
  const consumed=await db.delete(oauthStates).where(and(eq(oauthStates.state,state),eq(oauthStates.owner,owner))).returning();
  if(!consumed[0]||consumed[0].expiresAt<Date.now())throw new AppError('Authorization expired. Please connect again.');
  if(url.searchParams.has('error'))throw new AppError('Withings connection was cancelled.');
  const code=url.searchParams.get('code');if(!code)throw new AppError('Withings did not return an authorization code.');
  const conn=await connection(owner);if(!conn)throw new AppError('Please set up your Withings app again.');
  const tokens=await tokenRequest(await unseal<Credentials>(conn.credentials),{grant_type:'authorization_code',code,redirect_uri:callback});
  await db.update(connections).set({tokens:await seal(tokens)}).where(eq(connections.owner,owner));
  let status='connected';try{await syncWithings(owner);}catch{status='connected-sync-pending';}
  return new Response(null,{status:303,headers:{Location:base+'/?withings='+status,'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
 }
 throw new AppError('Unknown action.',404);
 }catch(e){if(action==='callback'||action==='start'){const message=e instanceof AppError?e.message:'Could not connect to Withings. Please try again.';return new Response(null,{status:303,headers:{Location:origin(req)+'/?connectionError='+encodeURIComponent(message),'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});}return fail(e);}}
