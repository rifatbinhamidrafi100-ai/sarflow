import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { observatorySchema, selectionReport } from '../shared/observatory';
const archive=observatorySchema.parse(JSON.parse(readFileSync('public/data/observatory.json','utf8')));
describe('actual NISAR archive integrity',()=>{
 it('contains four regions and fifteen chronological real catalog records',()=>{
  expect(archive.regions).toHaveLength(4);expect(archive.collection).toBe('NISAR_L2_GCOV_PROVISIONAL_V1');
  expect(archive.regions.flatMap(r=>r.observations)).toHaveLength(15);
  for(const r of archive.regions)for(let i=0;i<r.observations.length;i++){
   const f=r.observations[i];expect(f.id).toMatch(/^G\d+-ASF$/);expect(f.date).toBe(f.acquired.slice(0,10));if(i)expect(f.date>r.observations[i-1].date).toBe(true);
   expect(new URL(f.request).hostname).toBe('gibs.earthdata.nasa.gov');expect(new URL(f.request).searchParams.get('TIME')).toBe(f.date);
  }
 });
 it('verifies all original image hashes, PNG signatures and dimensions',()=>{
  for(const f of archive.regions.flatMap(r=>r.observations)){
   const bytes=readFileSync(`public${f.image}`);expect(createHash('sha256').update(bytes).digest('hex')).toBe(f.sha256);expect(bytes.length).toBe(f.bytes);expect(bytes.subarray(1,4).toString()).toBe('PNG');expect(bytes.readUInt32BE(16)).toBe(1024);expect(bytes.readUInt32BE(20)).toBe(900);
  }
 });
 it('exports observations and user interpretation without invented measurements',()=>{
  const r=selectionReport(archive,archive.regions[0],0,3,'A possible pattern requiring independent evidence');expect(r.quantitativeResult).toBeNull();expect(r.before.id).not.toBe(r.after.id);expect(r.userInterpretation).toContain('independent evidence');expect(r.limitations.join(' ')).toContain('not calibrated power');
 });
 it('retains exact geographic requests and image paths',()=>{
  for(const r of archive.regions)for(const f of r.observations){expect(new URL(f.request).searchParams.get('BBOX')).toBe(r.bounds.join(','));expect(f.image).toContain(r.id);}
 });
});
