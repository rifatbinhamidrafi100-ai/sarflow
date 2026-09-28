import { useEffect, useState } from 'react';
import { observatorySchema, type Observatory } from '../../shared/observatory';

export const RADAR_REFRESH_MS=5*60*1000+1000;
/** Refresh only the selected location, abort stale requests and retain last success. */
export function useRadarUpdates(lat:string,lon:string,enabled=true,group?:string) {
 const [state,setState]=useState<{key:string;data?:Observatory;message:string;checked?:string;busy:boolean}>({key:'',message:'',busy:false});
 const [revision,setRevision]=useState(0);
 const key=`${lat},${lon}${group?`,${group}`:''}`;
 useEffect(()=>{
  if(!enabled||!lat.trim()||!lon.trim()||!Number.isFinite(Number(lat))||!Number.isFinite(Number(lon))||Math.abs(Number(lat))>84.8||Math.abs(Number(lon))>179.8)return;
  let active=true,controller:AbortController|undefined;
  async function refresh(){
   if(document.hidden)return;
   controller?.abort();controller=new AbortController();const current=controller;
   setState(s=>({...(s.key===key?s:{key,message:''}),busy:true}));
   try {
    const r=await fetch(`/api/global-radar?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}${group?`&group=${encodeURIComponent(group)}`:''}`,{signal:current.signal});
    const body=await r.json();if(!r.ok)throw Error(body.error??'NASA date check failed.');
    if(!active||current.signal.aborted)return;
    if(body.empty){setState(s=>({...s,key,busy:false,checked:new Date().toISOString(),message:body.message}));return;}
    const data=observatorySchema.parse(body);
    setState({key,busy:false,data,checked:new Date().toISOString(),message:'NASA dates checked. Automatic checks every five minutes while this page is visible.'});
   } catch(error){if(active&&!current.signal.aborted)setState(s=>({...s,key,busy:false,message:`${error instanceof Error?error.message:'Date check failed.'} Previous observations are retained; retry is automatic.`}));}
  }
  const debounce=window.setTimeout(()=>void refresh(),500);
  const timer=window.setInterval(()=>void refresh(),RADAR_REFRESH_MS);
  const visible=()=>{if(!document.hidden)void refresh();};document.addEventListener('visibilitychange',visible);
  return()=>{active=false;controller?.abort();clearTimeout(debounce);clearInterval(timer);document.removeEventListener('visibilitychange',visible);};
 },[key,lat,lon,enabled,revision,group]);
 return {...(state.key===key?state:{key,message:'Checking this location for NASA acquisition dates…',busy:false}),refresh:()=>setRevision(v=>v+1)};
}
