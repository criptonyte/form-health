// Announce waiting versions; activate only after an explicit, safe refresh.
export function watchAppUpdates(registration,onReady){
 const workers=new Map();
 const inspect=()=>{if(registration.waiting)onReady(registration.waiting);};
 const track=()=>{const worker=registration.installing;if(!worker||workers.has(worker))return;const changed=()=>{if(worker.state==='installed')inspect();};workers.set(worker,changed);worker.addEventListener('statechange',changed);};
 registration.addEventListener('updatefound',track);track();inspect();
 return()=>{registration.removeEventListener('updatefound',track);for(const [worker,listener] of workers)worker.removeEventListener('statechange',listener);};
}
