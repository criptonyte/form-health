import { getDb } from '../../../db';
import { preferences } from '../../../db/schema';
import { userId,payload,json,fail,number,AppError } from '../../lib/server';
export async function POST(req:Request){try{const owner=await userId();const b=await payload(req);const timezone=typeof b.timezone==='string'?b.timezone:'Australia/Sydney';try{new Intl.DateTimeFormat('en',{timeZone:timezone}).format();}catch{throw new AppError('Choose a valid timezone.');}const p={goal:number(b.goal,20,400),calories:Math.round(number(b.calories,500,10000)),water:Math.round(number(b.water,250,10000)),timezone};await getDb().insert(preferences).values({owner,...p}).onConflictDoUpdate({target:preferences.owner,set:p});return json({ok:true});}catch(e){return fail(e);}}
