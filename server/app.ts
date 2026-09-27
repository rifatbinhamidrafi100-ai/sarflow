import express from 'express';
import path from 'node:path';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { boundsSchema, datasetSchema, type Bounds, type Dataset } from '../shared/schema.js';
import { demoDatasets } from '../shared/demo.js';
import { discover } from './catalog.js';
import { observatorySchema } from '../shared/observatory.js';
import { placesRouter } from './places.js';
import { globalRadarRouter } from './global-radar.js';
import { coverageRouter } from './coverage.js';
import { waterRouter } from './water.js';

export function createApp(options:{discover?:typeof discover;datasets?:Dataset[];production?:boolean}={}){
 const app=express();app.disable('x-powered-by');
 app.use('/api/places',placesRouter());
 app.use('/api/global-radar',globalRadarRouter());
 app.use('/api/coverage',coverageRouter());
 app.use('/api/water',waterRouter());
 app.use((_req,res,next)=>{res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');res.setHeader('X-Frame-Options','DENY');next();});
 app.get('/api/health',(_req,res)=>res.json({status:'ok',version:'1.0.0'}));
 app.get('/api/observatory',(_req,res)=>{
  try {res.setHeader('Cache-Control','public, max-age=300');res.json(observatorySchema.parse(JSON.parse(readFileSync(path.resolve('public/data/observatory.json'),'utf8'))));}
  catch {res.status(503).json({error:'The archived NISAR imagery manifest is unavailable. Retry or use the teaching lab.'});}
 });
 app.get('/api/datasets',(_req,res)=>{
  try {const imported:Dataset[]=[];const dir=path.resolve('data/imported');
   if(existsSync(dir))for(const name of readdirSync(dir).filter(n=>n.endsWith('.json')).slice(0,20))imported.push(datasetSchema.parse(JSON.parse(readFileSync(path.join(dir,name),'utf8'))));
   res.setHeader('Cache-Control','no-cache');res.json(options.datasets??[...demoDatasets,...imported]);
  }catch{res.status(500).json({error:'An imported dataset failed validation. Check its schema and acquisition order, then retry.'});}
 });
 const cache=new Map<string,{at:number;data:Awaited<ReturnType<typeof discover>>}>();
 const clients=new Map<string,{at:number;count:number}>();
 app.get('/api/catalog',async(req,res)=>{
  const parsed=boundsSchema.safeParse(typeof req.query.bbox==='string'?req.query.bbox.split(',').map(Number):[]);
  if(!parsed.success){res.status(400).json({error:'Provide valid bbox=west,south,east,north within −180…180 and −85…85.'});return;}
  const bounds=parsed.data as Bounds;
  if(bounds[2]-bounds[0]>10||bounds[3]-bounds[1]>10){res.status(400).json({error:'Select a region no larger than 10 degrees in either direction.'});return;}
  const now=Date.now(),ip=req.ip??'local';
  for(const [k,v]of clients)if(now-v.at>60000)clients.delete(k);
  const usage=clients.get(ip)??{at:now,count:0};usage.count++;clients.set(ip,usage);
  if(usage.count>20){res.setHeader('Retry-After','60');res.status(429).json({error:'Catalog request limit reached. Retry in one minute.'});return;}
  const key=bounds.join(',');const found=cache.get(key);
  if(found&&now-found.at<300000){res.json({...found.data,cached:true});return;}
  try {const data=await(options.discover??discover)(bounds);if(cache.size>=100)cache.delete(cache.keys().next().value!);cache.set(key,{at:now,data});res.json(data);}
  catch(error){res.status(502).json({error:error instanceof Error?error.message:'NASA catalog is unavailable. Retry or use the archived catalog.'});}
 });
 app.use('/api',(_req,res)=>res.status(404).json({error:'Unknown API route'}));
 if(options.production){const dist=path.resolve('dist');app.use(express.static(dist));app.get('/{*path}',(_req,res)=>res.sendFile(path.join(dist,'index.html')));}
 return app;
}
