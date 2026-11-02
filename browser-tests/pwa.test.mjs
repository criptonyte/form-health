import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
test('Form installs with a distinct identity from the older currency app on the same origin',async()=>{
 const m=JSON.parse(await readFile(new URL('../browser-public/manifest.webmanifest',import.meta.url),'utf8'));
 const origin='https://criptonyte.github.io',manifestUrl=origin+'/form-health/manifest.webmanifest',start=new URL(m.start_url,manifestUrl),id=new URL(m.id,start.origin),scope=new URL(m.scope,manifestUrl);
 assert.equal(id.href,origin+'/form-health/');assert.notEqual(id.href,new URL('./',origin).href);assert.equal(start.href.startsWith(scope.href),true);assert.equal(new URL(origin+'/currency-converter/').href.startsWith(scope.href),false);
});
test('Form service worker leaves sibling apps alone',async()=>{
 const callbacks={};const source=await readFile(new URL('../browser-public/sw.js',import.meta.url),'utf8');vm.runInNewContext(source,{URL,self:{location:{origin:'https://example.test'},registration:{scope:'https://example.test/form-health/'},addEventListener:(name,fn)=>callbacks[name]=fn}});
 let responses=0;callbacks.fetch({request:{url:'https://example.test/currency-converter/',method:'GET',mode:'navigate'},respondWith:()=>responses++});assert.equal(responses,0);
});
test('font binary and licence are bundled locally and precached for offline use',async()=>{
 const root=new URL('../browser-public/',import.meta.url),font=await readFile(new URL('fonts/inter-latin-wght-5.3.0.woff2',root));assert.equal(font.subarray(0,4).toString(),'wOF2');assert.ok(font.length>10000);assert.match(await readFile(new URL('fonts/OFL-Inter.txt',root),'utf8'),/SIL OPEN FONT LICENSE/);
 const sw=await readFile(new URL('sw.js',root),'utf8');assert.match(sw,/fonts\/inter-latin-wght-5\.3\.0\.woff2/);
});
