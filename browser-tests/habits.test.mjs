import test from 'node:test';import assert from 'node:assert/strict';import {validateEntry,createLocalApi} from '../browser/local-api.mjs';import {createVault} from '../browser/vault.mjs';import {weightNotice,reconcileWeightNotification} from '../browser/weight-notification.mjs';import {bodyAnalysis} from '../browser/analysis.ts';
test('calories need no meal label, and historical dates and times survive storage',async()=>{let value;const v=createVault({async read(){return value;},async write(n){value=n;}});await v.create('test-passphrase-long');const api=createLocalApi(v);await api('records',{kind:'food',date:'2025-01-02',time:'18:45',value:450});const rows=(await api('data')).entries;assert.equal(rows.length,1);assert.equal(rows[0].label,'');assert.equal(rows[0].loggedAt,'2025-01-02T18:45');assert.ok(rows[0].createdAt);assert.throws(()=>validateEntry({kind:'food',date:'2025-01-02',time:'25:00',value:450}),/valid time/);});
test('selected-period direction can show a supported decrease when the previous week is missing',()=>{const entries=[['2026-08-05',100],['2026-08-06',100],['2026-08-07',100],['2026-10-28',98],['2026-10-31',98],['2026-11-02',98]].map(([date,value])=>({id:date,kind:'weight',date,value,label:'',source:'withings'}));const a=bodyAnalysis(entries,90,'2026-11-02');assert.equal(a.delta,null);assert.equal(a.rangeDelta,-2);assert.equal(bodyAnalysis(entries,7,'2026-11-02').rangeDelta,null);});

test('calorie logging defaults on for legacy profiles and can be hidden without losing history',async()=>{
 let saved;const v=createVault({async read(){return saved;},async write(n){saved=n;}});await v.create('test-passphrase-long');const api=createLocalApi(v);
 await v.mutate(d=>{delete d.preferences.calorieTracking;});assert.equal((await api('data')).preferences.calorieTracking,true);
 await api('records',{kind:'food',date:'2026-01-02',time:'13:30',value:650});await api('features',{calorieTracking:false});
 assert.equal((await api('data')).preferences.calorieTracking,false);await assert.rejects(api('records',{kind:'food',date:'2026-01-03',value:100}),/turned off/);
 await api('features',{calorieTracking:true});assert.equal((await api('data')).entries[0].value,650);await assert.rejects(api('records',{kind:'water',date:'2026-01-02',value:250}),/entry type/);
});
const scale=(id,date,value,createdAt)=>({id,kind:'weight',source:'withings',date,value,createdAt});
test('weight notice uses latest individual Withings measurement, dated and neutral, never demo or body fat',()=>{
 const rows=[scale('first','2026-11-02',95.5,10),scale('last','2026-11-02',94.6,20),{...scale('demo','2026-11-02',80,30),source:'demo'},{id:'fat',kind:'bodyFat',source:'withings',date:'2026-11-02',value:28},scale('future','2026-11-03',95,40)];
 const n=weightNotice(rows,'2026-11-02');assert.equal(n.value,'94.6');assert.match(n.options.body,/2 Nov 2026/);assert.equal(n.options.silent,true);assert.equal(n.options.renotify,false);assert.equal(n.options.tag,'form-latest-weight');assert.doesNotMatch(n.title+n.options.body,/remaining|target|down|up|goal/i);assert.equal(weightNotice(rows.filter(e=>e.source==='demo'),'2026-11-02'),null);
});
test('weight notice respects dismissal until a new measurement, replaces silently and closes when disabled',async()=>{
 const shown=[],closed=[];const reg={getNotifications:async({tag})=>[{close:()=>closed.push(tag)}],showNotification:async(title,options)=>shown.push({title,options})};
 const rows=[scale('a','2026-11-02',94.6,10)],prefs={weightNotification:true};let key=await reconcileWeightNotification(reg,rows,prefs,'2026-11-02',v=>'badge:'+v);assert.equal(shown.length,1);assert.equal(shown[0].options.badge,'badge:95');assert.ok(closed.includes('form-water-today'));
 assert.equal(await reconcileWeightNotification(reg,rows,{...prefs,weightNoticeKey:key},'2026-11-02'),null);assert.equal(shown.length,1);
 await reconcileWeightNotification(reg,[...rows,scale('b','2026-11-02',94.7,20)],{...prefs,weightNoticeKey:key},'2026-11-02');assert.equal(shown.length,2);
 await reconcileWeightNotification(reg,rows,{weightNotification:false},'2026-11-02');assert.ok(closed.includes('form-latest-weight'));
 await reconcileWeightNotification(reg,[],prefs,'2026-11-02');assert.equal(shown.length,2);
});
test('weight notification preference supports explicit re-show and disabling without changing calorie settings',async()=>{
 let saved;const v=createVault({async read(){return saved;},async write(n){saved=n;}});await v.create('test-passphrase-long');const api=createLocalApi(v);
 await api('weight-notification',{enabled:true});await api('weight-notification-state',{key:'test-reading'});assert.equal((await api('data')).preferences.weightNoticeKey,'test-reading');
 await api('weight-notification',{enabled:true});assert.equal((await api('data')).preferences.weightNoticeKey,null);
 await api('weight-notification',{enabled:false});await api('weight-notification-state',{key:'late-in-flight-result'});const p=(await api('data')).preferences;assert.equal(p.weightNotification,false);assert.equal(p.weightNoticeKey,null);assert.equal(p.calorieTracking,true);
});
