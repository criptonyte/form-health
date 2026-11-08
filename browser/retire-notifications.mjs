// Cleanup only: never ask for permission or post a new notification.
export async function dismissLegacyNotifications(registration){
 if(!registration.getNotifications)return;
 for(const tag of ['form-latest-weight','form-water-today']){
  for(const notice of await registration.getNotifications({tag}).catch(()=>[]))notice.close();
 }
}
