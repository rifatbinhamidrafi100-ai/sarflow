import fs from 'node:fs/promises';
import crypto from 'node:crypto';
const policy=JSON.parse(await fs.readFile(new URL('../shared/collection-policy.json',import.meta.url),'utf8'));

// Explicit event window; leave the other archived regions unchanged.
const region={id:'nepal-rasuwa',name:'Rasuwa river corridor',country:'Nepal',topic:'August 2026 flood investigation',center:[85.3,28.0],bounds:[85.05,27.75,85.55,28.4],description:'Inspect the Rasuwa mountain river corridor around the reported 26 August 2026 flood. These browse images do not establish flood extent, depth, damage, or cause.'};
const query=`https://cmr.earthdata.nasa.gov/search/granules.json?short_name=${policy.active}&page_size=100&sort_key=-start_date&point=85.3,28.0&temporal=2026-08-01T00:00:00Z,2026-09-20T23:59:59Z`;
const response=await fetch(query,{signal:AbortSignal.timeout(30000)});
if(!response.ok)throw Error(`CMR HTTP ${response.status}`);
const {feed}=await response.json();
const observations=[];
const archive=JSON.parse(await fs.readFile('public/data/observatory.json','utf8'));
for(const date of ['2026-08-19','2026-08-31','2026-09-12']){
 const record=feed.entry.find(e=>e.time_start.startsWith(date)&&e.title.includes('_098_A_016_4005_DHDH_A_')&&e.title.includes('_P05023_'));
 if(!record)throw Error(`No expected compatible catalog record on ${date}`);
 const request=new URL('https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi');
 request.search=new URLSearchParams({SERVICE:'WMS',VERSION:'1.1.1',REQUEST:'GetMap',LAYERS:archive.layer,STYLES:'',FORMAT:'image/png',TRANSPARENT:'TRUE',SRS:'EPSG:4326',BBOX:region.bounds.join(','),WIDTH:'1024',HEIGHT:'900',TIME:date}).toString();
 const image=await fetch(request,{signal:AbortSignal.timeout(45000)});
 if(!image.ok||!image.headers.get('content-type')?.includes('image/png'))throw Error(`GIBS HTTP ${image.status}`);
 const bytes=Buffer.from(await image.arrayBuffer()),local=`/observations/nepal-rasuwa-${date}.png`;
 await fs.writeFile(`public${local}`,bytes);
 const coords=record.polygons?.[0]?.[0]?.split(' ').map(Number)??[];
 const polygon=[];for(let i=0;i<coords.length;i+=2)polygon.push([coords[i+1],coords[i]]);
 observations.push({id:record.id,date,acquired:record.time_start,title:record.title,image:local,request:request.toString(),sha256:crypto.createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length,polygon,source:`https://cmr.earthdata.nasa.gov/search/concepts/${record.id}.html`});
 console.log(`${date}: ${bytes.length} bytes`);
}
const latest=observations.at(-1),thumbRequest=new URL(latest.request);
thumbRequest.searchParams.set('WIDTH','320');thumbRequest.searchParams.set('HEIGHT','281');
const thumb=await fetch(thumbRequest,{signal:AbortSignal.timeout(30000)});
if(!thumb.ok||!thumb.headers.get('content-type')?.includes('image/png'))throw Error('Thumbnail unavailable');
latest.thumbnail='/observations/nepal-rasuwa-thumbnail.png';latest.thumbnailRequest=thumbRequest.toString();
await fs.writeFile(`public${latest.thumbnail}`,Buffer.from(await thumb.arrayBuffer()));
archive.regions=archive.regions.filter(r=>r.id!==region.id);
archive.regions.push({...region,query,observations});archive.retrieved=new Date().toISOString();
await fs.writeFile('public/data/observatory.json',JSON.stringify(archive,null,2));
