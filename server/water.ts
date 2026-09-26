import {Router,json} from 'express';
import {readdir,readFile,mkdir,stat} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {z} from 'zod';
const parameters=z.object({co_db:z.number().min(-35).max(-5).default(-17),cross_db:z.number().min(-40).max(-10).default(-24),change_db:z.number().min(.5).max(10).default(3),margin_db:z.number().min(.1).max(3).default(1)}).strict();
type Job={id:string;status:'running'|'complete'|'failed'|'cancelled';message:string;cancel:()=>void};
export function waterRouter(root=process.cwd(),workerRoot=root){
 const router=Router(),jobs=new Map<string,Job>();const inputs=path.join(root,'data/water-inputs'),outputs=path.join(root,'artifacts/water-jobs');
 const python=path.join(workerRoot,'.venv-water',process.platform==='win32'?'Scripts/python.exe':'bin/python');
 let workerActive=false;
 router.use(json({limit:'4kb'}));
 router.use((req,res,next)=>{if(req.method==='POST'||req.method==='DELETE'){const origin=req.get('origin');if(origin){try{const u=new URL(origin);if(!['localhost','127.0.0.1'].includes(u.hostname)||!['5186','5187'].includes(u.port))throw Error();}catch{res.status(403).json({error:'Local application origin required'});return;}}}next();});
 router.get('/inputs',async(_req,res)=>{try{const files=existsSync(inputs)?(await readdir(inputs)).filter(f=>/^[a-z0-9-]+\.json$/.test(f)).slice(0,20):[];const list=[];for(const file of files){const p=path.join(inputs,file);if((await stat(p)).size>65536)throw Error();const m=JSON.parse(await readFile(p,'utf8'));list.push({id:file.slice(0,-5),location:String(m.location??'Registered window'),dataType:m.dataType,dates:Array.isArray(m.files)?m.files.length:0});}res.json({inputs:list,workerAvailable:existsSync(python),limits:{dates:30,window:1024,tile:256,concurrency:1,timeoutSeconds:120},message:list.length?'Registered local inputs; compatibility is verified during processing.':'No calibrated measurements registered. NASA browse imagery cannot be used as power measurements.'});}catch{res.status(422).json({error:'Invalid local water-input registration; inspect manifest syntax and size.'});}});
 router.post('/jobs',async(req,res)=>{
  const parsed=z.object({input:z.string().regex(/^[a-z0-9-]+$/).max(80),parameters:parameters.default({co_db:-17,cross_db:-24,change_db:3,margin_db:1})}).strict().safeParse(req.body);
  if(!parsed.success){res.status(400).json({error:'Choose a registered input and bounded numeric parameters.'});return;}
  if(workerActive||[...jobs.values()].some(j=>j.status==='running')){res.status(429).json({error:'One raster job is already running. Cancel it or wait.'});return;}
  const manifest=path.join(inputs,parsed.data.input+'.json');
  if(!existsSync(manifest)){res.status(404).json({error:'No registered measurement input exists; no synthetic replacement was used.'});return;}
  if(!existsSync(python)){res.status(503).json({error:'Local Python worker environment is missing. See WATER_WORKFLOW.md.'});return;}
  // Reserve slot synchronously before asynchronous filesystem work.
  const id=randomUUID(),job:Job={id,status:'running',message:'Validating acquisitions and processing bounded tiles',cancel:()=>{}};jobs.set(id,job);
  try{
   await mkdir(outputs,{recursive:true});if((await readdir(outputs)).length>=20)throw Error('limit');
   if((await stat(manifest)).size>65536)throw Error('manifest');
   const dir=path.join(outputs,id);await mkdir(dir);
   workerActive=true;
   const child=spawn(python,[path.join(workerRoot,'scripts/water_pipeline.py'),manifest,dir,'--parameters',JSON.stringify(parsed.data.parameters)],{cwd:root,windowsHide:true,stdio:['ignore','pipe','pipe']});
   let diagnostic='';child.stdout.on('data',b=>{diagnostic=(diagnostic+b.toString()).slice(-2000);});child.stderr.on('data',()=>{});
   const timer=setTimeout(()=>{if(job.status==='running'){job.status='failed';job.message='Processing exceeded 120 seconds. Choose a smaller window.';child.kill();}},120000);
   job.cancel=()=>{if(job.status==='running'){job.status='cancelled';job.message='Cancelled; incomplete outputs are not served.';child.kill();clearTimeout(timer);}};
   child.on('error',()=>{workerActive=false;clearTimeout(timer);job.status='failed';job.message='Worker could not start; check local dependencies.';});
   child.on('close',code=>{workerActive=false;clearTimeout(timer);if(job.status!=='running')return;job.status=code===0?'complete':'failed';job.message=code===0?'Completed experimental analysis; validation remains unavailable.':diagnostic.startsWith('Processing failed:')?diagnostic.trim():'Processing failed. Check product specification and local input files.';});
   res.status(202).json({id,status:job.status,message:job.message});
  }catch{workerActive=false;job.status='failed';job.message='Input unavailable or local job storage limit reached (20 jobs). Review local artifacts before starting more work.';res.status(422).json({error:job.message});}
 });
 router.get('/jobs/:id',async(req,res)=>{const j=jobs.get(req.params.id);if(!j){res.status(404).json({error:'Job not found; jobs do not resume after server restart.'});return;}try{res.json({id:j.id,status:j.status,message:j.message,result:j.status==='complete'?JSON.parse(await readFile(path.join(outputs,j.id,'result.json'),'utf8')):null});}catch{res.status(500).json({error:'Completed result could not be read.'});}});
 router.delete('/jobs/:id',(req,res)=>{const j=jobs.get(req.params.id);if(!j){res.status(404).json({error:'Job not found'});return;}j.cancel();res.json({status:j.status});});
 router.get('/jobs/:id/files/:file',(req,res)=>{const j=jobs.get(req.params.id),file=req.params.file;if(!j||j.status!=='complete'||!(/^(classes|reasons|anomaly|delta|baseline|target)\.tif$/.test(file)||/^(tile|baseline|target|delta)-\d+-\d+\.png$/.test(file)||file==='result.json')){res.status(404).json({error:'Completed artifact unavailable'});return;}res.sendFile(path.join(outputs,j.id,file));});
 return router;
}
