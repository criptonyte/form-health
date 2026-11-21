import test from 'node:test';import assert from 'node:assert/strict';import {validateEntry,createLocalApi} from '../browser/local-api.mjs';import {createVault} from '../browser/vault.mjs';
test('calories need no meal label, and historical dates and times survive storage',async()=>{let value;const v=createVault({async read(){return value;},async write(n){value=n;}});await v.create('test-passphrase-long');const api=createLocalApi(v);await api('records',{kind:'food',date:'2025-01-02',time:'18:45',value:450});const rows=(await api('data')).entries;assert.equal(rows.length,1);assert.equal(rows[0].label,'');assert.equal(rows[0].loggedAt,'2025-01-02T18:45');assert.ok(rows[0].createdAt);assert.throws(()=>validateEntry({kind:'food',date:'2025-01-02',time:'25:00',value:450}),/valid time/);});

test('calories stay visible and writable for profiles that previously disabled the journal',async()=>{
 let saved;const v=createVault({async read(){return saved;},async write(n){saved=n;}});await v.create('test-passphrase-long');const api=createLocalApi(v);
 await api('records',{kind:'food',date:'2026-01-02',time:'13:30',value:650});
 await v.mutate(d=>{d.preferences.calorieTracking=false;});
 await api('records',{kind:'food',date:'2026-01-03',value:100});
 assert.deepEqual((await api('data')).entries.map(entry=>entry.value),[100,650]);
 await assert.rejects(api('records',{kind:'water',date:'2026-01-02',value:250}),/calorie entry/);
});

test('retiring notifications closes both Form notices without publishing or changing records',async()=>{
 const {dismissLegacyNotifications}=await import('../browser/retire-notifications.mjs');
 const closed=[];
 await dismissLegacyNotifications({getNotifications:async({tag})=>[{close:()=>closed.push(tag)}],showNotification:()=>assert.fail('must not publish')});
 assert.deepEqual(closed,['form-latest-weight','form-water-today']);
 await dismissLegacyNotifications({});
 await dismissLegacyNotifications({getNotifications:async()=>{throw new Error('Permission denied');}});
 let saved;const v=createVault({async read(){return saved;},async write(n){saved=n;}});await v.create('test-passphrase-long');
 const api=createLocalApi(v);await api('records',{kind:'food',date:'2026-01-02',value:650});
 await v.mutate(d=>{d.preferences.weightNotification=true;d.preferences.weightNoticeKey='legacy';});
 await assert.rejects(api('weight-notification',{enabled:true}),/not available/);
 await assert.rejects(api('weight-notification-state',{key:'new'}),/not available/);
 assert.equal((await api('data')).entries[0].value,650);
});
