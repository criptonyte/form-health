import test from 'node:test';
import assert from 'node:assert/strict';
import {calorieWeek} from '../browser/calorie-week.ts';

test('seven days include today and average only completed days with entries',()=>{
 const entries=[
  {kind:'food',date:'2026-11-08',value:480},
  {kind:'food',date:'2026-11-08',value:800},
  {kind:'food',date:'2026-11-03',value:560},
  {kind:'food',date:'2026-11-09',value:100},
  {kind:'food',date:'2026-11-02',value:200},
  {kind:'food',date:'2026-11-10',value:500},
  {kind:'weight',date:'2026-11-08',value:90},
 ];
 const {days,average}=calorieWeek(entries,'2026-11-09');
 assert.equal(days.length,7);
 assert.deepEqual(days[0],{key:'2026-11-03',count:1,total:560});
 assert.deepEqual(days[4],{key:'2026-11-07',count:0,total:0});
 assert.deepEqual(days[5],{key:'2026-11-08',count:2,total:1280});
 assert.deepEqual(days[6],{key:'2026-11-09',count:1,total:100});
 assert.equal(average,920);
 assert.equal(calorieWeek(entries.slice(3,4),'2026-11-09').average,null);
});

test('calendar arithmetic crosses month and year boundaries',()=>{
 const {days,average}=calorieWeek([],'2027-01-03');
 assert.deepEqual(days.map(day=>day.key),['2026-12-28','2026-12-29','2026-12-30','2026-12-31','2027-01-01','2027-01-02','2027-01-03']);
 assert.equal(average,null);
});
