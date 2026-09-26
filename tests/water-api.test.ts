import {expect,it} from 'vitest';
import express from 'express';
import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {waterRouter} from '../server/water';
import {execFileSync} from 'node:child_process';
it('never substitutes fixtures for missing measurements and rejects path injection and foreign origins',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'sarflow-water-test-'));const server=express().use('/water',waterRouter(dir)).listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));const base=`http://127.0.0.1:${(server.address() as {port:number}).port}/water`;
 try{const body=await(await fetch(base+'/inputs')).json();expect(body.inputs).toEqual([]);expect(body.workerAvailable).toBe(false);
 const post=(data:unknown,origin?:string)=>fetch(base+'/jobs',{method:'POST',headers:{'content-type':'application/json',...(origin?{origin}:{})},body:JSON.stringify(data)});
 expect((await post({input:'../../private'})).status).toBe(400);expect((await post({input:'brahmaputra'})).status).toBe(404);expect((await post({input:'brahmaputra'},'https://example.com')).status).toBe(403);expect((await post({input:'brahmaputra',parameters:{co_db:99}})).status).toBe(400);
 expect((await fetch(base+'/jobs/unknown')).status).toBe(404);
 }finally{await new Promise<void>(r=>server.close(()=>r()));await rm(dir,{recursive:true});}
});
it('executes a synthetic HDF5 job, serves exports, enforces concurrency and cancels incomplete results',async()=>{
 const root=process.cwd(),dir=await mkdtemp(path.join(os.tmpdir(),'sarflow-worker-test-'));
 const python=path.join(root,'.venv-water',process.platform==='win32'?'Scripts/python.exe':'bin/python');
 execFileSync(python,[path.join(root,'tests/create_water_fixture.py'),dir],{stdio:'pipe'});
 const server=express().use('/water',waterRouter(dir,root)).listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));const base=`http://127.0.0.1:${(server.address() as {port:number}).port}/water`;
 const submit=()=>fetch(base+'/jobs',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({input:'fixture'})});
 try{const a=await submit();expect(a.status).toBe(202);const {id}=await a.json();expect((await submit()).status).toBe(429);
 let state;for(let i=0;i<100;i++){state=await(await fetch(base+'/jobs/'+id)).json();if(state.status!=='running')break;await new Promise(r=>setTimeout(r,50));}
 expect(state.status).toBe('complete');expect(state.result.dataType).toBe('synthetic-software-fixture');expect(state.result.counts['2']).toBe(64);expect(state.result.accuracyEvaluation).toBeNull();
 const raster=await fetch(base+`/jobs/${id}/files/classes.tif`);expect(raster.status).toBe(200);expect((await raster.arrayBuffer()).byteLength).toBeGreaterThan(100);
 expect((await fetch(base+`/jobs/${id}/files/baseline-0-0.png`)).status).toBe(200);
 const b=await(await submit()).json();expect((await(await fetch(base+'/jobs/'+b.id,{method:'DELETE'})).json()).status).toBe('cancelled');expect((await fetch(base+`/jobs/${b.id}/files/classes.tif`)).status).toBe(404);
 await new Promise(r=>setTimeout(r,200));
 }finally{await new Promise<void>(r=>server.close(()=>r()));await rm(dir,{recursive:true});}
},15000);
