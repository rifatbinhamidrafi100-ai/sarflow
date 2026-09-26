// Public metadata only. No authentication, credentials, or product downloads.
import fs from 'node:fs/promises';
const query=new URL('https://cmr.earthdata.nasa.gov/search/granules.json');
query.search=new URLSearchParams({short_name:'NISAR_L2_GCOV_PROVISIONAL_V1',point:'89.72,25.15',page_size:'100',sort_key:'-start_date'}).toString();
const response=await fetch(query,{signal:AbortSignal.timeout(30000)});
if(!response.ok)throw Error(`Public catalog HTTP ${response.status}`);
const body=await response.json();
const groups=new Map();
for(const e of body.feed.entry){
 const t=e.title.split('_');
 if(t[3]!=='GCOV')continue;
 // Track, orbit direction, frame, bandwidth, polarization, source and release.
 const key=[...t.slice(5,11),t[13]].join('_');
 const records=groups.get(key)??[];
 if(!records.some(r=>r.acquired===e.time_start))records.push({id:e.id,title:e.title,acquired:e.time_start,sizeMB:e.granule_size?Number(e.granule_size):null,polygon:e.polygons,source:`https://cmr.earthdata.nasa.gov/search/concepts/${e.id}.html`});
 groups.set(key,records);
}
const candidates=[...groups.entries()].filter(([,r])=>r.length>=4).map(([key,r])=>({catalogGroup:key,records:r.slice(0,4).reverse()}));
for(const group of candidates){for(const record of group.records){
 const r=await fetch(`https://cmr.earthdata.nasa.gov/search/concepts/${record.id}.umm_json`,{signal:AbortSignal.timeout(30000)});
 if(!r.ok)throw Error(`Granule metadata HTTP ${r.status}`);
 const umm=await r.json();
 record.attributes=Object.fromEntries((umm.AdditionalAttributes??[]).map(a=>[a.Name,a.Values]));
 record.measurementFile=umm.DataGranule?.ArchiveAndDistributionInformation?.find(f=>f.Name===record.title+'.h5')??null;
 record.download=umm.RelatedUrls?.find(u=>u.Type==='GET DATA'&&u.URL.endsWith('/'+record.title+'.h5'))?.URL??null;
}}
const result={queried:new Date().toISOString(),query:query.toString(),totalHits:response.headers.get('CMR-Hits'),sampleLimit:100,candidates,limitation:'Catalog candidates only. Exact grids, look direction, radiometry, processing flags, product specification and terrain validity require product inspection. No measurements downloaded.'};
await fs.mkdir('artifacts/real-data',{recursive:true});
await fs.writeFile('artifacts/real-data/brahmaputra-candidates.json',JSON.stringify(result,null,2));
console.log(JSON.stringify(result,null,2));
