import { z } from 'zod';
import { boundsSchema } from './schema';
export const actualFrameSchema=z.object({id:z.string(),date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),acquired:z.string(),title:z.string(),image:z.string().refine(v=>/^\/observations\/[a-z0-9-]+\.png$/.test(v)||v.startsWith('https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?')),thumbnail:z.string().optional(),thumbnailRequest:z.url().optional(),request:z.url(),sha256:z.string().length(64).nullable(),bytes:z.number().nullable(),polygon:z.array(z.tuple([z.number(),z.number()])),source:z.url()});
export const regionSchema=z.object({id:z.string(),name:z.string(),country:z.string(),topic:z.string(),center:z.tuple([z.number(),z.number()]),bounds:boundsSchema,description:z.string(),query:z.url(),observations:z.array(actualFrameSchema).min(2)});
export const observatorySchema=z.object({version:z.number(),retrieved:z.string(),source:z.string(),layer:z.string(),collection:z.string(),status:z.string(),limitations:z.array(z.string()),regions:z.array(regionSchema).min(1)});
export type Observatory=z.infer<typeof observatorySchema>;
export type Region=z.infer<typeof regionSchema>;
export type ActualFrame=z.infer<typeof actualFrameSchema>;
export function selectionReport(archive:Observatory,region:Region,before:number,after:number,note:string){return {format:'SARFlow visual investigation v1',exported:new Date().toISOString(),source:archive.source,collection:archive.collection,region:{name:region.name,bounds:region.bounds},before:region.observations[before],after:region.observations[after],userInterpretation:note,limitations:archive.limitations,quantitativeResult:null};}
