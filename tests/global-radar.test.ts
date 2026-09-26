import {it,expect,vi} from 'vitest';
import express from 'express';
import {globalRadarRouter} from '../server/global-radar';
it('discovers actual dates with remote provenance, validates coordinates and caches requests',async()=>{
 const records=['2026-09-12','2026-08-31'].map((date,i)=>({id:`G${i+100}-ASF`,time_start:`${date}T00:00:00Z`,title:'NISAR_L2_PR_GCOV_030_098_A_016_4005_DHDH_A_example',polygons:[['28 85 28 86 29 86 28 85']]}));
 const upstream=vi.fn(async()=>new Response(JSON.stringify({feed:{entry:records}})));
 const server=express().use('/radar',globalRadarRouter(upstream as typeof fetch)).listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));const base=`http://127.0.0.1:${(server.address() as {port:number}).port}/radar`;
 try{expect((await fetch(`${base}?lat=&lon=85`)).status).toBe(400);expect((await fetch(`${base}?lat=90&lon=85`)).status).toBe(400);const body=await(await fetch(`${base}?lat=28&lon=85`)).json();expect(body.regions[0].observations.map((x:{date:string})=>x.date)).toEqual(['2026-08-31','2026-09-12']);expect(body.regions[0].observations[0].sha256).toBeNull();expect(body.regions[0].observations[0].image).toContain('WIDTH=1536');await fetch(`${base}?lat=28&lon=85`);expect(upstream).toHaveBeenCalledTimes(1);}finally{await new Promise<void>(r=>server.close(()=>r()));}
});
