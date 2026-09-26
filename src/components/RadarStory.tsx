import { useEffect, useRef, useState } from 'react';
import { Pause, Play, RotateCcw } from 'lucide-react';
import './radar-story.css';

const stages = [
 {title: 'Send a radar pulse', text: 'A side-looking radar illuminates a strip of Earth as the spacecraft travels along its orbit.'},
 {title: 'Listen to the return', text: 'Part of the signal scatters back. Its strength and phase carry information about the surface and the viewing geometry.'},
 {title: 'Build an observation', text: 'Processing combines echoes collected along the flight path into a SAR image. Compare compatible observations to investigate change.'},
];

export default function RadarStory() {
 const root=useRef<HTMLElement>(null);
 const [step,setStep]=useState(0),[playing,setPlaying]=useState(false),[visible,setVisible]=useState(false);
 const [reduced,setReduced]=useState(()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches);
 const started=useRef(false);
 useEffect(()=>{
  const media=window.matchMedia('(prefers-reduced-motion: reduce)');
  const change=()=>{setReduced(media.matches);if(media.matches)setPlaying(false);};
  media.addEventListener('change',change);
  const observer=new IntersectionObserver(([entry])=>setVisible(entry.isIntersecting),{threshold:0.25});
  if(root.current)observer.observe(root.current);
  return()=>{media.removeEventListener('change',change);observer.disconnect();};
 },[]);
 useEffect(()=>{if(visible&&!reduced&&!started.current){started.current=true;setPlaying(true);}},[visible,reduced]);
 useEffect(()=>{
  if(!playing||!visible||reduced||document.hidden)return;
  const timer=setTimeout(()=>{if(step===2)setPlaying(false);else setStep(step+1);},3600);
  return()=>clearTimeout(timer);
 },[playing,visible,reduced,step]);
 useEffect(()=>{const hide=()=>{if(document.hidden)setPlaying(false);};document.addEventListener('visibilitychange',hide);return()=>document.removeEventListener('visibilitychange',hide);},[]);
 const running=playing&&visible&&!reduced;
 return <section id="radar-story" className="radar-story" ref={root} aria-labelledby="radar-story-title" data-step={step} data-running={running}>
  <div className="radar-story-copy"><span className="radar-story-label">An illustrated introduction</span><h2 id="radar-story-title">From a pulse{' '}<br/>to a picture.</h2><p>Follow the signal. Discover how radar gives us another way to observe Earth.</p>
   <div className="radar-story-steps" role="group" aria-label="Radar explanation stages">{stages.map((stage,i)=><button key={stage.title} aria-pressed={step===i} onClick={()=>{started.current=true;setPlaying(false);setStep(i);}}><span>{i+1}</span>{stage.title}</button>)}</div>
   <p className="radar-story-explanation" aria-live="off">{stages[step].text}</p>
   <div className="radar-story-actions"><button aria-label={playing?'Pause radar animation':'Play radar animation'} disabled={reduced} onClick={()=>{started.current=true;if(!playing&&step===2)setStep(0);setPlaying(!playing);}}>{playing?<Pause size={16}/>:<Play size={16}/>} {playing?'Pause':'Play'}</button><button aria-label="Restart radar explanation" onClick={()=>{started.current=true;setStep(0);setPlaying(!reduced);}}><RotateCcw size={15}/>Restart</button></div>
   {reduced&&<p className="radar-motion-note">Reduced motion is on. Select each stage to explore the illustration.</p>}
  </div>
  <div className="radar-story-visual">
   <svg viewBox="0 0 680 460" role="img" aria-labelledby="radar-diagram-title radar-diagram-desc">
    <title id="radar-diagram-title">Illustrated side-looking radar: {stages[step].title}</title><desc id="radar-diagram-desc">A schematic spacecraft sends radar toward a landscape, receives scattered echoes, and forms an observation. Geometry, timing, and spacecraft design are illustrative.</desc>
    <defs><pattern id="radar-terrain-grid" width="35" height="35" patternUnits="userSpaceOnUse"><path d="M35 0H0V35" fill="none" stroke="#729da8" strokeWidth="0.5"/></pattern><linearGradient id="radar-beam-fill" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#83cbd2" stopOpacity="0.03"/><stop offset="1" stopColor="#83cbd2" stopOpacity="0.24"/></linearGradient></defs>
    <path d="M45 123 Q285 12 619 96" className="radar-orbit"/><text x="453" y="53" className="diagram-label">Flight direction →</text>
    <g className="radar-ground"><path d="M102 273 414 185 617 328 307 436Z" fill="#244c54" stroke="#648891"/><path d="M102 273 414 185 617 328 307 436Z" fill="url(#radar-terrain-grid)"/><path d="m102 273 205 163v15L102 289Z" fill="#173a43"/><path d="m307 436 310-108v16L307 451Z" fill="#112f3a"/><path d="M359 209c-84 82 36 73-15 123s-48 55-1 91" fill="none" stroke="#7fb3bb" strokeWidth="15"/><path d="m169 287 49-70 51 45 32-59 46 47" fill="#315f62" stroke="#9cb9b3" strokeWidth="1.5"/><path d="m423 289 57-17 55 37-58 19Z" fill="#5a7460" stroke="#94ae99"/><path d="m441 335 48-15 55 37-47 16Z" fill="#6a7860" stroke="#94ae99"/><path d="m360 359 44-14 46 32-42 16Z" fill="#416b60" stroke="#94ae99"/></g>
    <g className="radar-swath"><path d="m304 270 143-42 121 88-143 46Z" fill="#aad5cc" fillOpacity=".10" stroke="#b1d5c5" strokeDasharray="5 5"/><text x="487" y="390" className="diagram-label">Imaged strip</text><path d="m495 374-34-27" stroke="#a5c3cb"/></g>
    <g className="radar-transmit"><path d="M231 105 304 270 568 316Z" fill="url(#radar-beam-fill)"/><path className="radar-pulse pulse-one" d="m231 105 201 207"/><path className="radar-pulse pulse-two" d="m231 105 146 189"/><path className="radar-pulse pulse-three" d="m231 105 280 189"/></g>
    <g className="radar-return"><path className="radar-echo pulse-one" d="M431 312 231 105"/><path className="radar-echo pulse-two" d="M375 294 231 105"/><path className="radar-echo pulse-three" d="M510 294 231 105"/></g>
    <g className="radar-spacecraft"><path d="m161 76 46-15 16 25-47 16Z" fill="#326284" stroke="#a3c6d9"/><path d="m247 48 46-15 16 25-47 16Z" fill="#326284" stroke="#a3c6d9"/><path d="m177 71 16 25m-1-30 16 25m55-48 16 25m0-30 16 25" stroke="#8aafc7"/><path d="m208 62 29-9 25 33-30 11Z" fill="#d4ddd9" stroke="#e7f1ee"/><path d="m232 97 12 18" stroke="#d4ddd9" strokeWidth="3"/><ellipse cx="248" cy="118" rx="33" ry="10" transform="rotate(28 248 118)" fill="#c9b682" stroke="#f1dfb1"/><path d="m221 103 54 30m-37-24 17 16" stroke="#827959"/></g>
    <g className="radar-image"><rect x="455" y="107" width="137" height="102" rx="5" fill="#183541" stroke="#a9c8cf"/><path d="m467 191 30-32 23 12 32-46 28 22" fill="none" stroke="#90c8b1" strokeWidth="3"/><path d="M466 128h30m-30 10h21m56 49h35" stroke="#a2bdc6"/><text x="466" y="226" className="diagram-label">Processed observation</text><path className="radar-data-path" d="M280 88Q385 48 465 107" fill="none" stroke="#afc8d2" strokeDasharray="4 6"/></g>
    <text x="40" y="430" className="diagram-label">{step===0?'Transmit':step===1?'Receive':'Process'}</text>
   </svg>
   <div className="radar-story-caption"><span>Conceptual animation</span><span>Not to scale · not a satellite acquisition</span></div>
  </div>
 </section>;
}
