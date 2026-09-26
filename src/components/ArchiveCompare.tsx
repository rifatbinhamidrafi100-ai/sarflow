import {useEffect,useState} from 'react';
import type {ActualFrame} from '../../shared/observatory';

/** Same archived display pixels, without WebGL or external basemap services. */
export default function ArchiveCompare({frame,before,compare,split,mode,onStatus}:{frame:ActualFrame;before:ActualFrame;compare:boolean;split:number;mode:string;onStatus:(status:string)=>void}){
 const [error,setError]=useState(false),[retry,setRetry]=useState(0);
 useEffect(()=>{
  let active=true;setError(false);onStatus('Loading archived images');
  const frames=compare?[before,frame]:[frame];
  const images=frames.map(f=>new Image());
  Promise.all(images.map((img,i)=>new Promise<void>((resolve,reject)=>{img.onload=()=>resolve();img.onerror=()=>reject();img.src=frames[i].image;}))).then(()=>{if(active)onStatus('Archived imagery loaded');}).catch(()=>{if(active){setError(true);onStatus('Image unavailable');}});
  return()=>{active=false;images.forEach(i=>{i.onload=null;i.onerror=null;});};
 },[frame.image,before.image,compare,retry,onStatus]);
 return <div className="archive-compare" aria-label="Archived image comparison">
  <img src={compare?before.image:frame.image} alt={`Archived false-color radar visualization, ${compare?before.date:frame.date}`}/>
  {compare&&<img className="archive-after" src={frame.image} alt={`After visualization, ${frame.date}`} style={{clipPath:mode==='opacity'?'none':`inset(0 0 0 ${mode==='split'?50:split}%)`,opacity:mode==='opacity'?split/100:1}}/>}
  <span className="archive-caption">Archived display pixels · no numerical detection · north up</span>
  {error&&<div className="obs-map-error" role="alert">Archived image unavailable. <button onClick={()=>setRetry(v=>v+1)}>Retry archived images</button></div>}
 </div>;
}
