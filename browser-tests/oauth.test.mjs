import test from 'node:test';
import assert from 'node:assert/strict';
import {authoriseInPopup} from '../browser/withings.mjs';
test('OAuth callback ignores wrong origins and state, then consumes the matching callback once',async()=>{
 const old={window:globalThis.window,document:globalThis.document,location:globalThis.location,BroadcastChannel:globalThis.BroadcastChannel};
 const handlers=new Map();let openedUrl;const popup={closed:true,postMessage(){},close(){this.closed=true;}};
 globalThis.window={addEventListener:(n,fn)=>handlers.set(n,fn),removeEventListener:n=>handlers.delete(n),open:url=>{openedUrl=url;return popup;}};
 globalThis.document={baseURI:'https://example.test/form-health/'};globalThis.location={origin:'https://example.test'};globalThis.BroadcastChannel=undefined;
 try{const result=authoriseInPopup({clientId:'test-client-id'}),state=new URL(openedUrl).searchParams.get('state'),receive=handlers.get('message');
 await new Promise(resolve=>setTimeout(resolve,1100));assert.equal(handlers.has('message'),true,'A severed popup proxy must not cancel the login listener');
 receive({origin:'https://evil.test',source:popup,data:{type:'form-withings-callback',state,code:'wrong-origin'}});assert.equal(handlers.has('message'),true);
 receive({origin:'https://example.test',source:popup,data:{type:'form-withings-callback',state:'wrong',code:'wrong-state'}});assert.equal(handlers.has('message'),true);
 receive({origin:'https://example.test',source:popup,data:{type:'form-withings-callback',state,code:'correct-code'}});const response=await result;assert.equal(response.code,'correct-code');assert.equal(response.redirectUri,'https://example.test/form-health/oauth-callback.html');assert.equal(handlers.size,0);assert.equal(typeof response.complete,'function');response.complete();
 }finally{for(const [k,v] of Object.entries(old)){if(v===undefined)delete globalThis[k];else globalThis[k]=v;}}
});
