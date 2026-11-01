import test from 'node:test';
import assert from 'node:assert/strict';
import {createVault} from '../browser/vault.mjs';
import {createLocalApi,parseCsv,previewCsv,dateKey} from '../browser/local-api.mjs';
import {withingsAuthorization} from '../browser/withings.mjs';
function storage(){let blob;return{async read(){return structuredClone(blob);},async write(b,rev){assert.equal(blob?.revision??0,rev);blob=structuredClone(b);}};}
const password='test-passphrase-long';
test('saves local records offline and validates dates, values and preferences',async()=>{
 const vault=createVault(storage()),api=createLocalApi(vault),today=dateKey();await assert.rejects(api('data'),/Unlock/);await vault.create(password);
 await api('records',{kind:'weight',date:today,value:90});await api('records',{kind:'food',date:today,value:450,label:'Test salad'});let d=await api('data');assert.equal(d.entries.length,2);
 await assert.rejects(api('records',{kind:'weight',date:'2026-02-30',value:90}),/valid date/);await assert.rejects(api('records',{kind:'water',date:today,value:-5}),/between/);await assert.rejects(api('preferences',{goal:85,calories:2000,water:2500,timezone:'not/a-zone'}),/timezone/);
 const id=d.entries.find(e=>e.kind==='food').id;await api('records',{id},'DELETE');assert.equal((await api('data')).entries.length,1);
 await vault.lock();await vault.unlock(password);assert.equal((await api('data')).entries[0].value,90);
});
test('parses quoted CSV, converts pounds, skips bad dates and gives stable import IDs',async()=>{
 const text='Date,Weight (lb),Comments\r\n2026-10-20 07:00:00,200,"hello, world"\r\ninvalid,100,bad\r\n';
 assert.equal(parseCsv(text)[1][2],'hello, world');const a=await previewCsv(text,'lb'),b=await previewCsv(text,'lb');assert.equal(a.entries[0].value,90.718);assert.equal(a.skipped,1);assert.equal(a.entries[0].id,b.entries[0].id);await assert.rejects(previewCsv(text,'kg'),/unit/);
});
test('refreshes Withings tokens before measurement fetch and keeps manual records during sync',async()=>{
 const vault=createVault(storage()),api=createLocalApi(vault),today=dateKey();await vault.create(password);await api('records',{kind:'weight',date:today,value:91});await api('withings/configure',{clientId:'test-client-id',clientSecret:'test-client-secret'});await vault.mutate(d=>{d.withings.tokens={access_token:'old-access',refresh_token:'old-refresh',userid:'test-user',expiresAt:1};});
 const original=globalThis.fetch;let calls=0;globalThis.fetch=async(url,init)=>{calls++;const params=new URLSearchParams(init.body);assert.equal(init.credentials,'omit');assert.equal(new URL(url).search,'');assert.equal(new Headers(init.headers).has('Authorization'),false);
 if(String(url).includes('oauth2')){assert.equal(params.get('refresh_token'),'old-refresh');return Response.json({status:0,body:{access_token:'new-access',refresh_token:'new-refresh',userid:'test-user',expires_in:10800}});}
 assert.equal(vault.snapshot().withings.tokens.refresh_token,'new-refresh');assert.equal(params.get('access_token'),'new-access');return Response.json({status:0,body:{more:0,measuregrps:[{grpid:7,date:Math.floor(Date.now()/1000),measures:[{type:1,value:90000,unit:-3}]}]}});};
 try{assert.equal((await api('withings/sync',{})).imported,1);const d=await api('data');assert.equal(d.entries.length,2);assert.equal(d.entries.find(e=>e.source==='withings').value,90);assert.equal(calls,2);}finally{globalThis.fetch=original;}
});
test('OAuth URL uses exact callback, least privilege and a state value',()=>{const url=new URL(withingsAuthorization('test-id','https://example.test/form-health/oauth-callback.html','nonce'));assert.equal(url.searchParams.get('scope'),'user.metrics');assert.equal(url.searchParams.get('state'),'nonce');assert.equal(url.searchParams.get('redirect_uri'),'https://example.test/form-health/oauth-callback.html');assert.equal(url.searchParams.has('client_secret'),false);});
