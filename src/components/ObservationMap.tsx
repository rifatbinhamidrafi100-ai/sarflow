import { useEffect, useRef, useState } from 'react';
import * as ml from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Region, ActualFrame } from '../../shared/observatory';
import { LocateFixed, Maximize2, Minus, Plus } from 'lucide-react';
ml.setWorkerUrl(workerUrl);
type Props={region:Region;frame:ActualFrame;before:ActualFrame;compare:boolean;mode?:'swipe'|'split'|'opacity';split:number;opacity:number;footprint:boolean;onStatus:(status:string)=>void;onPoint:(p:[number,number])=>void};
export default function ObservationMap(props:Props){const root=useRef<HTMLDivElement>(null),baseEl=useRef<HTMLDivElement>(null),overlayEl=useRef<HTMLDivElement>(null),maps=useRef<ml.Map[]>([]),latest=useRef(props);latest.current=props;const [ready,setReady]=useState(false),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 useEffect(()=>{if(!baseEl.current||!overlayEl.current)return;setReady(false);setError('');props.onStatus('Loading map');let canceled=false;const made:ml.Map[]=[];
  try{for(const container of [baseEl.current,overlayEl.current]){const map=new ml.Map({container,style:{version:8,sources:{land:{type:'geojson',data:'/data/land.json',attribution:'Natural Earth · NASA GIBS / ASF'}},layers:[{id:'ocean',type:'background',paint:{'background-color':'#142734'}},{id:'land',type:'fill',source:'land',paint:{'fill-color':'#253b42','fill-outline-color':'#526c72'}}]},center:props.region.center,zoom:8,attributionControl:{compact:true},interactive:made.length===0});made.push(map);map.on('error',()=>{if(!canceled){setError('This observation could not render. Retry the map.');latest.current.onStatus('Image unavailable');}});}
  }catch{setError('WebGL is unavailable. Open the archived images in the observation list instead.');return;}
  maps.current=made;const [base,over]=made;
  base.addControl(new ml.ScaleControl({unit:'metric'}),'bottom-right');base.on('move',()=>over.jumpTo({center:base.getCenter(),zoom:base.getZoom(),bearing:base.getBearing(),pitch:base.getPitch()}));
  base.on('click',e=>latest.current.onPoint([Number(e.lngLat.lng.toFixed(5)),Number(e.lngLat.lat.toFixed(5))]));
  Promise.all(made.map(m=>new Promise<void>(resolve=>m.once('load',()=>resolve())))).then(()=>{if(!canceled)setReady(true);});
  return()=>{canceled=true;made.forEach(m=>m.remove());maps.current=[];};
 },[retry]);
 useEffect(()=>{if(!ready)return;const b=props.region.bounds;maps.current[0].fitBounds([[b[0],b[1]],[b[2],b[3]]],{padding:25,duration:0});},[ready,props.region.id]);
 useEffect(()=>{if(!ready)return;const b=props.region.bounds,coordinates:[[number,number],[number,number],[number,number],[number,number]]=[[b[0],b[3]],[b[2],b[3]],[b[2],b[1]],[b[0],b[1]]];let canceled=false;props.onStatus('Loading observation');setError('');
  const images=[props.compare?props.before:props.frame,props.frame];
  const pending:(()=>void)[]=[];
  Promise.all(maps.current.map(async(m,i)=>{const frame=images[i];if(!m.getSource('radar')){m.addSource('radar',{type:'image',url:frame.image,coordinates});m.addLayer({id:'radar',type:'raster',source:'radar',paint:{'raster-fade-duration':0,'raster-opacity':props.opacity,'raster-resampling':'linear'}});}else{(m.getSource('radar') as ml.ImageSource).updateImage({url:frame.image,coordinates});}
   const geo={type:'Feature' as const,properties:{},geometry:{type:'Polygon' as const,coordinates:[frame.polygon]}};
   if(m.getSource('scene'))(m.getSource('scene') as ml.GeoJSONSource).setData(geo);else{m.addSource('scene',{type:'geojson',data:geo});m.addLayer({id:'scene',type:'line',source:'scene',paint:{'line-color':'#ffe3a5','line-width':2,'line-dasharray':[3,2]}});}
   await new Promise<void>((resolve,reject)=>{
    const finish=()=>{clearTimeout(timeout);m.off('idle',loaded);m.off('error',failed);};
    const loaded=()=>{if(m.isSourceLoaded('radar')){finish();resolve();}};
    const failed=()=>{finish();reject(Error('Image unavailable'));};
    const timeout=setTimeout(failed,30000);
    pending.push(()=>{finish();resolve();});
    m.on('idle',loaded);m.on('error',failed);m.triggerRepaint();
   });
  })).then(()=>{if(!canceled)props.onStatus(props.frame.sha256?'Archived imagery loaded':'NASA imagery loaded');}).catch(()=>{if(!canceled){setError('The archived image is unavailable. Retry or choose another acquisition.');props.onStatus('Image unavailable');}});
  return()=>{canceled=true;pending.forEach(cancel=>cancel());};
 },[ready,props.region.id,props.frame.id,props.before.id,props.compare]);
 useEffect(()=>{if(!ready)return;for(const m of maps.current){if(m.getLayer('radar'))m.setPaintProperty('radar','raster-opacity',props.opacity);if(m.getLayer('scene'))m.setLayoutProperty('scene','visibility',props.footprint?'visible':'none');}},[ready,props.opacity,props.footprint,props.frame.id,props.compare]);
 return <div className="observation-map" ref={root}><div ref={baseEl} className="observation-map-canvas"/><div className="observation-map-overlay" style={{visibility:props.compare?'visible':'hidden',clipPath:props.mode==='opacity'?'none':`inset(0 0 0 ${props.split}%)`,opacity:props.mode==='opacity'?props.split/100:1}}><div ref={overlayEl} className="observation-map-canvas"/></div>{props.compare&&props.mode!=='opacity'&&<div className="observation-swipe" style={{left:`${props.split}%`}}><span>↔</span></div>}<div className="obs-map-controls"><button aria-label="Zoom in map" onClick={()=>maps.current[0]?.zoomIn({duration:0})}><Plus size={17}/></button><button aria-label="Zoom out map" onClick={()=>maps.current[0]?.zoomOut({duration:0})}><Minus size={17}/></button><button aria-label="Fit observation" onClick={()=>maps.current[0]?.fitBounds([[props.region.bounds[0],props.region.bounds[1]],[props.region.bounds[2],props.region.bounds[3]]],{padding:25,duration:0})}><LocateFixed size={17}/></button><button aria-label="Fullscreen map" onClick={()=>{if(document.fullscreenElement)void document.exitFullscreen();else void root.current?.requestFullscreen();}}><Maximize2 size={17}/></button></div>{error&&<div className="obs-map-error" role="alert"><p>{error}</p><button onClick={()=>setRetry(v=>v+1)}>Retry map</button></div>}</div>;
}
