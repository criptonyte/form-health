export const TOKEN_URL='https://wbsapi.withings.net/v2/oauth2';
export const MEASURE_URL='https://wbsapi.withings.net/measure';
async function post(url,params){let res;try{res=await fetch(url,{method:'POST',body:new URLSearchParams(params),credentials:'omit',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(20000)});}catch{throw new Error('Could not reach Withings. Check your connection. Direct browser access may also have been restricted by Withings.');}if(!res.ok)throw new Error('Withings is temporarily unavailable. Try again later.');let body;try{body=await res.json();}catch{throw new Error('Withings returned an unreadable response.');}if(body.status!==0){if(body.status===401||body.status===402)throw new Error('Withings access has expired or was rejected. Reconnect your account.');if(url===TOKEN_URL)throw new Error('Withings rejected authentication. Check the app credentials and callback URL, then reconnect.');throw new Error('Withings could not return measurements. Try reconnecting your account.');}return body.body;}
export async function requestTokens(connection,fields){const b=await post(TOKEN_URL,{action:'requesttoken',client_id:connection.clientId,client_secret:connection.clientSecret,...fields});if(!b?.access_token||!b.refresh_token||!Number.isFinite(Number(b.expires_in)))throw new Error('Withings returned incomplete authentication details.');return{access_token:b.access_token,refresh_token:b.refresh_token,userid:String(b.userid),expiresAt:Date.now()+Number(b.expires_in)*1000};}
export function callbackUrl(){return new URL('oauth-callback.html',document.baseURI).href;}
export function withingsAuthorization(clientId,redirectUri,state){return 'https://account.withings.com/oauth2_user/authorize2?'+new URLSearchParams({response_type:'code',client_id:clientId,scope:'user.metrics',redirect_uri:redirectUri,state});}
export function authoriseInPopup(connection,signal){
 const state=crypto.randomUUID()+crypto.randomUUID(),redirectUri=callbackUrl();let popup,channel,finished=false,timer,closePoll;
 return new Promise((resolve,reject)=>{
 const cleanup=()=>{window.removeEventListener('message',receive);signal?.removeEventListener('abort',cancel);channel?.close();clearTimeout(timer);clearInterval(closePoll);};
 const cancel=()=>{if(finished)return;finished=true;cleanup();popup?.close();reject(new Error('Withings connection cancelled. You can connect again when ready.'));};
 signal?.addEventListener('abort',cancel,{once:true});
 const accept=message=>{if(finished||!message||message.type!=='form-withings-callback'||message.state!==state)return;if(message.error){finished=true;cleanup();popup?.close();reject(new Error('Withings connection was cancelled.'));return;}if(typeof message.code!=='string'||message.code.length>1024)return;finished=true;cleanup();popup?.close();resolve({code:message.code,redirectUri});};
 function receive(event){if(event.origin===location.origin&&event.source===popup)accept(event.data);}
 window.addEventListener('message',receive);if('BroadcastChannel'in window){channel=new BroadcastChannel('form-withings-auth');channel.onmessage=e=>accept(e.data);}
 popup=window.open(withingsAuthorization(connection.clientId,redirectUri,state),'form-withings-login','popup,width=520,height=720');
 if(!popup){cleanup();reject(new Error('Allow pop-ups for Form, then tap Connect again.'));return;}
 closePoll=setInterval(()=>{if(!finished&&popup?.closed)cancel();},1000);
 timer=setTimeout(()=>{if(!finished){finished=true;cleanup();reject(new Error('The Withings window timed out. Keep Form open and unlocked, then try again.'));}},600000);
 });
}
function dateAt(date,timezone){const p=new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);return['year','month','day'].map(t=>p.find(q=>q.type===t).value).join('-');}
export async function fetchMeasurements(tokens,timezone){let offset=0,finished=false;const end=Math.floor(Date.now()/1000),start=end-91*86400;const result=[];
 for(let page=0;page<20;page++){
 // A form-body bearer token avoids the Authorization-header CORS preflight.
 // The token stays in the HTTPS request body, never in a URL or browser history.
 const body=await post(MEASURE_URL,{action:'getmeas',access_token:tokens.access_token,meastypes:'1,6',category:'1',startdate:String(start),enddate:String(end),offset:String(offset)});
 for(const g of body.measuregrps||[]){const w=g.measures?.find(m=>m.type===1),fat=g.measures?.find(m=>m.type===6);if(!w)continue;const value=w.value*10**w.unit;if(!Number.isFinite(value)||value<20||value>400)continue;result.push({id:`withings:${tokens.userid}:${g.grpid}`,kind:'weight',date:dateAt(new Date(g.date*1000),timezone),value:Math.round(value*1000)/1000,bodyFat:fat?fat.value*10**fat.unit:null,label:'',source:'withings',createdAt:g.date*1000});}
 if(!body.more){finished=true;break;}if(body.offset===offset)throw new Error('Withings returned an incomplete page. Try syncing again.');offset=body.offset;
 }if(!finished)throw new Error('Too many measurement pages. Nothing was replaced.');return result;
}
