import {it,expect} from 'vitest';
import express from 'express';
import {coverageRouter} from '../server/coverage';
it('lists only unique valid catalog dates for the selected location',async()=>{
 let requested='';const server=express().use(coverageRouter((async(url)=>{requested=String(url);return new Response(JSON.stringify({feed:{entry:[{id:'G1-ASF',time_start:'2026-09-12T00:00:00Z'},{id:'G2-ASF',time_start:'2026-09-12T12:00:00Z'},{id:'G3-ASF',time_start:'2026-08-01T00:00:00Z'},{id:'G4-ASF',time_start:'2026-02-30'}]}}));}) as typeof fetch)).listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));const base=`http://127.0.0.1:${(server.address() as {port:number}).port}`;
 try{expect((await fetch(base+'/dates?lat=100&lon=89')).status).toBe(400);expect(await(await fetch(base+'/dates?lat=25&lon=89')).json()).toEqual({dates:['2026-09-12','2026-08-01']});expect(new URL(requested).searchParams.get('point')).toBe('89,25');}finally{await new Promise<void>(r=>server.close(()=>r()));}
});
