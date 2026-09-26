import { expect,it } from 'vitest';
import { readFileSync } from 'node:fs';
import { observatorySchema } from '../shared/observatory';
import { numericalInvestigation,spatialProfile,visualInvestigation } from '../shared/investigation';
import { demoDatasets } from '../shared/demo';
import { analyze } from '../shared/analysis';
it('never infers physical measurements or confidence from RGB browse imagery',()=>{
 const data=observatorySchema.parse(JSON.parse(readFileSync('public/data/observatory.json','utf8'))),region=data.regions[0];
 const dna=visualInvestigation(data,region,0,1);
 expect(dna.metrics.every(m=>m.value===null)).toBe(true);
 expect(dna.receipts.find(r=>r.stage==='Before observation')?.url).toBe(region.observations[0].source);
 expect(dna.receipts.find(r=>r.stage==='After observation')?.url).toBe(region.observations[1].source);
 expect(visualInvestigation(data,region,1,0).limitations[0]).toContain('earlier reference');
});
it('ties numerical DNA to the computed pair and preserves synthetic status',()=>{
 const d=demoDatasets[0],r=analyze(d,0,1,3,true),dna=numericalInvestigation(d,r,0,1,true);
 expect(dna.status).toContain('SYNTHETIC');expect(dna.metrics[0].value).toBe(r.changed);
 expect(dna.metrics[1].value).toBe(r.mean);expect(dna.metrics[2].value).toBeNull();expect(dna.metrics[3].value).toBeNull();
 expect(dna.metrics[0].source).toContain(d.observations[1].sourceId);
});
it('extracts exact spatial profile values without filling excluded cells',()=>{
 expect(spatialProfile([1,null,3,4,5,6],3,2,0)).toEqual([{column:0,value:1},{column:1,value:null},{column:2,value:3}]);
 expect(()=>spatialProfile([1],3,2,0)).toThrow();expect(()=>spatialProfile([1,2,3,4,5,6],3,2,2)).toThrow();
});
