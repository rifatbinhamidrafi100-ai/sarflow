import { expect,it,vi } from 'vitest';
import express from 'express';
import { placesRouter } from '../server/places';
it('validates place queries, caches upstream results and rate-limits uncached requests',async()=>{
 const fetcher=vi.fn(async()=>new Response(JSON.stringify({results:[{id:1,name:'Kathmandu',latitude:27.7,longitude:85.3}]})));
 const server=express().use('/places',placesRouter(fetcher as typeof fetch)).listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));
 const port=(server.address() as {port:number}).port;
 try{expect((await fetch(`http://127.0.0.1:${port}/places?q=x`)).status).toBe(400);const url=`http://127.0.0.1:${port}/places?q=Kathmandu`;expect((await(await fetch(url)).json()).results[0].longitude).toBe(85.3);await fetch(url);expect(fetcher).toHaveBeenCalledTimes(1);expect((await fetch(`http://127.0.0.1:${port}/places?q=Paris`)).status).toBe(429);}finally{await new Promise<void>(r=>server.close(()=>r()));}
});
