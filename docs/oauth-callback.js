'use strict';
const params=new URLSearchParams(location.search);
const message={type:'form-withings-callback',code:params.get('code'),state:params.get('state'),error:params.get('error')};
history.replaceState(null,'',location.pathname);
let connected=false;
if(message.state&&(message.code||message.error)){
 if(window.opener){window.opener.postMessage(message,location.origin);connected=true;}
 if('BroadcastChannel'in window){const channel=new BroadcastChannel('form-withings-auth');channel.postMessage(message);setTimeout(()=>channel.close(),30000);connected=true;}
 document.querySelector('h1').textContent=message.error?'Connection cancelled.':'Return to your original Form window.';
 document.querySelector('#status').textContent=message.error?'You can try connecting again from Connections.':'Form will finish connecting in the original window. If Android closed that window, reopen Form, unlock it and connect again. No credentials are stored in this callback page.';
}else{document.querySelector('h1').textContent='No connection to finish.';document.querySelector('#status').textContent='Open Form and start the connection from Connections.';}
