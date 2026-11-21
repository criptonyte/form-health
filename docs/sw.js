const VERSION="form-local-a6a50b123a8f";

self.addEventListener('install',event=>{
 event.waitUntil((async()=>{
  const cache=await caches.open(VERSION);
  const shell=await fetch('./',{cache:'reload'});
  if(!shell.ok)throw new Error('App shell unavailable');
  const html=await shell.clone().text();
  const assets=[...html.matchAll(/(?:src|href)="(\.\/assets\/[^"?#]+)"/g)].map(match=>match[1]);
  await cache.addAll([
   ...assets,
   './favicon.svg?v=fraunces-restore-1',
   './icon-192.png?v=fraunces-restore-1',
   './icon-512.png?v=fraunces-restore-1',
   './manifest.webmanifest',
   './fonts/inter-latin-wght-5.3.0.woff2',
   './fonts/fraunces-latin-display-v1.woff',
  ]);
  await cache.put('./',shell);
 })());
});

self.addEventListener('activate',event=>{
 event.waitUntil((async()=>{
  for(const key of await caches.keys()){
   if(key.startsWith('form-local-')&&key!==VERSION)await caches.delete(key);
  }
  if(self.registration.getNotifications){
   for(const tag of ['form-latest-weight','form-water-today']){
    for(const notice of await self.registration.getNotifications({tag}).catch(()=>[]))notice.close();
   }
  }
  await self.clients.claim();
 })());
});

self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||url.origin!==self.location.origin||!url.href.startsWith(self.registration.scope))return;
 if(event.request.mode==='navigate'){
  event.respondWith(fetch(event.request).catch(()=>caches.match('./')));
  return;
 }
 event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request)));
});

self.addEventListener('message',event=>{
 if(event.data?.type==='ACTIVATE_UPDATE')self.skipWaiting();
});
