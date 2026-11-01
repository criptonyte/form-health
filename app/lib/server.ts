import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '../chatgpt-auth';
import { getDb } from '../../db';
import { connections } from '../../db/schema';
import { eq } from 'drizzle-orm';
export class AppError extends Error { constructor(message:string, public status=400){super(message);} }
export async function userId(){const u=await getChatGPTUser();if(!u)throw new AppError('Sign in to access your records.',401);return u.userId;}
export function json(data:unknown,status=200){return Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});}
export function fail(e:unknown){return json({error:e instanceof AppError?e.message:'Something went wrong. Please try again.'},e instanceof AppError?e.status:500);}
export function checkOrigin(req:Request){if(req.headers.get('origin')!==new URL(req.url).origin)throw new AppError('Request origin is not allowed.',403);if(!req.headers.get('content-type')?.includes('application/json'))throw new AppError('JSON is required.',415);}
export async function payload(req:Request){checkOrigin(req);const raw=await req.text();if(raw.length>20000)throw new AppError('Request is too large.',413);try{return JSON.parse(raw);}catch{throw new AppError('Invalid JSON.');}}
export function number(v:unknown,min:number,max:number){if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)throw new AppError(`Enter a number between ${min} and ${max}.`);return v;}
export function origin(req:Request){return env.APP_ORIGIN || new URL(req.url).origin;}
async function key(){if(!env.APP_ENCRYPTION_KEY)throw new AppError('Secure connection storage is not configured yet.',503);const bytes=Uint8Array.from(env.APP_ENCRYPTION_KEY.match(/.{2}/g)!,v=>parseInt(v,16));return crypto.subtle.importKey('raw',bytes,'AES-GCM',false,['encrypt','decrypt']);}
export async function seal(v:unknown){const iv=crypto.getRandomValues(new Uint8Array(12));const encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv},await key(),new TextEncoder().encode(JSON.stringify(v)));return btoa(String.fromCharCode(...iv,...new Uint8Array(encrypted)));}
export async function unseal<T>(v:string):Promise<T>{const data=Uint8Array.from(atob(v),c=>c.charCodeAt(0));const result=await crypto.subtle.decrypt({name:'AES-GCM',iv:data.slice(0,12)},await key(),data.slice(12));return JSON.parse(new TextDecoder().decode(result));}
export async function connection(owner:string){return (await getDb().select().from(connections).where(eq(connections.owner,owner)))[0];}
