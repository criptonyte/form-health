import test from 'node:test';
import assert from 'node:assert/strict';
import {createVault} from '../browser/vault.mjs';
import {createLocalApi,dateKey} from '../browser/local-api.mjs';

function storage(){
 let document, deviceKey;
 return {
  async read(){return structuredClone(document);},
  async write(value,revision){
   assert.equal(document?.revision??0,revision);
   document=structuredClone(value);
  },
  async readDeviceKey(){return structuredClone(deviceKey);},
  async writeDeviceKey(value){deviceKey=structuredClone(value);},
 };
}

test('opens a mixed legacy vault and exposes only existing calorie entries',async()=>{
 const store=storage();
 const legacy=createVault(store);
 await legacy.open();
 const today=dateKey();
 const calorie={id:'calorie',kind:'food',date:today,value:450,label:'Lunch',source:'manual'};
 const weight={id:'scale',kind:'weight',date:today,value:90,label:'',source:'withings',correctedWeight:89.7};
 const water={id:'water',kind:'water',date:today,value:250,label:'',source:'manual'};
 await legacy.mutate(data=>{
  data.entries.push(calorie,weight,water);
  data.preferences.calorieTracking=false;
  data.preferences.timezone='Pacific/Kiritimati';
  data.withings={clientId:'legacy-id',clientSecret:'legacy-secret',tokens:null};
 });

 const vault=createVault(store);
 assert.equal(await vault.open(),true);
 const api=createLocalApi(vault);
 assert.deepEqual(await api('data'),{entries:[calorie]});
 await assert.rejects(api('withings/sync',{}),/not available/);
 await api('records',{id:weight.id},'DELETE');
 await api('records',{id:calorie.id},'DELETE');
 assert.deepEqual((await api('data')).entries,[]);
 await api('records',calorie,'PUT');
 await api('records',calorie,'PUT');
 assert.deepEqual((await api('data')).entries,[calorie]);
 assert.deepEqual(vault.snapshot().entries,[weight,water,calorie]);
 assert.deepEqual(vault.snapshot().withings,legacy.snapshot().withings);
});

test('validates calorie amounts and calendar dates and persists a new entry',async()=>{
 const store=storage();
 const vault=createVault(store);
 const api=createLocalApi(vault);
 const today=dateKey();
 await assert.rejects(api('data'),/Unlock/);
 await vault.open();
 await assert.rejects(api('records',{kind:'weight',date:today,value:90}),/calorie entry/);
 await assert.rejects(api('records',{kind:'food',date:'2026-02-30',value:90}),/valid date/);
 await assert.rejects(api('records',{kind:'food',date:today,value:-5}),/between/);
 const {id}=await api('records',{kind:'food',date:today,time:'13:50',value:450});
 await assert.rejects(api('records',{id,value:500},'PATCH'),/not available/);
 const reopened=createVault(store);
 assert.equal(await reopened.open(),true);
 const {entries}=await createLocalApi(reopened)('data');
 assert.equal(entries.length,1);
 assert.equal(entries[0].value,450);
 assert.equal(entries[0].loggedAt,today+'T13:50');
});
