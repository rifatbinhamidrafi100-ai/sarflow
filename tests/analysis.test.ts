import { describe, expect, it } from 'vitest';
import { analyze, db, smooth, temporalMeans, temporalSupport } from '../shared/analysis';
import { createDemo, demoDatasets } from '../shared/demo';
import { datasetSchema } from '../shared/schema';
import { answer } from '../shared/answers';
const tiny=()=>{const d=createDemo(0);d.width=3;d.height=3;d.observations=d.observations.slice(0,2).map((o,i)=>({...o,power:Array(9).fill(i?10:1)}));return d;};
describe('physical arithmetic and masks',()=>{
 it('temporal means do not mistake changing pixel support for signal change',()=>{const d=tiny();d.observations[0].power=[1,100,null,1,1,1,1,1,1];d.observations[1].power=[1,null,100,1,1,1,1,1,1];expect(temporalSupport(d).count).toBe(7);expect(temporalMeans(d)).toEqual([0,0]);d.observations[1].power=Array(9).fill(null);expect(temporalMeans(d).every(Number.isNaN)).toBe(true);});
 it('uses power, not amplitude, decibels',()=>{expect(db(10)).toBe(10);expect(db(.1)).toBe(-10);expect(()=>db(0)).toThrow();});
 it('detects known exact 10 dB change with correct counts',()=>{const r=analyze(tiny(),0,1,3,false);expect(r.delta).toEqual(Array(9).fill(10));expect(r.changed).toBe(9);expect(r.mean).toBe(10);expect(r.increase).toBe(9);expect(r.areaKm2).toBeNull();});
 it('excludes the union of invalid pixels before filtering',()=>{const d=tiny();d.observations[0].power[0]=null;d.observations[1].power[1]=null;const r=analyze(d,0,1,3,true);expect(r.valid).toBe(7);expect(r.excluded).toBe(2);expect(r.delta.slice(0,2)).toEqual([null,null]);expect(r.mean).toBeCloseTo(10);});
 it('produces zero change for identical acquisitions',()=>{const d=tiny();d.observations[1].power=[...d.observations[0].power];expect(analyze(d,0,1,3,true).changed).toBe(0);});
 it('preserves invalid centers and averages in linear space',()=>{expect(smooth([1,1,1,1,10,1,1,1,1],3,3)[4]).toBe(2);expect(smooth([1,1,1,1,null,1,1,1,1],3,3)[4]).toBeNull();});
 it('rejects reversed and invalid pairs',()=>{expect(()=>analyze(tiny(),1,0,3,false)).toThrow();expect(()=>analyze(tiny(),0,4,3,false)).toThrow();expect(()=>analyze(tiny(),0,1,NaN,false)).toThrow();});
 it('rejects all-invalid support and nonpositive power',()=>{const d=tiny();d.observations[0].power=Array(9).fill(null);expect(()=>analyze(d,0,1,3,false)).toThrow('No overlapping');d.observations[0].power[0]=0;expect(()=>analyze(d,0,1,3,false)).toThrow('Invalid linear power');});
 it('reports sensitivity monotonically and histogram conservation',()=>{const r=analyze(createDemo(0),0,5,3,true);expect(r.sensitivity[0].count).toBeGreaterThanOrEqual(r.sensitivity[1].count);expect(r.sensitivity[1].count).toBeGreaterThanOrEqual(r.sensitivity[2].count);expect(r.histogram.reduce((s,b)=>s+b.count,0)).toBe(r.valid);expect(r.increase+r.decrease).toBe(r.changed);});
 it('uses supplied projected area only',()=>{const d=tiny();d.pixelAreaM2=100;expect(analyze(d,0,1,3,false).areaKm2).toBe(.0009);});
});
describe('fixture and contract integrity',()=>{
 it('is deterministic and explicitly synthetic',()=>{expect(createDemo(0)).toEqual(createDemo(0));demoDatasets.forEach(d=>{expect(d.status).toBe('synthetic');expect(d.pixelAreaM2).toBeNull();expect(datasetSchema.parse(d)).toEqual(d);});});
 it('rejects dimension mismatch and unordered dates',()=>{const d=tiny();d.observations[0].power.pop();expect(datasetSchema.safeParse(d).success).toBe(false);const d2=tiny();d2.observations[1].date=d2.observations[0].date;expect(datasetSchema.safeParse(d2).success).toBe(false);});
 it('bounded answers refuse unavailable area and unknown questions',()=>{const d=tiny();expect(answer('How large is the area?',d,null,0,1).text).toContain('unavailable');expect(answer('Predict casualties',d,null,0,1).text).toContain('outside the available evidence');});
 it('answers cite current computation rather than constants',()=>{const d=tiny(),r=analyze(d,0,1,3,false);expect(answer('What changed?',d,r,0,1).text).toContain('9 of 9');expect(answer('What changed?',d,null,0,1).text).toContain('Run analysis');});
});
