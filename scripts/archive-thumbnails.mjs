import fs from 'node:fs/promises';
const path='public/data/observatory.json';
const archive=JSON.parse(await fs.readFile(path,'utf8'));
for(const region of archive.regions){
 const frame=region.observations.at(-1);
 const request=new URL(frame.request);request.searchParams.set('WIDTH','320');request.searchParams.set('HEIGHT','281');
 const response=await fetch(request,{signal:AbortSignal.timeout(20000)});
 if(!response.ok||!response.headers.get('content-type')?.includes('image/png'))throw Error('NASA thumbnail unavailable');
 const bytes=Buffer.from(await response.arrayBuffer());
 frame.thumbnail=`/observations/${region.id}-thumbnail.png`;frame.thumbnailRequest=request.toString();
 await fs.writeFile(`public${frame.thumbnail}`,bytes);
 console.log(`${region.id} source-rendered thumbnail: ${bytes.length} bytes`);
}
await fs.writeFile(path,JSON.stringify(archive,null,2));
