import {vault} from './vault.mjs';
import {completeOAuth} from './oauth-session.mjs';
const query=new URLSearchParams(location.search),response={state:query.get('state'),code:query.get('code'),error:query.get('error')};
history.replaceState(null,'',location.pathname);
const title=document.querySelector('h1'),status=document.querySelector('#status');
try{await completeOAuth(vault,response);title.textContent='Withings is connected.';status.textContent='Your connection has been saved on this device. Return to Form to sync your measurements. You can close this tab.';
 const message={type:'form-withings-saved',state:response.state};try{window.opener?.postMessage(message,location.origin);}catch{}if('BroadcastChannel'in window){const channel=new BroadcastChannel('form-withings-auth');channel.postMessage(message);setTimeout(()=>channel.close(),1000);}
}catch(e){title.textContent='Connection could not be saved.';status.textContent=e.message;}
