import { z } from 'zod';
const sourceUrl=z.url().refine(value=>new URL(value).protocol==='https:', 'Source links must use HTTPS');

export const boundsSchema = z.tuple([z.number().min(-180).max(180),z.number().min(-85).max(85),z.number().min(-180).max(180),z.number().min(-85).max(85)]).refine(b=>b[0]<b[2]&&b[1]<b[3], 'Bounds must be west,south,east,north without antimeridian crossing');
export const observationSchema = z.object({id:z.string().min(1),date:z.iso.datetime(),power:z.array(z.number().positive().nullable()).max(65536),sourceId:z.string().min(1)});
export const datasetSchema = z.object({
  id:z.string().regex(/^[a-z0-9-]+$/),title:z.string().min(1).max(120),location:z.string().min(1).max(120),phenomenon:z.enum(['wetland','agriculture','disturbance']),
  status:z.enum(['synthetic','observed']),description:z.string().max(2000),bounds:boundsSchema,width:z.number().int().min(3).max(256),height:z.number().int().min(3).max(256),
  pixelAreaM2:z.number().positive().nullable(),crs:z.string(),polarization:z.string(),track:z.string(),unit:z.literal('linear power'),
  provenance:z.object({source:z.string(),url:sourceUrl,product:z.string(),processing:z.array(z.string()),limitations:z.array(z.string()),created:z.iso.datetime(),license:z.string(),generator:z.string().optional(),files:z.array(z.object({name:z.string(),sha256:z.string().regex(/^[a-f0-9]{64}$/)})).optional()}),
  observations:z.array(observationSchema).min(2).max(30)
}).superRefine((d,ctx)=>{
  d.observations.forEach((o,i)=>{
    if(o.power.length!==d.width*d.height)ctx.addIssue({code:'custom',message:'Raster dimensions do not match values',path:['observations',i]});
    if(i&&o.date<=d.observations[i-1].date)ctx.addIssue({code:'custom',message:'Acquisitions must be strictly chronological',path:['observations',i,'date']});
  });
  if(new Set(d.observations.map(o=>o.id)).size!==d.observations.length)ctx.addIssue({code:'custom',message:'Observation IDs must be unique'});
});
export type Dataset = z.infer<typeof datasetSchema>;
export type Observation = Dataset['observations'][number];
export type Bounds = z.infer<typeof boundsSchema>;
export type Lens = 'raw'|'processed'|'difference'|'detected'|'uncertainty';
export interface Analysis {delta:(number|null)[];before:(number|null)[];after:(number|null)[];mask:(number|null)[];valid:number;excluded:number;changed:number;increase:number;decrease:number;mean:number;areaKm2:number|null;sensitivity:{threshold:number;count:number}[];histogram:{label:string;count:number}[];threshold:number;elapsedMs:number;}
export interface CatalogRecord {id:string;title:string;date:string;collection:string;polygon:number[][];browse:string|null;source:string;}
