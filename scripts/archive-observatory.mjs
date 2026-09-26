import fs from 'node:fs/promises';
import crypto from 'node:crypto';
const layer='NISAR_L2_Geocoded_Polarimetric_Covariance';
const regions=[
 {id:'seattle',name:'Puget Sound',country:'Washington, United States',topic:'Water, cities & terrain',center:[-122.33,47.6],bounds:[-122.85,47.15,-121.8,48.0],description:'Trace the contrast between water, urban structure, forest, and mountainous terrain around Seattle.'},
 {id:'brahmaputra',name:'Brahmaputra floodplain',country:'Bangladesh',topic:'River corridors & wetlands',center:[89.72,25.15],bounds:[89.3,24.75,90.15,25.55],description:'Explore river corridors and agricultural landscapes. Changing radar appearance alone does not establish flooding.'},
 {id:'sacramento',name:'Sacramento Valley',country:'California, United States',topic:'Agricultural landscapes',center:[-121.8,39.0],bounds:[-122.3,38.6,-121.3,39.4],description:'Inspect field patterns and surface structure across repeated radar observations; crop identity and yield are not inferred.'}
];
await fs.mkdir('public/observations',{recursive:true});
const result=[];
for(const region of regions){
 const [lon,lat]=region.center;
 const query=`https://cmr.earthdata.nasa.gov/search/granules.json?short_name=NISAR_L2_GCOV_PROVISIONAL_V1&page_size=100&sort_key=-start_date&point=${lon},${lat}`;
 const response=await fetch(query,{signal:AbortSignal.timeout(20000)});if(!response.ok)throw Error(`CMR HTTP ${response.status}`);
 const {feed}=await response.json();const groups=new Map();
 for(const e of feed.entry){const tokens=e.title.split('_');const key=tokens.slice(5,10).join('_');const group=groups.get(key)??[];if(!group.some(x=>x.time_start.slice(0,10)===e.time_start.slice(0,10)))group.push(e);groups.set(key,group);}
 const selected=[...groups.values()].filter(g=>g.length>=3).sort((a,b)=>b[0].time_start.localeCompare(a[0].time_start))[0];
 if(!selected)throw Error(`No repeated compatible catalog group for ${region.id}`);
 const observations=[];
 for(const e of selected.slice(0,4).reverse()){
  const date=e.time_start.slice(0,10);
  const request=new URL('https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi');
  request.search=new URLSearchParams({SERVICE:'WMS',VERSION:'1.1.1',REQUEST:'GetMap',LAYERS:layer,STYLES:'',FORMAT:'image/png',TRANSPARENT:'TRUE',SRS:'EPSG:4326',BBOX:region.bounds.join(','),WIDTH:'1024',HEIGHT:'900',TIME:date}).toString();
  const image=await fetch(request,{signal:AbortSignal.timeout(30000)});if(!image.ok||!image.headers.get('content-type')?.includes('image/png'))throw Error(`GIBS image failed ${date}: ${image.status}`);
  const bytes=Buffer.from(await image.arrayBuffer());const local=`/observations/${region.id}-${date}.png`;
  await fs.writeFile(`public${local}`,bytes);
  const polygon=(e.polygons?.[0]?.[0]?.split(' ').map(Number)??[]).reduce((a,n,i,all)=>{if(i%2===0)a.push([all[i+1],n]);return a;},[]);
  observations.push({id:e.id,date,acquired:e.time_start,title:e.title,image:local,request:request.toString(),sha256:crypto.createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length,polygon,source:`https://cmr.earthdata.nasa.gov/search/concepts/${e.id}.html`});
  console.log(`${region.id}: ${date}, ${bytes.length} bytes`);
 }
 result.push({...region,query,observations});
}
await fs.writeFile('public/data/observatory.json',JSON.stringify({version:1,retrieved:new Date().toISOString(),source:'NASA GIBS / ASF / NASA CMR',layer,collection:'NISAR_L2_GCOV_PROVISIONAL_V1',status:'Archived actual NISAR false-color imagery',limitations:['Daily mosaic may include more than one acquisition, mode, or track. Listed granule is a matching catalog record, not an exhaustive pixel-source inventory.','False-color RGB is a visualization, not calibrated power. No dB differences or event area are derived from colors.','Catalog grouping selects a repeated track/frame/mode; daily mosaic composition can still differ.','Transparent pixels mean no rendered coverage. Visual changes can reflect acquisition or rendering choices.'],regions:result},null,2));
