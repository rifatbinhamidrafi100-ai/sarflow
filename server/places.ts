import { Router } from 'express';
import { z } from 'zod';
import {englishPlace} from './english-place.js';
const place=z.object({id:z.number(),name:z.string(),latitude:z.number().min(-90).max(90),longitude:z.number().min(-180).max(180),country:z.string().optional(),admin1:z.string().optional()});
export function placesRouter(fetcher:typeof fetch=fetch){
 const router=Router(),cache=new Map<string,{at:number;results:z.infer<typeof place>[]}>();let next=0;
 const names=new Map<string,string|null>();let reverseNext=0,reverseBusy=false;
 router.get('/reverse',async(req,res)=>{
  const lat=Number(req.query.lat),lon=Number(req.query.lon);
  if(typeof req.query.lat!=='string'||typeof req.query.lon!=='string'||!req.query.lat.trim()||!req.query.lon.trim()||!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180){res.status(400).json({error:'Invalid location'});return;}
  const key=`${lat.toFixed(4)},${lon.toFixed(4)}`;
  if(names.has(key)){res.json({name:names.get(key)});return;}
  if(reverseBusy||Date.now()<reverseNext){res.status(429).json({error:'Please wait and retry location naming.'});return;}
  reverseBusy=true;reverseNext=Date.now()+1100;
  try{
   const url=new URL('https://nominatim.openstreetmap.org/reverse');url.search=new URLSearchParams({lat:String(lat),lon:String(lon),format:'jsonv2',zoom:'10',namedetails:'1','accept-language':'en'}).toString();
   const r=await fetcher(url,{headers:{'User-Agent':'SARFlow/1.0 (local Earth observation viewer)'},signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error();
   const b=await r.json(),a=b.address??{};
   const locality=englishPlace(b.namedetails?.['name:en'])??englishPlace(a.city||a.town||a.village||a.municipality||a.county||a.state);
   const parts=[locality??'Local name unavailable in English',englishPlace(a.country)].filter((v):v is string=>Boolean(v));
   if(!locality&&!englishPlace(a.country))parts.length=0;
   const name=parts.length?[...new Set(parts)].join(', '):null;
   if(names.size>=200)names.delete(names.keys().next().value!);names.set(key,name);res.json({name});
  }catch{res.status(502).json({error:'Location name unavailable. Retry.'});}finally{reverseBusy=false;}
 });
 router.get('/',async(req,res)=>{
  const q=typeof req.query.q==='string'?req.query.q.trim():'';
  if(q.length<2||q.length>100){res.status(400).json({error:'Enter a place name between 2 and 100 characters.'});return;}
  const key=q.toLowerCase(),hit=cache.get(key);
  if(hit&&Date.now()-hit.at<3600000){res.json({results:hit.results});return;}
  if(Date.now()<next){res.status(429).json({error:'Please wait a moment, then retry the search.'});return;}next=Date.now()+1000;
  try{
   const url=new URL('https://geocoding-api.open-meteo.com/v1/search');url.search=new URLSearchParams({name:q,count:'6',language:'en',format:'json'}).toString();
   const response=await fetcher(url,{signal:AbortSignal.timeout(12000)});if(!response.ok)throw Error(`Place service returned HTTP ${response.status}`);
   const body=await response.json(),results=place.array().parse(body.results??[]).map(p=>({...p,name:englishPlace(p.name)??'Place name unavailable in English',country:englishPlace(p.country)??undefined,admin1:englishPlace(p.admin1)??undefined}));
   if(cache.size>=100)cache.delete(cache.keys().next().value!);cache.set(key,{at:Date.now(),results});res.json({results});
  }catch{res.status(502).json({error:'Place search is unavailable. Retry or navigate with coordinates.'});}
 });return router;
}
