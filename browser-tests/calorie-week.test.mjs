import test from 'node:test';
import assert from 'node:assert/strict';
import {completedDayTotals} from '../browser/calorie-week.ts';

test('seven completed calendar days exclude today, sum entries and distinguish days without logs',()=>{
 const entries=[
  {kind:'food',date:'2026-11-08',value:480},
  {kind:'food',date:'2026-11-08',value:800},
  {kind:'food',date:'2026-11-02',value:560},
  {kind:'food',date:'2026-11-09',value:100},
  {kind:'food',date:'2026-11-01',value:200},
  {kind:'weight',date:'2026-11-08',value:90},
 ];
 const week=completedDayTotals(entries,'2026-11-09');
 assert.equal(week.length,7);
 assert.deepEqual(week[0],{key:'2026-11-08',count:2,total:1280});
 assert.deepEqual(week[1],{key:'2026-11-07',count:0,total:0});
 assert.deepEqual(week[6],{key:'2026-11-02',count:1,total:560});
});

test('calendar arithmetic crosses month and year boundaries',()=>{
 const week=completedDayTotals([],'2027-01-03');
 assert.deepEqual(week.map(day=>day.key),['2027-01-02','2027-01-01','2026-12-31','2026-12-30','2026-12-29','2026-12-28','2026-12-27']);
});
