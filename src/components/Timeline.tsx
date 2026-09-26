import { Pause, Play, SkipBack, SkipForward } from 'lucide-react';
import { useWorkspace } from '../data/Workspace';
import { date } from './ui';
export default function Timeline(){const w=useWorkspace(),d=w.dataset;if(!d)return null;return <section className="timeline" aria-label="Earth time machine">
 <div className="timeline-title"><div><span className="tiny">Earth time machine</span><strong>{date(d.observations[w.frame].date)}</strong></div><span className="muted">{d.status==='synthetic'?'Illustrative dates':'Acquisitions'} · discrete frames, no interpolation</span><div className="playback">
 <button aria-label="Step back" disabled={w.frame===0} onClick={()=>{w.setPlaying(false);w.setFrame(w.frame-1);}}><SkipBack size={16}/></button>
 <button className="primary icon" aria-label={w.playing?'Pause':'Play'} onClick={()=>{if(!w.playing&&w.frame===d.observations.length-1)w.setFrame(0);w.setPlaying(!w.playing);}}>{w.playing?<Pause size={17}/>:<Play size={17}/>}</button>
 <button aria-label="Step forward" disabled={w.frame===d.observations.length-1} onClick={()=>{w.setPlaying(false);w.setFrame(w.frame+1);}}><SkipForward size={16}/></button><select aria-label="Playback speed" value={w.speed} onChange={e=>w.setSpeed(Number(e.target.value))}><option value="0.5">0.5×</option><option value="1">1×</option><option value="2">2×</option></select></div></div>
 <input aria-label="Observation timeline" type="range" min="0" max={d.observations.length-1} value={w.frame} onChange={e=>{w.setPlaying(false);w.setFrame(Number(e.target.value));}}/>
 <div className="ticks">{d.observations.map((o,i)=><button key={o.id} className={w.frame===i?'selected':''} onClick={()=>{w.setPlaying(false);w.setFrame(i);}} aria-pressed={w.frame===i}>{date(o.date).replace(' 2026','')}</button>)}</div>
 </section>;}
