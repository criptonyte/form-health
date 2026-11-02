// Calendar days and times follow the device; no manual timezone preference.
export function deviceTimezone(){
 try{return Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC';}
 catch{return 'UTC';}
}
