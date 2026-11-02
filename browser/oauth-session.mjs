import {requestTokens} from './withings.mjs';
export async function completeOAuth(engine,{state,code,error}){
 if(!state||state.length>200||!code&&!error)throw new Error('No valid Withings response. Start again from Form.');
 if(!await engine.exists()||!await engine.open())throw new Error('This browser cannot open the saved Form connection. Return to the browser where you started connecting.');
 const c=engine.snapshot().withings,p=c?.pendingAuth;
 if(!p||p.state!==state||p.expiresAt<Date.now()||p.status!=='pending')throw new Error('This connection attempt has expired or was already used. Start again from Form.');
 if(error){const message='Withings permission was declined. Start again from Form.';await engine.mutate(d=>{d.withings.pendingAuth={state,status:'error',message,expiresAt:p.expiresAt};});throw new Error(message);}
 if(typeof code!=='string'||!code||code.length>1024)throw new Error('Withings returned an invalid authorisation code.');
 await engine.mutate(d=>{const current=d.withings?.pendingAuth;if(current?.state!==state||current.status!=='pending')throw new Error('This connection attempt is no longer active.');current.status='exchanging';});
 try{const tokens=await requestTokens(c,{grant_type:'authorization_code',code,redirect_uri:p.redirectUri});await engine.mutate(d=>{if(d.withings?.pendingAuth?.state!==state||d.withings.pendingAuth.status!=='exchanging')throw new Error('The connection changed. Start again from Form.');d.withings.tokens=tokens;d.withings.pendingAuth={state,status:'saved',expiresAt:p.expiresAt};});}
 catch(e){await engine.mutate(d=>{if(d.withings?.pendingAuth?.state===state)d.withings.pendingAuth={state,status:'error',message:e.message,expiresAt:p.expiresAt};}).catch(()=>{});throw e;}
}
