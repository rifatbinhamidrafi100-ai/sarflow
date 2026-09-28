import type { Observatory, Region } from './observatory.js';

/** Keep original archive receipts; only append dates from its existing browse group. */
export function appendLiveObservations(archive:Observatory,region:Region,live?:Observatory):Region {
 if(!live||archive.collection!==live.collection)return region;
 const group=(title:string)=>title.split('_').slice(5,10).join('_');
 const newest=region.observations.at(-1)!;
 const additions=live.regions[0].observations.filter(f=>f.date>newest.date&&group(f.title)===group(newest.title));
 if(!additions.length)return region;
 return {...region,query:live.regions[0].query,observations:[...region.observations,...additions.map(f=>{
  const request=new URL(f.request);request.searchParams.set('BBOX',region.bounds.join(','));
  return {...f,image:request.toString(),request:request.toString(),retrieved:live.retrieved};
 })].slice(-30)};
}

/** Follow latest only when latest was selected; preserve historical selections by ID. */
export function updatedSelection(previous:string[],next:string[],index:number,followLatest:boolean){
 if(followLatest&&index===previous.length-1)return next.length-1;
 const position=next.indexOf(previous[index]);return position>=0?position:0;
}
