import { useRef } from 'react';
import { Download, External } from './ui';
import { missionContext, type Investigation as Dossier } from '../../shared/investigation';
import './investigation.css';

export default function Investigation({value}:{value:Dossier}){
 const dialog=useRef<HTMLDialogElement>(null);
 return <section className="investigation" aria-label="Change DNA and scientific evidence">
  <header><div><span className="tiny">{value.status}</span><h2>Change DNA</h2><p>A scientific identity, including what remains unknown.</p></div><button className="primary" onClick={()=>dialog.current?.showModal()}>Show me the receipts</button></header>
  <dl className="dna-identity"><div><dt>Location</dt><dd>{value.location}</dd></div><div><dt>Observation interval (UTC)</dt><dd>{value.interval}</dd></div><div><dt>Phenomenon</dt><dd>{value.phenomenon}</dd></div></dl>
  <div className="dna-metrics">{value.metrics.map(m=><article key={m.label}><h3>{m.label}</h3><strong>{m.value===null?'Not available':Number.isInteger(m.value)?m.value.toLocaleString():m.value.toFixed(3)}{m.value!==null&&<small> {m.unit}</small>}</strong><details><summary>Unit, source & method</summary><p>Unit: {m.unit}</p><p>Source: {m.source}</p><p>Method: {m.method}</p></details></article>)}</div>
  <details className="earth-story"><summary>Earth story — what the evidence says</summary><div>{value.story.map(s=><article key={s.question}><h3>{s.question}</h3><p>{s.answer}</p></article>)}</div></details>
  <details className="cross-check"><summary>Multi-mission cross-check guide</summary><p>No independent mission measurements have been ingested for this investigation. These official resources suggest follow-up evidence, not corroborated findings. Match location, acquisition interval, resolution and the quantity measured before comparing.</p><div>{missionContext.map(m=><article key={m.name}><h3>{m.name}</h3><strong>{m.measures}</strong><p>{m.use}</p><External href={m.url}>Official mission reference</External><p className="tiny">Status: contextual reference only</p></article>)}</div><p>Documentaries and narrative reports provide context. Data and research can support a claim only when their methods and relevance to this event are documented.</p></details>
  <dialog ref={dialog} className="evidence receipts" aria-labelledby="receipts-title"><div className="drawer-head"><h2 id="receipts-title">Show me the receipts</h2><button aria-label="Close receipts" onClick={()=>dialog.current?.close()}>Close</button></div><p>{value.status}</p><h3>Evidence graph</h3><p>Read each step in order. Missing measurements break the path to a scientific conclusion.</p><ol className="receipt-graph">{value.receipts.map((r,i)=><li key={`${r.stage}-${i}`} data-kind={r.kind}><span>{r.kind}</span><h4>{r.stage}</h4><p>{r.detail}</p>{r.url&&<External href={r.url}>Inspect source</External>}</li>)}</ol><h3>Limitations</h3><ul>{value.limitations.map(l=><li key={l}>{l}</li>)}</ul><Download label="Export Change DNA & receipts" name="sarflow-change-dna.json" value={value}/></dialog>
 </section>;
}
