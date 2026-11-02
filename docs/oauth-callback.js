
'use strict';
const params=new URLSearchParams(location.search);
const message={type:'form-withings-callback',code:params.get('code'),state:params.get('state'),error:params.get('error')};
history.replaceState(null,'',location.pathname);
const title=document.querySelector('h1'),status=document.querySelector('#status');
if(message.state&&(message.code||message.error)){
 let channel,done=false;
 const receive=data=>{if(done||data?.type!=='form-withings-result'||data.state!==message.state)return;done=true;clearInterval(retry);clearTimeout(expiry);channel?.close();title.textContent=data.error?'Connection was not saved.':'Withings is connected.';status.textContent=data.error?data.error+' Return to Form and try again.':'Your connection is saved. Return to Form to see your measurements. You can close this tab.';};
 window.addEventListener('message',event=>{if(event.origin===location.origin)receive(event.data);});
 if('BroadcastChannel'in window){channel=new BroadcastChannel('form-withings-auth');channel.onmessage=event=>receive(event.data);}
 const send=()=>{try{window.opener?.postMessage(message,location.origin);}catch{}channel?.postMessage(message);};
 title.textContent=message.error?'Connection cancelled.':'Finishing your connection…';
 status.textContent='Keep this tab open and switch back to your original Form window so it can save the connection. This page will confirm when it succeeds.';
 const retry=setInterval(send,500),expiry=setTimeout(()=>{if(done)return;clearInterval(retry);channel?.close();title.textContent='Connection was not confirmed.';status.textContent='Return to your original Form window and check Connections. If it still says Connect Withings, try again and return to Form immediately after approving access.';},45000);
 send();
}else{title.textContent='No connection to finish.';status.textContent='Open Form and start the connection from Connections.';}
