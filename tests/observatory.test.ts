import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { observatorySchema, selectionReport, observationDisplayImage } from '../shared/observatory';
const archive=observatorySchema.parse(JSON.parse(readFileSync('public/data/observatory.json','utf8')));
describe('actual NISAR archive integrity',()=>{
 it('reduces on-demand previews while retaining dates, bounds and original evidence',()=>{
  const url=new URL(archive.regions[0].observations[0].request);
  url.searchParams.set('WIDTH','1536');url.searchParams.set('HEIGHT','768');
  const frame={...archive.regions[0].observations[0],display:undefined,image:url.toString()};
  const preview=new URL(observationDisplayImage(frame));
  expect(preview.searchParams.get('WIDTH')).toBe('768');expect(preview.searchParams.get('HEIGHT')).toBe('384');
  for(const key of ['TIME','BBOX','LAYERS','SRS'])expect(preview.searchParams.get(key)).toBe(url.searchParams.get(key));
  expect(frame.image).toBe(url.toString());expect(frame.request).toBe(archive.regions[0].observations[0].request);
 });
 it('verifies smaller display derivatives separately from original evidence',()=>{
  for(const frame of archive.regions.flatMap(r=>r.observations)){
   expect(frame.display).toBeDefined();
   const bytes=readFileSync(`public${frame.display!.image}`);
   expect(bytes.length).toBe(frame.display!.bytes);
   expect(bytes.length).toBeLessThan(frame.bytes!);
   expect(createHash('sha256').update(bytes).digest('hex')).toBe(frame.display!.sha256);
   expect(bytes.subarray(0,4).toString()).toBe('RIFF');
   expect(bytes.subarray(8,12).toString()).toBe('WEBP');
   expect(observationDisplayImage(frame)).toBe(frame.display!.image);
   expect(observationDisplayImage({...frame,display:undefined})).toBe(frame.image);
  }
 });
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
