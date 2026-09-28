import { expect,it } from 'vitest';
import { readFileSync } from 'node:fs';
import { observatorySchema } from '../shared/observatory';
import { appendLiveObservations,updatedSelection } from '../shared/live-observations';
import { acquisitionDate,GCOV_COLLECTION } from '../shared/collection-policy';
import { discover } from '../server/catalog';
it('appends only newer matching dates and preserves original source bytes and geographic bounds',()=>{
 const a=observatorySchema.parse(JSON.parse(readFileSync('public/data/observatory.json','utf8'))),r=a.regions[0];
 const f={...r.observations.at(-1)!,id:'G999-ASF',date:'2026-10-01',sha256:null,bytes:null};
 const live={...a,regions:[{...r,observations:[f]}]};const merged=appendLiveObservations(a,r,live);
 expect(merged.observations[0]).toBe(r.observations[0]);expect(merged.observations.at(-1)!.sha256).toBeNull();
 expect(new URL(merged.observations.at(-1)!.request).searchParams.get('BBOX')).toBe(r.bounds.join(','));
 expect(appendLiveObservations(a,r,{...live,collection:'unreviewed'})).toBe(r);
});
it('keeps a historical selection and follows latest only when latest was selected',()=>{
 expect(updatedSelection(['a','b'],['a','b','c'],0,true)).toBe(0);
 expect(updatedSelection(['a','b'],['a','b','c'],1,true)).toBe(2);
 expect(updatedSelection(['a','b'],['b','c'],1,false)).toBe(0);
});
it('rejects impossible dates and centralizes the catalog collection',async()=>{
 expect(acquisitionDate('2026-02-30T00:00:00Z')).toBeNull();expect(acquisitionDate('2026-09-28T00:00:00Z')).toBe('2026-09-28');
 let requested='';await discover([0,0,1,1],(async(url)=>{requested=String(url);return new Response(JSON.stringify({feed:{entry:[]}}));}) as typeof fetch);
 expect(new URL(requested).searchParams.get('short_name')).toBe(GCOV_COLLECTION);
});
