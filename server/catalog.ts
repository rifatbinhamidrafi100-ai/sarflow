import type { Bounds, CatalogRecord } from '../shared/schema';
const endpoint='https://cmr.earthdata.nasa.gov/search/granules.json';
export function cmrRecords(entries:any[],collection:string):CatalogRecord[]{
 return entries.map(e=>({id:e.id,title:e.title,date:e.time_start,collection,
 polygon:(e.polygons?.[0]?.[0]?.split(' ').map(Number)??[]).reduce((a:number[][],n:number,i:number,all:number[])=>{if(i%2===0)a.push([all[i+1],n]);return a;},[]),
 browse:e.links?.find((l:any)=>l.rel?.endsWith('browse#')&&l.href?.startsWith('https://')&&!l.href.includes('thumbnail'))?.href??null,
 source:`https://cmr.earthdata.nasa.gov/search/concepts/${encodeURIComponent(e.id)}.html`}));
}
export async function discover(bounds:Bounds,fetcher:typeof fetch=fetch){
 const collection='NISAR_L2_GCOV_BETA_V1';
 const query=new URLSearchParams({short_name:collection,page_size:'20',bounding_box:bounds.join(','),sort_key:'-start_date'});
 const response=await fetcher(`${endpoint}?${query}`,{signal:AbortSignal.timeout(15000),headers:{Accept:'application/json'}});
 if(!response.ok)throw new Error(`NASA catalog returned HTTP ${response.status}`);
 const body=await response.json();if(!Array.isArray(body.feed?.entry))throw new Error('NASA catalog response did not contain a granule list');
 return {records:cmrRecords(body.feed.entry,collection),retrieved:new Date().toISOString(),cached:false};
}
