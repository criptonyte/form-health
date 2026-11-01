import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { SourceTextModule, SyntheticModule } from 'node:vm';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import ts from 'typescript';
const sqlite=new DatabaseSync(':memory:');
for(const file of readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())sqlite.exec(readFileSync('drizzle/'+file,'utf8'));
let identity=new Headers();
const statement=(sql,params=[])=>({bind(...values){return statement(sql,values);},async all(){return {results:sqlite.prepare(sql).all(...params),success:true,meta:{}};},async raw(){const s=sqlite.prepare(sql);s.setReturnArrays(true);return s.all(...params);},async run(){const r=sqlite.prepare(sql).run(...params);return {results:[],success:true,meta:{changes:Number(r.changes)}};}});
const DB={prepare:sql=>statement(sql),batch:async queries=>{sqlite.exec('BEGIN');try{const result=await Promise.all(queries.map(q=>q.all()));sqlite.exec('COMMIT');return result;}catch(e){sqlite.exec('ROLLBACK');throw e;}}};
const cache=new Map();
async function synthetic(name,obj){if(cache.has(name))return cache.get(name);const m=new SyntheticModule(Object.keys(obj),function(){for(const [key,value]of Object.entries(obj))this.setExport(key,value);},{identifier:name});cache.set(name,m);return m;}
async function load(file){if(cache.has(file))return cache.get(file);const code=ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;const m=new SourceTextModule(code,{identifier:file});cache.set(file,m);return m;}
async function linker(spec,ref){
 if(spec==='cloudflare:workers')return synthetic(spec,{env:{DB}});
 if(spec==='next/headers')return synthetic(spec,{headers:async()=>identity});
 if(spec==='next/navigation')return synthetic(spec,{redirect:()=>{throw new Error('redirect');}});
 if(!spec.startsWith('.'))return synthetic(spec,await import(spec));
 const base=resolve(dirname(ref.identifier),spec),target=[base,base+'.ts',resolve(base,'index.ts')].find(p=>existsSync(p)&&p.endsWith('.ts'));
 if(!target)throw new Error('Cannot resolve '+spec);return load(target);
 }

const data=await load(resolve('app/api/data/route.ts')),records=await load(resolve('app/api/records/route.ts')),prefs=await load(resolve('app/api/preferences/route.ts'));await data.link(linker);await data.evaluate();await records.link(linker);await records.evaluate();await prefs.link(linker);await prefs.evaluate();
function login(id){identity=new Headers(id?{'oai-authenticated-user-id':id,'oai-authenticated-user-email':id+'@test.invalid'}:{});}
function req(path,body,origin='https://form.test'){return new Request('https://form.test/api/'+path,{method:'POST',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify(body)});}
const today=new Date().toISOString().slice(0,10);
test('authenticated records persist, remain isolated, and reject invalid writes',async()=>{
 login(null);assert.equal((await data.namespace.GET()).status,401);assert.equal((await records.namespace.POST(req('records',{kind:'weight',date:today,value:90}))).status,401);
 login('alice');assert.equal((await records.namespace.POST(req('records',{kind:'weight',date:today,value:90},'https://evil.test'))).status,403);
 assert.equal((await records.namespace.POST(req('records',{kind:'food',date:today,value:0,label:'Test food'}))).status,400);
 assert.equal((await records.namespace.POST(req('records',{kind:'weight',date:'2099-01-01',value:90}))).status,400);
 const saved=await records.namespace.POST(req('records',{kind:'weight',date:today,value:90}));assert.equal(saved.status,201);const {id}=await saved.json();
 let d=await (await data.namespace.GET()).json();assert.equal(d.entries.length,1);assert.equal(d.entries[0].value,90);assert.equal('owner'in d.entries[0],false);
 login('bob');d=await (await data.namespace.GET()).json();assert.equal(d.entries.length,0);
 await records.namespace.DELETE(req('records',{id}));
 login('alice');d=await (await data.namespace.GET()).json();assert.equal(d.entries.length,1);
 assert.equal((await prefs.namespace.POST(req('preferences',{goal:84,calories:2100,water:2600,timezone:'Australia/Sydney'}))).status,200);
 d=await (await data.namespace.GET()).json();assert.equal(d.preferences.goal,84);
 login('bob');d=await (await data.namespace.GET()).json();assert.equal(d.preferences.goal,85);
 login('alice');await records.namespace.DELETE(req('records',{id}));d=await (await data.namespace.GET()).json();assert.equal(d.entries.length,0);
});
