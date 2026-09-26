import type { Analysis, Dataset } from './schema';
export function answer(question:string,d:Dataset,r:Analysis|null,before:number,after:number):{text:string;source:string}{
 const q=question.toLowerCase();
 if(/area|large|extent/.test(q))return {text:r?.areaKm2!=null?`${r.areaKm2.toFixed(4)} km² of projected grid cells exceed the threshold. This is not a validated affected-event area.`:'Physical affected area is unavailable. Synthetic grids have no defensible pixel area; no km² estimate is produced.',source:'dataset.pixelAreaM2; result.areaKm2'};
 if(/date|when|interval/.test(q))return {text:`The selected pair is ${d.observations[before].date.slice(0,10)} to ${d.observations[after].date.slice(0,10)}. ${d.status==='synthetic'?'These are illustrative dates.':''}`,source:'dataset.observations[before/after].date'};
 if(/limit|confiden|uncertain/.test(q))return {text:d.provenance.limitations.join(' '),source:'dataset.provenance.limitations'};
 if(/measure|sar|radar/.test(q))return {text:'SAR measures returned microwave signals. Calibrated backscatter describes return strength; phase differences can support interferometry under suitable conditions. Backscatter change alone does not measure displacement.',source:'NASA: Get to Know SAR; Science page'};
 if(/chang|highlight|evidence/.test(q))return {text:r?`${r.changed} of ${r.valid} common valid cells have absolute log-ratio ≥ ${r.threshold.toFixed(1)} dB. ${r.decrease} decrease; ${r.increase} increase. ${d.status==='synthetic'?'This result is computed from a synthetic teaching fixture.':''} It does not establish a real-world event or its cause.`:'Run analysis for the current pair and settings first. No result is available.',source:'result.changed, valid, threshold, decrease, increase'};
 return {text:'That question is outside the available evidence. Ask about change, dates, area, SAR measurements, or limitations. No external knowledge or prediction is generated.',source:'Bounded deterministic answer policy'};
}
