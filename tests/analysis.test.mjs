import test from 'node:test';
import assert from 'node:assert/strict';
import { dailyWeights, weightAnalysis, dayKey } from '../app/lib/analysis.ts';
const e=(date,value)=>({id:date+value,kind:'weight',date,value,label:'',source:'manual'});
test('averages multiple same-day readings before computing the trend',()=>{
 const daily=dailyWeights([e('2026-11-01',90),e('2026-11-01',92),e('2026-10-31',93)]);
 assert.deepEqual(daily,[{date:'2026-10-31',value:93},{date:'2026-11-01',value:91}]);
});
test('uses seven calendar days rather than the last seven readings',()=>{
 const a=weightAnalysis([e('2026-10-01',100),e('2026-10-26',92),e('2026-11-01',90)],90,'2026-11-01');
 assert.equal(a.average,91);assert.equal(a.rolling.at(-1).average,91);
});
test('weights each day equally and computes weekly regression in kg/week',()=>{
 const a=weightAnalysis([e('2026-10-18',94),e('2026-10-25',92),e('2026-11-01',90),e('2026-11-01',90)],30,'2026-11-01');
 assert.equal(a.rate,-2);assert.equal(a.change,-4);
});
test('excludes out-of-window and future measurements',()=>{
 const a=weightAnalysis([e('2026-10-02',100),e('2026-10-03',94),e('2026-11-01',90),e('2026-11-02',80)],30,'2026-11-01');
 assert.equal(a.daily.length,2);assert.equal(a.change,-4);assert.equal(a.latest,90);
});
test('does not invent a recent average or regression without enough data',()=>{
 const a=weightAnalysis([e('2026-10-01',94)],90,'2026-11-01');assert.equal(a.average,null);assert.equal(a.rate,null);assert.equal(a.change,null);
 assert.equal(weightAnalysis([],90,'2026-11-01').latest,null);
});
test('uses selected timezone at day boundaries',()=>{
 assert.equal(dayKey(new Date('2026-10-31T14:30:00Z'),'Australia/Sydney'),'2026-11-01');
 assert.equal(dayKey(new Date('2026-10-31T14:30:00Z'),'Etc/UTC'),'2026-10-31');
});
