import { getDb } from '../../../db';
import { records, preferences } from '../../../db/schema';
import { eq, and, gte, desc } from 'drizzle-orm';
import { userId, json, fail, connection } from '../../lib/server';
import { dayKey } from '../../lib/analysis';
export const dynamic='force-dynamic';
export async function GET(){try{
 const owner=await userId(),db=getDb();
 const [saved,conn]=await Promise.all([db.select().from(preferences).where(eq(preferences.owner,owner)),connection(owner)]);
 const prefs=saved[0]?{goal:saved[0].goal,calories:saved[0].calories,water:saved[0].water,timezone:saved[0].timezone}:{goal:85,calories:2000,water:2500,timezone:'Australia/Sydney'};
 const today=dayKey(new Date(),prefs.timezone),cutoff=new Date(Date.parse(today)-89*86400000).toISOString().slice(0,10);
 const entries=await db.select().from(records).where(and(eq(records.owner,owner),gte(records.date,cutoff))).orderBy(desc(records.date),desc(records.createdAt));
 return json({entries:entries.map(({owner:_,createdAt:__,...e})=>e),preferences:prefs,withings:{configured:!!conn,connected:!!conn?.tokens,syncedAt:conn?.syncedAt??null}});
 }catch(e){return fail(e);}}
