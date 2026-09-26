import {it,expect,vi} from 'vitest';
import express from 'express';
import {coverageRouter} from '../server/coverage';
async function serve(fetcher:typeof fetch){const server=express().use('/coverage',coverageRouter(fetcher)).listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));return {url:`http://127.0.0.1:${(server.address() as {port:number}).port}/coverage`,close:()=>new Promise<void>(r=>server.close(()=>r()))};}
it('validates dates, preserves source polygons, caches and marks a partial coverage sample',async()=>{
 const record={id:'G123-ASF',title:'GCOV example',time_start:'2026-09-12T00:00:00Z',polygons:[['28 85 28 86 29 86 28 85']]};
 const upstream=vi.fn(async()=>new Response(JSON.stringify({feed:{entry:[record]}}),{headers:{'CMR-Hits':'200'}}));const s=await serve(upstream as typeof fetch);
 try{expect((await fetch(`${s.url}?date=2026-02-30`)).status).toBe(400);const r=await(await fetch(`${s.url}?date=2026-09-12`)).json();expect(r.records[0].polygon[0]).toEqual([85,28]);expect(r.total).toBe(200);expect(r.truncated).toBe(true);expect(r.query).toContain('temporal=');await fetch(`${s.url}?date=2026-09-12`);expect(upstream).toHaveBeenCalledTimes(1);expect((await fetch(`${s.url}?date=2026-09-13`)).status).toBe(429);}finally{await s.close();}
});
it('reports empty results and excludes misleading antimeridian outlines',async()=>{
 const s=await serve((async()=>new Response(JSON.stringify({feed:{entry:[{id:'G123-ASF',title:'Crossing',time_start:'2026-09-12',polygons:[['10 179 10 -179 11 -179 10 179']]}]}}),{headers:{'CMR-Hits':'1'}})) as typeof fetch);
 try{const b=await(await fetch(`${s.url}?date=2026-09-12`)).json();expect(b.records).toEqual([]);expect(b.truncated).toBe(true);}finally{await s.close();}
});
it('upstream failure produces an error, never replacement footprints',async()=>{
 const s=await serve((async()=>new Response('{}',{status:503})) as typeof fetch);try{const r=await fetch(`${s.url}?date=2026-09-12`);expect(r.status).toBe(502);expect((await r.json()).records).toBeUndefined();}finally{await s.close();}
});
