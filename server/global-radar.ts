import { Router } from 'express';
import { observatorySchema } from '../shared/observatory.js';
export function globalRadarRouter(fetcher:typeof fetch=fetch){
 const router=Router(),cache=new Map<string,{at:number;data:unknown}>();let next=0;
 router.get('/',async(req,res)=>{
  const lat=Number(req.query.lat),lon=Number(req.query.lon);
  if(typeof req.query.lat!=='string'||typeof req.query.lon!=='string'||!req.query.lat.trim()||!req.query.lon.trim()||!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>84.8||Math.abs(lon)>179.8){res.status(400).json({error:'Choose latitude −84.8 to 84.8 and longitude −179.8 to 179.8.'});return;}
  const key=`${lat.toFixed(4)},${lon.toFixed(4)}`,hit=cache.get(key);if(hit&&Date.now()-hit.at<300000){res.json(hit.data);return;}
  if(Date.now()<next){res.status(429).json({error:'Wait a moment and retry radar discovery.'});return;}next=Date.now()+1500;
  try{
   const collection='NISAR_L2_GCOV_PROVISIONAL_V1',layer='NISAR_L2_Geocoded_Polarimetric_Covariance';
   const query=new URL('https://cmr.earthdata.nasa.gov/search/granules.json');query.search=new URLSearchParams({short_name:collection,page_size:'100',sort_key:'-start_date',point:`${lon},${lat}`}).toString();
   const r=await fetcher(query,{signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('Catalog unavailable');const body=await r.json();if(!Array.isArray(body.feed?.entry))throw Error('Invalid catalog');
   const groups=new Map<string,any[]>();for(const e of body.feed.entry){if(typeof e.title!=='string'||typeof e.time_start!=='string'||!/^G\d+-ASF$/.test(e.id))continue;const k=e.title.split('_').slice(5,10).join('_'),g=groups.get(k)??[];if(!g.some(x=>x.time_start.slice(0,10)===e.time_start.slice(0,10)))g.push(e);groups.set(k,g);}
   const selected=[...groups.values()].filter(g=>g.length>=2).sort((a,b)=>b[0].time_start.localeCompare(a[0].time_start))[0];
   if(!selected){res.json({empty:true,noObservations:body.feed.entry.length===0,message:'No repeat NISAR observation pair was found in the latest 100 matching catalog records. Try another location.',query:query.toString()});return;}
   const bounds=[lon-.15,lat-.15,lon+.15,lat+.15];
   const observations=selected.slice(0,8).reverse().map(e=>{
    const date=e.time_start.slice(0,10),request=new URL('https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi');request.search=new URLSearchParams({SERVICE:'WMS',VERSION:'1.1.1',REQUEST:'GetMap',LAYERS:layer,STYLES:'',FORMAT:'image/png',TRANSPARENT:'TRUE',SRS:'EPSG:4326',BBOX:bounds.join(','),WIDTH:'1536',HEIGHT:'1536',TIME:date}).toString();
    const coords=e.polygons?.[0]?.[0]?.split(' ').map(Number)??[],polygon=[];for(let i=0;i<coords.length;i+=2)polygon.push([coords[i+1],coords[i]]);
    return {id:e.id,date,acquired:e.time_start,title:e.title,image:request.toString(),request:request.toString(),sha256:null,bytes:null,polygon,source:`https://cmr.earthdata.nasa.gov/search/concepts/${e.id}.html`};
   });
   const data=observatorySchema.parse({version:1,retrieved:new Date().toISOString(),source:'NASA CMR / NASA GIBS — on-demand imagery',layer,collection,status:'On-demand historical observations',limitations:['Catalog records identify acquisition dates, not guaranteed rendered pixel coverage. Transparent areas mean no browse coverage.','Daily mosaics can combine acquisition modes; a matching granule is not exhaustive pixel provenance.','RGB is not calibrated power. No change magnitude, flood area, or confidence is inferred.','Images load directly from NASA; original-byte hashes have not been captured. Playback shows discrete acquisitions, not continuous ground motion.'],regions:[{id:'global-radar',name:`${lat.toFixed(4)}°, ${lon.toFixed(4)}°`,country:'Worldwide search',topic:'Discovered NISAR time series',center:[lon,lat],bounds,query:query.toString(),description:'An on-demand 0.3-degree view around the selected point. Compare real acquisition dates; gaps and different radar appearances do not establish an event.',observations}]});
   if(cache.size>=30)cache.delete(cache.keys().next().value!);cache.set(key,{at:Date.now(),data});res.json(data);
  }catch{res.status(502).json({error:'NASA radar discovery is unavailable or returned invalid metadata. Retry; no replacement data has been generated.'});}
 });return router;
}
