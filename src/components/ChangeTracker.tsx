import {Link} from 'react-router-dom';
import type {Region} from '../../shared/observatory';
import {observationGap} from '../../shared/change-summary';
import {date,Download} from './ui';

export default function ChangeTracker({region,before,after,onCompare}:{region:Region;before:number;after:number;onCompare:(a:number,b:number)=>void}){
 const a=region.observations[before],b=region.observations[after];
 const days=observationGap(a.acquired,b.acquired);
 const rows=region.observations.slice(1).map((o,i)=>({before:region.observations[i],after:o,days:observationGap(region.observations[i].acquired,o.acquired)}));
 const report={location:region.name,before:a,after:b,intervalDays:days,dataType:'rendered-radar-imagery',changedCellPercent:null,waterPollution:null,airPollution:null,affectedArea:null,conclusion:'Visual comparison only. Calibrated measurements and independent evidence are not available in this viewer.',intervals:rows};
 return <section className="panel change-tracker" aria-label="Observation change report">
  <h2>Observation summary</h2>
  <p><strong>{region.name}</strong> · {date(a.date)} → {date(b.date)}</p>
  <p>{days===null?'Choose an earlier “before” date.':days===0?'Same image selected. Choose two different dates.':`Images are ${days.toFixed(1)} days apart.`} Days between them are not shown.</p>
  <ul>
   <li><strong>What you can see:</strong> swipe to compare the two radar images.</li>
   <li><strong>Change percentage:</strong> not measured from these images.</li>
   <li><strong>Water spread:</strong> not confirmed.</li>
   <li><strong>Air and water pollution:</strong> not measured.</li>
   <li><strong>Damage or affected places:</strong> not confirmed.</li>
  </ul>
  <p><strong>Meaning:</strong> different colors alone do not prove flooding, pollution or damage. Missing measurements do not mean nothing changed.</p>
  <details><summary>Details: source and missing evidence</summary>
   <p>Source: NASA NISAR radar visualizations. These are rendered images, not the calibrated radar values needed to calculate change.</p>
   <ul><li><strong>Change:</strong> needs matching calibrated measurements, checks for unusable pixels and a defined comparison rule.</li><li><strong>Water spread:</strong> also needs several dates and terrain checks.</li><li><strong>Pollution:</strong> needs separate air or water measurements, a named pollutant, units and matching dates.</li><li><strong>Impact:</strong> needs confirmed change and evidence about the people, land or structures affected.</li></ul>
   <p>Use the Evidence button to inspect source links and image hashes. The exported report keeps both observations and marks unmeasured results as unknown.</p>
  </details>
  <details><summary>Compare other dates</summary><div className="table-scroll"><table><thead><tr><th>From</th><th>To</th><th>Days apart</th><th>Inspect</th></tr></thead><tbody>{rows.map((r,i)=><tr key={r.after.id}><td>{date(r.before.date)}</td><td>{date(r.after.date)}</td><td>{r.days?.toFixed(1)??'Unknown'}</td><td><button onClick={()=>onCompare(i,i+1)}>Compare interval {i+1}</button></td></tr>)}</tbody></table></div></details>
  <div className="actions"><Download label="Export change tracking report" name="sarflow-change-tracking.json" value={report}/><Link className="button" to="/water">Calibrated water workflow</Link><Link className="button" to="/analysis">Try percentages in the teaching lab</Link></div>
 </section>;
}
