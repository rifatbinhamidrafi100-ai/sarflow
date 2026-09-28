import fs from 'node:fs/promises';
import crypto from 'node:crypto';
const policy=JSON.parse(await fs.readFile(new URL('../shared/collection-policy.json',import.meta.url),'utf8'));
const query=`https://cmr.earthdata.nasa.gov/search/granules.json?short_name=${policy.active}&page_size=6&sort_key=-start_date`;
const response=await fetch(query,{signal:AbortSignal.timeout(20000)});
if(!response.ok)throw new Error(`CMR ${response.status}`);
const json=await response.json();const entries=json.feed.entry;
await fs.mkdir('public/data',{recursive:true});
await fs.mkdir('public/images',{recursive:true});
const records=[];
for(const e of entries){
 const browse=e.links?.find(l=>l.rel?.endsWith('browse#')&&l.href?.startsWith('https://')&&!l.href.includes('thumbnail'))?.href;
 const polygon=(e.polygons?.[0]?.[0]?.split(' ').map(Number)??[]).reduce((a,n,i,all)=>{if(i%2===0)a.push([all[i+1],n]);return a;},[]);
 let localBrowse=null,sha256=null;
 if(browse&&records.length<2){const r=await fetch(browse,{signal:AbortSignal.timeout(30000)});if(r.ok&&r.headers.get('content-type')?.includes('image')){const bytes=Buffer.from(await r.arrayBuffer());localBrowse=`/images/${e.id}.png`;await fs.writeFile(`public${localBrowse}`,bytes);sha256=crypto.createHash('sha256').update(bytes).digest('hex');}}
 records.push({id:e.id,title:e.title,date:e.time_start,collection:policy.active,polygon,browse:browse??null,localBrowse,sha256,source:`https://cmr.earthdata.nasa.gov/search/concepts/${e.id}.html`});
}
await fs.writeFile('public/data/catalog.json',JSON.stringify({source:query,retrieved:new Date().toISOString(),records},null,2));
console.log(`Archived ${records.length} actual CMR metadata records; ${records.filter(r=>r.localBrowse).length} authentic browse images.`);
