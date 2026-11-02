import test from 'node:test';
import assert from 'node:assert/strict';
import {bodyAnalysis,splitAtGaps} from '../browser/analysis.ts';
const entry=(date,value,bodyFat)=>({id:date+value,kind:'weight',date,value,bodyFat,label:'',source:'withings'});
test('calendar windows use earlier history at a chart boundary and require three measured days',()=>{
 const entries=[entry('2026-10-01',90),entry('2026-10-02',92),entry('2026-10-03',94)];
 const a=bodyAnalysis(entries,30,'2026-11-01');assert.equal(a.daily.length,1);assert.equal(a.rolling[0].smooth,92);assert.equal(a.currentValue,null);assert.equal(a.delta,null);
});
test('sparse readings leave gaps and do not invent a recent comparison',()=>{
 const entries=[entry('2026-10-02',95),entry('2026-10-03',96),entry('2026-10-04',94),entry('2026-10-29',97),entry('2026-11-01',93)];
 const a=bodyAnalysis(entries,60,'2026-11-01');assert.equal(a.gaps[0].missing,24);assert.equal(a.smoothSegments.length,1);assert.equal(a.rolling.at(-1).smooth,null);assert.equal(a.currentValue,null);assert.equal(a.delta,null);assert.equal(a.latest.value,93);
 assert.deepEqual(splitAtGaps(a.daily,3).map(s=>s.length),[3,2]);
});
test('body fat uses daily and rolling medians; changes are percentage points and missing estimates stay absent',()=>{
 const entries=[entry('2026-10-06',95,31),entry('2026-10-07',95,32),entry('2026-10-08',95,33),entry('2026-10-25',94,28),entry('2026-10-26',94,29),entry('2026-10-27',94,50),entry('2026-10-27',94,30),entry('2026-10-28',94,null),entry('2026-11-01',94,0)];
 const a=bodyAnalysis(entries,30,'2026-11-01','bodyFat');assert.equal(a.currentValue,29);assert.equal(a.previousValue,32);assert.equal(a.delta,null);assert.equal(a.comparisonMinimum,7);assert.equal(a.daily.length,6);assert.equal(a.daily.at(-1).value,40);assert.equal(a.rolling.at(-1).smooth,29);
});
test('axis stays consistent across periods; future and out of history readings are excluded',()=>{
 const entries=[entry('2026-08-10',100),entry('2026-10-28',92),entry('2026-11-01',90),entry('2026-11-02',200),entry('2026-01-01',300)];
 const a=bodyAnalysis(entries,30,'2026-11-01'),b=bodyAnalysis(entries,90,'2026-11-01');assert.equal(a.low,b.low);assert.equal(a.high,b.high);assert.equal(a.daily.length,2);assert.equal(b.daily.length,3);assert.equal(a.high>=100,true);
});
test('recent comparison weights measured days equally and does not change with the selected chart range',()=>{
 const entries=[entry('2026-10-20',96),entry('2026-10-21',96),entry('2026-10-22',96),entry('2026-10-28',94),entry('2026-10-29',94),entry('2026-11-01',92),entry('2026-11-01',96)];
 for(const days of [30,60,90]){const a=bodyAnalysis(entries,days,'2026-11-01');assert.equal(a.currentValue,94);assert.equal(a.previousValue,96);assert.equal(a.delta,-2);}
});
test('body-fat-only groups are analysed without manufacturing a weight',()=>{
 const a=bodyAnalysis([{id:'fat-only',kind:'bodyFat',date:'2026-11-01',value:27.5,label:'',source:'withings'}],30,'2026-11-01','bodyFat');assert.equal(a.latest.value,27.5);assert.equal(a.currentValue,null);
});

test('body fat compares only when both fortnight windows have at least seven measured days',()=>{
 const rows=Array.from({length:28},(_,i)=>entry(new Date(Date.parse('2026-11-01')-i*86400000).toISOString().slice(0,10),90,i<14?28:30));
 const complete=bodyAnalysis(rows,30,'2026-11-01','bodyFat');assert.equal(complete.delta,-2);
 const sparse=bodyAnalysis(rows.filter((_,i)=>i>=14||i<3),30,'2026-11-01','bodyFat');assert.equal(sparse.currentValue,28);assert.equal(sparse.previousValue,30);assert.equal(sparse.delta,null);
});
