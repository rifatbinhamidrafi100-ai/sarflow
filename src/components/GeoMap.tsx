import { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import { type GeoJSONSource, type ImageSource } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import mapWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import { LocateFixed, Layers } from 'lucide-react';
import { useWorkspace } from '../data/Workspace';
import { smooth } from '../../shared/analysis';
import { rasterURL } from './Raster';
import type { Bounds } from '../../shared/schema';

maplibregl.setWorkerUrl(mapWorkerUrl);

export default function GeoMap({onLocate}:{onLocate:(b:Bounds)=>void}){
 const w=useWorkspace(),d=w.dataset!;const container=useRef<HTMLDivElement>(null),map=useRef<maplibregl.Map|null>(null),latest=useRef({w,onLocate});latest.current={w,onLocate};
 const [ready,setReady]=useState(false),[error,setError]=useState(''),[basemap,setBasemap]=useState(false),[footprint,setFootprint]=useState(true),[coords,setCoords]=useState('Click the map to inspect a location');
 useEffect(()=>{
  if(!container.current)return;let m:maplibregl.Map;
  try {m=new maplibregl.Map({container:container.current,style:{version:8,sources:{land:{type:'geojson',data:'/data/land.json',attribution:'Natural Earth · public domain'}},layers:[{id:'water',type:'background',paint:{'background-color':'#dce9ef'}},{id:'land',type:'fill',source:'land',paint:{'fill-color':'#edf0e9','fill-outline-color':'#a6bbc3'}}]},center:[90,25],zoom:6,attributionControl:{compact:true}});}
  catch{setError('WebGL is unavailable. Use the raster comparison and accessible data tables.');return;}
  map.current=m;m.addControl(new maplibregl.NavigationControl({showCompass:false}),'top-right');m.addControl(new maplibregl.ScaleControl({unit:'metric'}),'bottom-right');
  m.on('load',()=>setReady(true));m.on('error',()=>setError('A map layer could not load. The local raster and analysis remain available. Disable street context or reload to retry.'));
  m.on('click',e=>{const lng=Number(e.lngLat.lng.toFixed(4)),lat=Number(e.lngLat.lat.toFixed(4));setCoords(`${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E`);if(lat<=84.75&&lat>=-84.75&&lng>=-179.75&&lng<=179.75)latest.current.onLocate([lng-.25,lat-.25,lng+.25,lat+.25]);});
  return()=>{setReady(false);m.remove();map.current=null;};
 },[]);
 useEffect(()=>{if(!ready||!map.current)return;const m=map.current,b=d.bounds;const coordinates:[[number,number],[number,number],[number,number],[number,number]]=[[b[0],b[3]],[b[2],b[3]],[b[2],b[1]],[b[0],b[1]]];
  const analysisLens=['difference','detected','uncertainty'].includes(w.lens);
  const values=analysisLens?w.result?.delta:d.observations[w.frame].power;
  const raster=values?(w.lens==='processed'&&w.filter?smooth(values,d.width,d.height):values):Array(d.width*d.height).fill(null);
  const url=rasterURL(raster,d.width,d.height,w.lens,w.threshold);
  if(m.getSource('observation'))(m.getSource('observation') as ImageSource).updateImage({url,coordinates});
  else {m.addSource('observation',{type:'image',url,coordinates});m.addLayer({id:'observation',type:'raster',source:'observation',paint:{'raster-opacity':.92,'raster-resampling':'nearest','raster-fade-duration':0}});}
  const geo={type:'Feature' as const,properties:{},geometry:{type:'Polygon' as const,coordinates:[[...coordinates,coordinates[0]]]}};
  if(m.getSource('footprint'))(m.getSource('footprint') as GeoJSONSource).setData(geo);else{m.addSource('footprint',{type:'geojson',data:geo});m.addLayer({id:'footprint',type:'line',source:'footprint',paint:{'line-color':'#176c97','line-width':2,'line-dasharray':[3,2]}});}
 },[ready,d,w.frame,w.lens,w.result,w.threshold,w.filter]);
 useEffect(()=>{if(!ready||!map.current)return;map.current.fitBounds([[d.bounds[0],d.bounds[1]],[d.bounds[2],d.bounds[3]]],{padding:70,duration:0});},[ready,d.id]);
 useEffect(()=>{if(!ready||!map.current?.getLayer('footprint'))return;map.current.setLayoutProperty('footprint','visibility',footprint?'visible':'none');},[ready,footprint]);
 function toggleBase(){const m=map.current;if(!m||!ready)return;setError('');if(!m.getSource('streets')){m.addSource('streets',{type:'raster',tiles:['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],tileSize:256,attribution:'© OpenStreetMap contributors'});m.addLayer({id:'streets',type:'raster',source:'streets'},'observation');}m.setLayoutProperty('streets','visibility',basemap?'none':'visible');setBasemap(!basemap);}
 return <div className="map-shell"><div ref={container} className="geo-map" aria-label="Interactive geographic map"/>
 <div className="map-top"><span className="map-chip">{d.status==='synthetic'?'Schematic teaching grid · not satellite imagery':'Imported calibrated observation'}</span></div>
 <div className="map-tools"><button onClick={()=>map.current?.fitBounds([[d.bounds[0],d.bounds[1]],[d.bounds[2],d.bounds[3]]],{padding:70,duration:0})}><LocateFixed size={16}/>Fit study area</button><button onClick={toggleBase} aria-pressed={basemap}><Layers size={16}/>{basemap?'Hide':'Show'} street context</button><label className="check"><input type="checkbox" checked={footprint} onChange={e=>setFootprint(e.target.checked)}/>Study footprint</label></div>
 <div className="map-coords">{coords}</div>{error&&<div className="map-error" role="alert">{error}<button onClick={()=>window.location.reload()}>Reload map</button></div>}
 </div>;
}
