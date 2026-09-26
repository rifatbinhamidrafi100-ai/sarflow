import { Router } from 'express';
import { coverageSchema, type Coverage } from '../shared/coverage';

/** Bounded global catalog sample, never an assertion of complete pixel coverage. */
export function coverageRouter(fetcher:typeof fetch=fetch){
 const router=Router(),cache=new Map<string,{at:number;data:Coverage}>();let next=0;
 const dateCache=new Map<string,{at:number;dates:string[]}>();
 router.get('/dates',async(req,res)=>{
  const lat=Number(req.query.lat),lon=Number(req.query.lon);
  if(typeof req.query.lat!=='string'||typeof req.query.lon!=='string'||!req.query.lat.trim()||!req.query.lon.trim()||!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180){res.status(400).json({error:'Choose valid latitude and longitude.'});return;}
  const key=`${lat},${lon}`,hit=dateCache.get(key);
  if(hit&&Date.now()-hit.at<300000){res.json({dates:hit.dates});return;}
  const query=new URL('https://cmr.earthdata.nasa.gov/search/granules.json');
  query.search=new URLSearchParams({short_name:'NISAR_L2_GCOV_PROVISIONAL_V1',page_size:'100',sort_key:'-start_date',point:`${lon},${lat}`}).toString();
  try{
   const r=await fetcher(query,{signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error();
   const body=await r.json();if(!Array.isArray(body.feed?.entry))throw Error();
   const dates:string[]=[...new Set<string>(body.feed.entry.flatMap((e:{id?:string;time_start?:string})=>{
    const d=e.time_start?.slice(0,10);return /^G\d+-ASF$/.test(e.id??'')&&d&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d))&&new Date(d).toISOString().slice(0,10)===d?[d]:[];
   }))].sort().reverse();
   if(dateCache.size>=30)dateCache.delete(dateCache.keys().next().value!);dateCache.set(key,{at:Date.now(),dates});
   res.json({dates});
  }catch{res.status(502).json({error:'Available dates could not be loaded from NASA. Retry.'});}
 });
 router.get('/',async(req,res)=>{
  const date=typeof req.query.date==='string'?req.query.date:'';
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date){res.status(400).json({error:'Choose a valid acquisition date (YYYY-MM-DD).'});return;}
  const hit=cache.get(date);if(hit&&Date.now()-hit.at<300000){res.json(hit.data);return;}
  if(Date.now()<next){res.status(429).json({error:'Wait a moment, then retry coverage discovery.'});return;}next=Date.now()+1500;
  const collection='NISAR_L2_GCOV_PROVISIONAL_V1',query=new URL('https://cmr.earthdata.nasa.gov/search/granules.json');
  query.search=new URLSearchParams({short_name:collection,page_size:'100',sort_key:'-start_date',temporal:`${date}T00:00:00Z,${date}T23:59:59Z`}).toString();
  try{
   const r=await fetcher(query,{signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('Catalog unavailable');
   const body=await r.json();if(!Array.isArray(body.feed?.entry))throw Error('Invalid catalog');
   const records=body.feed.entry.flatMap((e:Record<string,any>)=>{
    if(!/^G\d+-ASF$/.test(e.id)||typeof e.title!=='string'||typeof e.time_start!=='string')return [];
    const coords=typeof e.polygons?.[0]?.[0]==='string'?e.polygons[0][0].trim().split(/\s+/).map(Number):[];
    if(coords.length<8||coords.length%2||coords.some((n:number)=>!Number.isFinite(n)))return [];
    const polygon:[number,number][]=[];for(let i=0;i<coords.length;i+=2)polygon.push([coords[i+1],coords[i]]);
    if(polygon.some(([x,y])=>Math.abs(x)>180||Math.abs(y)>90))return [];
    // Avoid misleading world-spanning polygons at the antimeridian; report omission.
    if(polygon.some((p,i)=>i>0&&Math.abs(p[0]-polygon[i-1][0])>180))return [];
    if(polygon[0].join()!==polygon.at(-1)!.join())polygon.push(polygon[0]);
    return [{id:e.id,title:e.title,acquired:e.time_start,polygon,source:`https://cmr.earthdata.nasa.gov/search/concepts/${e.id}.html`}];
   });
   const header=r.headers.get('CMR-Hits'),total=header!==null&&/^\d+$/.test(header)?Number(header):null;
   const data=coverageSchema.parse({date,retrieved:new Date().toISOString(),query:query.toString(),collection,total,
    truncated:total===null||total>records.length,records});
   if(cache.size>=30)cache.delete(cache.keys().next().value!);cache.set(date,{at:Date.now(),data});res.json(data);
  }catch{res.status(502).json({error:'NASA coverage discovery is unavailable. Retry; no substitute coverage has been drawn.'});}
 });return router;
}
