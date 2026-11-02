import test from 'node:test';
import assert from 'node:assert/strict';
import {bodyInsight} from '../browser/analysis.ts';
const today='2026-11-02';
const rows=(startWeight,endWeight,startFat,endFat)=>Array.from({length:30},(_,i)=>({id:String(i),kind:'weight',source:'withings',label:'',date:new Date(Date.parse(today)-(29-i)*86400000).toISOString().slice(0,10),value:i<14?startWeight:endWeight,bodyFat:i<14?startFat:endFat}));
test('insight keeps weight primary and finds lower fat mass even with unchanged fat percentage',()=>{
 const a=bodyInsight(rows(100,98,30,30),30,today);assert.equal(a.weightDelta,-2);assert.equal(a.fatDelta,-.6);assert.equal(a.context,'Fat estimate also lower.');
});
test('conflicting signals do not manufacture muscle gain or a fat-loss verdict',()=>{
 const a=bodyInsight(rows(100,98,30,33),30,today);assert.equal(a.context,'Composition change unclear.');
 const b=bodyInsight(rows(100,100,30,29),30,today);assert.equal(b.context,'Possible composition change; unconfirmed.');
});
test('missing fat does not suppress supported weight change; standalone fat cannot be paired',()=>{
 const data=rows(100,98,null,null);data.push({id:'fat-only',kind:'bodyFat',date:today,value:20,source:'withings',label:''});
 const a=bodyInsight(data,30,today);assert.equal(a.weightDelta,-2);assert.equal(a.fatDelta,null);assert.equal(a.context,'Too few paired fat readings.');
});
test('counts measured days, withholds sparse endpoints, ignores future and out-of-period readings',()=>{
 const data=rows(100,98,30,29).filter((_,i)=>i<14||i>=27);
 const a=bodyInsight(data,30,today);assert.equal(a.weightDelta,-2);assert.equal(a.fatDelta,null);
 const b=bodyInsight(data.filter(e=>e.date<today),30,today);assert.equal(b.weightDelta,null);assert.equal(b.context,'More weight readings needed.');
 const complete=rows(100,98,30,30);const before=bodyInsight(complete,30,today);complete.push({...complete[0],id:'future',date:'2026-11-03',value:200},{...complete[0],id:'old',date:'2026-01-01',value:200});assert.deepEqual(bodyInsight(complete,30,today),before);
});
test('fat mass is computed per paired reading before daily and period medians',()=>{
 const data=rows(100,100,30,30);data.push({...data[0],id:'paired-second',value:80,bodyFat:50});
 const a=bodyInsight(data,30,today);assert.equal(a.fatDelta,0);assert.equal(a.fatStartCount,14);
});
