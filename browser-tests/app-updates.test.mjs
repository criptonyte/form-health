import test from 'node:test';
import assert from 'node:assert/strict';
import {watchAppUpdates} from '../browser/app-updates.mjs';
import {INITIAL_PREFERENCES,validateDocument} from '../browser/vault.mjs';
import {validatePreferences} from '../browser/local-api.mjs';
test('updates announce waiting worker without activation and clean up listeners',()=>{
 const registration=new EventTarget(),worker=new EventTarget();registration.waiting=null;registration.installing=worker;worker.state='installing';let ready=[];
 const stop=watchAppUpdates(registration,w=>ready.push(w));assert.equal(ready.length,0);
 worker.state='installed';registration.waiting=worker;worker.dispatchEvent(new Event('statechange'));assert.deepEqual(ready,[worker]);stop();worker.dispatchEvent(new Event('statechange'));assert.equal(ready.length,1);
 const already=[];watchAppUpdates(registration,w=>already.push(w))();assert.deepEqual(already,[worker]);
});
test('weight goals are no longer required, exposed as defaults, or accepted by preferences',()=>{
 assert.equal('goal' in INITIAL_PREFERENCES,false);
 assert.equal('goal' in validatePreferences({...INITIAL_PREFERENCES,goal:85}),false);
 assert.doesNotThrow(()=>validateDocument({version:1,entries:[],preferences:{...INITIAL_PREFERENCES},withings:null}));
 assert.doesNotThrow(()=>validateDocument({version:1,entries:[],preferences:{...INITIAL_PREFERENCES,goal:85},withings:null}));
});
