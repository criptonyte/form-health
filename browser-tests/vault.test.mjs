import test from 'node:test';
import assert from 'node:assert/strict';
import {createVault} from '../browser/vault.mjs';
function memoryStorage(){let record=null;return{async read(){return structuredClone(record);},async write(value,revision){assert.equal(record?.revision??0,revision);record=structuredClone(value);},saved(){return record;}};}
const password='local-test-passphrase';
test('vault encrypts records and credentials, rejects wrong passphrases and restores backups',async()=>{
 const store=memoryStorage(),first=createVault(store);await first.create(password);
 await first.mutate(data=>{data.entries.push({id:'entry-1',kind:'food',date:'2026-10-01',value:450,label:'Private test meal',source:'manual'});data.withings={clientId:'test-client-id',clientSecret:'private-test-secret',tokens:null};});
 const backup=await first.backup();assert.equal(backup.includes('Private test meal'),false);assert.equal(backup.includes('private-test-secret'),false);
 await first.lock();assert.throws(()=>first.snapshot(),/Unlock/);await assert.rejects(first.unlock('wrong-password'),/Could not unlock/);await first.unlock(password);assert.equal(first.snapshot().entries[0].label,'Private test meal');
 const restored=createVault(memoryStorage());const result=await restored.restore(backup,password);assert.equal(result.entries,1);assert.equal(restored.snapshot().withings.clientSecret,'private-test-secret');
 const corrupted=JSON.parse(backup);corrupted.ciphertext=corrupted.ciphertext.slice(0,-5)+'AAAAA';await assert.rejects(createVault(memoryStorage()).restore(JSON.stringify(corrupted),password),/Could not unlock/);
});
test('failed writes do not change the in-memory records',async()=>{
 const storage=memoryStorage(),vault=createVault(storage);await vault.create(password);const originalWrite=storage.write;storage.write=async()=>{throw new Error('disk full');};await assert.rejects(vault.mutate(d=>{d.preferences.goal=80;}),/disk full/);assert.equal(vault.snapshot().preferences.goal,85);storage.write=originalWrite;
});
test('serialises concurrent changes and rejects stale writes from another tab',async()=>{
 const storage=memoryStorage(),a=createVault(storage),b=createVault(storage);await a.create(password);await b.unlock(password);
 await Promise.all([a.mutate(d=>{d.preferences.goal=84;}),a.mutate(d=>{d.preferences.water=2750;})]);assert.equal(a.snapshot().preferences.goal,84);assert.equal(a.snapshot().preferences.water,2750);await assert.rejects(b.mutate(d=>{d.preferences.goal=70;}));assert.equal((await storage.read()).revision,3);
});
