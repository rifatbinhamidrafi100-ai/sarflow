import { useEffect, useState } from 'react';
import { observatorySchema, type Observatory } from '../../shared/observatory';
let cached:Observatory|undefined;
export function useObservatory(){const [data,setData]=useState<Observatory|undefined>(cached),[error,setError]=useState(''),[revision,setRevision]=useState(0);
 useEffect(()=>{if(cached){setData(cached);return;}const c=new AbortController();setError('');fetch('/api/observatory',{signal:c.signal}).then(async r=>{if(!r.ok)throw Error(`Observation archive unavailable (${r.status})`);return observatorySchema.parse(await r.json());}).then(d=>{cached=d;setData(d);}).catch(e=>{if(e.name!=='AbortError')setError(e.message);});return()=>c.abort();},[revision]);
 return {data,error,retry:()=>{cached=undefined;setRevision(v=>v+1);}};
}
