import test from 'node:test';
import assert from 'node:assert/strict';
import {watchAppUpdates} from '../browser/app-updates.mjs';
test('updates announce waiting worker without activation and clean up listeners',()=>{
 const registration=new EventTarget(),worker=new EventTarget();registration.waiting=null;registration.installing=worker;worker.state='installing';let ready=[];
 const stop=watchAppUpdates(registration,w=>ready.push(w));assert.equal(ready.length,0);
 worker.state='installed';registration.waiting=worker;worker.dispatchEvent(new Event('statechange'));assert.deepEqual(ready,[worker]);stop();worker.dispatchEvent(new Event('statechange'));assert.equal(ready.length,1);
 const already=[];watchAppUpdates(registration,w=>already.push(w))();assert.deepEqual(already,[worker]);
});
