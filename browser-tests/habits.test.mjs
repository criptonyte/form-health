import test from 'node:test';import assert from 'node:assert/strict';import {validateEntry,createLocalApi} from '../browser/local-api.mjs';import {createVault} from '../browser/vault.mjs';import {bodyAnalysis} from '../browser/analysis.ts';
test('calories need no meal label, and historical dates and times survive storage',async()=>{let value;const v=createVault({async read(){return value;},async write(n){value=n;}});await v.create('test-passphrase-long');const api=createLocalApi(v);await api('records',{kind:'food',date:'2025-01-02',time:'18:45',value:450});const rows=(await api('data')).entries;assert.equal(rows.length,1);assert.equal(rows[0].label,'');assert.equal(rows[0].loggedAt,'2025-01-02T18:45');assert.ok(rows[0].createdAt);assert.throws(()=>validateEntry({kind:'food',date:'2025-01-02',time:'25:00',value:450}),/valid time/);});
test('selected-period direction can show a supported decrease when the previous week is missing',()=>{const entries=[['2026-08-05',100],['2026-08-06',100],['2026-08-07',100],['2026-10-28',98],['2026-10-31',98],['2026-11-02',98]].map(([date,value])=>({id:date,kind:'weight',date,value,label:'',source:'withings'}));const a=bodyAnalysis(entries,90,'2026-11-02');assert.equal(a.delta,null);assert.equal(a.rangeDelta,-2);assert.equal(bodyAnalysis(entries,7,'2026-11-02').rangeDelta,null);});

test('calorie logging defaults on for legacy profiles and can be hidden without losing history',async()=>{
 let saved;const v=createVault({async read(){return saved;},async write(n){saved=n;}});await v.create('test-passphrase-long');const api=createLocalApi(v);
 await v.mutate(d=>{delete d.preferences.calorieTracking;});assert.equal((await api('data')).preferences.calorieTracking,true);
 await api('records',{kind:'food',date:'2026-01-02',time:'13:30',value:650});await api('features',{calorieTracking:false});
 assert.equal((await api('data')).preferences.calorieTracking,false);await assert.rejects(api('records',{kind:'food',date:'2026-01-03',value:100}),/turned off/);
 await api('features',{calorieTracking:true});assert.equal((await api('data')).entries[0].value,650);await assert.rejects(api('records',{kind:'water',date:'2026-01-02',value:250}),/entry type/);
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
