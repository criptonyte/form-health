const TAG='form-latest-weight';
export function weightNotice(entries,today){
 const latest=entries.filter(e=>e.kind==='weight'&&e.source==='withings'&&e.date<=today&&Number.isFinite(e.value)&&e.value>=20&&e.value<=400).sort((a,b)=>b.date.localeCompare(a.date)||(b.createdAt||0)-(a.createdAt||0)||a.id.localeCompare(b.id))[0];
 if(!latest)return null;
 const value=latest.value.toFixed(1),key=JSON.stringify([latest.id,latest.date,latest.value,latest.createdAt||null]);
 const date=new Date(latest.date+'T12:00:00Z').toLocaleDateString('en-AU',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});
 return{key,value,title:`${value} kg · latest weight`,options:{body:`Measured ${date} · Withings`,tag:TAG,icon:'./icon-192.png',silent:true,renotify:false,requireInteraction:true,data:{view:'overview',readingKey:key}}};
}
export async function reconcileWeightNotification(reg,entries,prefs,today,renderBadge){
 // Retire the old water notice without deleting any historic logs.
 for(const n of await reg.getNotifications({tag:'form-water-today'}))n.close();
 const notice=weightNotice(entries,today);
 if(!prefs.weightNotification||!notice){for(const n of await reg.getNotifications({tag:TAG}))n.close();return null;}
 // A dismissed reading stays dismissed. Only a new reading or explicit Show again resets this.
 if(prefs.weightNoticeKey===notice.key)return null;
 const badge=renderBadge?.(notice.value);if(badge)notice.options.badge=badge;
 await reg.showNotification(notice.title,notice.options);
 return notice.key;
}
function numericBadge(value){const canvas=document.createElement('canvas');canvas.width=canvas.height=96;const ctx=canvas.getContext('2d');if(!ctx)return null;ctx.fillStyle='white';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=`700 ${value.length>4?30:38}px sans-serif`;ctx.fillText(value,48,49,92);return canvas.toDataURL('image/png');}
let pending=Promise.resolve();
export function updateWeightNotification(entries,prefs,today,onPublished){
 const run=async()=>{if(!('Notification'in globalThis)||Notification.permission!=='granted'||!('serviceWorker'in navigator))return;const reg=await navigator.serviceWorker.getRegistration();if(!reg?.active)return;const key=await reconcileWeightNotification(reg,entries,prefs,today,numericBadge);if(key)await onPublished(key);};
 pending=pending.catch(()=>{}).then(run);return pending;
}
