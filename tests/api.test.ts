import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { Server } from 'node:http';
import { createApp } from '../server/app';
import { cmrRecords } from '../server/catalog';
import { datasetSchema } from '../shared/schema';
let server:Server,base:string;
const discover=vi.fn(async()=>({records:[],retrieved:'2026-09-23T00:00:00Z',cached:false}));
beforeAll(async()=>{server=createApp({discover}).listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve));const address=server.address();base=`http://127.0.0.1:${typeof address==='object'&&address?address.port:0}`;});
afterAll(()=>new Promise<void>(resolve=>server.close(()=>resolve())));
describe('API contract',()=>{
 it('serves validated labeled fixtures',async()=>{const r=await fetch(`${base}/api/datasets`);expect(r.status).toBe(200);const d=datasetSchema.array().parse(await r.json());expect(d).toHaveLength(3);expect(d.every(x=>x.status==='synthetic')).toBe(true);});
 it('rejects missing, reversed, oversized and nonfinite bounds',async()=>{for(const q of ['', '5,2,1,4','0,0,90,10','NaN,0,1,1']){const r=await fetch(`${base}/api/catalog?bbox=${q}`);expect(r.status).toBe(400);}expect(discover).not.toHaveBeenCalled();});
 it('caches bounded queries without fabricating observations',async()=>{const url=`${base}/api/catalog?bbox=89,24,90,25`;const a=await(await fetch(url)).json(),b=await(await fetch(url)).json();expect(a.records).toEqual([]);expect(b.cached).toBe(true);expect(discover).toHaveBeenCalledTimes(1);});
 it('returns a real error status for upstream failure',async()=>{discover.mockRejectedValueOnce(new Error('NASA catalog returned HTTP 503'));const r=await fetch(`${base}/api/catalog?bbox=90,24,91,25`);expect(r.status).toBe(502);expect((await r.json()).error).toContain('503');});
 it('unknown routes are JSON 404 and hardened headers are present',async()=>{const r=await fetch(`${base}/api/missing`);expect(r.status).toBe(404);expect(r.headers.get('x-content-type-options')).toBe('nosniff');});
 it('maps CMR polygons lat/lon to lon/lat',()=>{const r=cmrRecords([{id:'G1',title:'A',time_start:'2026-01-01',polygons:[['24 89 24 90 25 90 24 89']],links:[{rel:'http://esipfed.org/ns/fedsearch/1.1/browse#',href:'https://example.org/browse.png'}]}],'collection')[0];expect(r.polygon[0]).toEqual([89,24]);expect(r.browse).toBe('https://example.org/browse.png');});
});
