import type { Observatory, Region } from './observatory';
import type { Analysis, Dataset } from './schema';

export type Receipt={stage:string;detail:string;kind:'source'|'processed'|'inference'|'unavailable'|'context';url?:string};
export type Metric={label:string;value:number|null;unit:string;source:string;method:string};
export type Investigation={id:string;status:string;location:string;interval:string;phenomenon:string;
 metrics:Metric[];receipts:Receipt[];limitations:string[];story:{question:string;answer:string}[]};
export const missionContext=[
 {name:'Sentinel-1',measures:'C-band SAR',use:'Independent radar comparison; wavelength, geometry, polarization and dates must be matched.',url:'https://www.esa.int/Applications/Observing_the_Earth/Copernicus/Sentinel-1'},
 {name:'Landsat 9',measures:'Optical and thermal observations',use:'Surface context on cloud-free dates. Optical reflectance is not radar backscatter.',url:'https://science.nasa.gov/mission/landsat-9/'},
 {name:'GPM',measures:'Precipitation',use:'Rainfall context for a water-change hypothesis. Rainfall does not directly measure flood extent.',url:'https://gpm.nasa.gov/missions/GPM'},
];
export function visualInvestigation(data:Observatory,region:Region,beforeIndex:number,afterIndex:number):Investigation{
 const before=region.observations[beforeIndex],after=region.observations[afterIndex];
 const chronological=before.date<after.date;
 return {id:`${region.id}:${before.id}:${after.id}`,status:'Actual radar visualization · event not detected',location:region.name,
  interval:`${before.acquired} → ${after.acquired}`,phenomenon:'Unclassified visual investigation',
  metrics:[{label:'Affected area',value:null,unit:'km²',source:'No calibrated change mask',method:'Requires validated mask and pixel area'},
   {label:'Change magnitude',value:null,unit:'dB',source:'RGB browse only',method:'Requires compatible calibrated power arrays'},
   {label:'Event confidence',value:null,unit:'probability',source:'No validation data',method:'No event model fitted or calibrated'}],
  receipts:[{stage:'Mission / instrument',detail:'NISAR · L-SAR',kind:'source',url:'https://science.nasa.gov/mission/nisar/'},
   {stage:'Dataset',detail:data.collection,kind:'source',url:region.query},
   {stage:'Before observation',detail:`${before.acquired} · ${before.id}`,kind:'source',url:before.source},
   {stage:'After observation',detail:`${after.acquired} · ${after.id}`,kind:'source',url:after.source},
   {stage:'Processing',detail:'NASA GCOV false-color daily mosaic → geographic PNG → map display. A matching granule is not exhaustive pixel provenance.',kind:'processed',url:after.request},
   {stage:'Algorithm',detail:'Date selection and synchronized visual comparison only.',kind:'processed'},
   {stage:'Measurement / result',detail:'No calibrated difference or detected event is computed from these colors.',kind:'unavailable'},
   {stage:'Uncertainty',detail:'Acquisition mode, mosaic composition, speckle and environmental conditions can affect appearance. Confidence not estimated.',kind:'unavailable'},
   {stage:'Method reference',detail:'ASF NISAR Worldview product guide; explains the visualization, not validation of this event.',kind:'context',url:'https://hyp3-docs.asf.alaska.edu/nisar-docs/worldview/'}],
  limitations:[...(!chronological?['Select an earlier reference date to establish a before/after interval.']:[]),...data.limitations],
  story:[{question:'What changed?',answer:'No physical change has been quantified. Compare the displayed radar appearances and record your interpretation separately.'},
   {question:'Where and when?',answer:`${region.name}; ${before.date} to ${after.date}.`},
   {question:'How do we know?',answer:'The dated images and catalog records are inspectable below. They establish observation provenance, not an event cause.'},
   {question:'What supports it?',answer:'NASA imagery and acquisition metadata support the visual comparison. No independent mission measurement is attached.'},
   {question:"What does not follow?",answer:'Color changes alone do not establish flooding, displacement, damaged area, or confidence.'},
   {question:'Why does it matter?',answer:'A repeatable visual comparison can help select locations for calibrated analysis and independent verification.'}]};
}
export function numericalInvestigation(d:Dataset,r:Analysis,before:number,after:number,filter:boolean):Investigation{
 const pair=`${d.observations[before].sourceId} → ${d.observations[after].sourceId}`;
 const method=`Common valid support; ${filter?'3 × 3 linear mean; ':''}10 log10(after / before); |Δ| ≥ ${r.threshold} dB`;
 return {id:`${d.id}:${before}:${after}:${r.threshold}:${filter}`,status:d.status==='synthetic'?'SYNTHETIC DEMO · not an Earth event':'Algorithmic change candidates · cause unvalidated',location:d.location,interval:`${d.observations[before].date} → ${d.observations[after].date}`,phenomenon:`${d.phenomenon} investigation; attribution unvalidated`,
 metrics:[{label:'Candidate cells',value:r.changed,unit:'cells',source:pair,method},
 {label:'Mean signed change',value:r.mean,unit:'dB',source:pair,method:'Arithmetic mean of valid per-cell log-ratios'},
 {label:'Candidate-mask area',value:r.areaKm2,unit:'km²',source:pair,method:'Candidate count × supplied pixel area / 1,000,000; not verified event extent'},
 {label:'Event confidence',value:null,unit:'probability',source:'No labeled validation set',method:'Threshold sensitivity is not confidence'}],
 receipts:[{stage:'Dataset',detail:`${d.provenance.source} · ${d.provenance.product} · ${d.status}`,kind:'source',url:d.provenance.url},
 {stage:'Observation pair',detail:pair,kind:'source'},
 {stage:'Processing',detail:d.provenance.processing.join(' → '),kind:'processed'},
 {stage:'Algorithm',detail:method,kind:'processed'},
 {stage:'Measurement',detail:`${r.valid} valid paired cells; mean ${r.mean.toFixed(3)} dB`,kind:'processed'},
 {stage:'Result',detail:`${r.changed} threshold candidates. This is not an event classification.`,kind:'inference'},
 {stage:'Uncertainty',detail:`${r.excluded} excluded cells. Event confidence not estimated.`,kind:'unavailable'}],limitations:d.provenance.limitations,
 story:[{question:'What changed?',answer:`${r.increase} cells increased and ${r.decrease} decreased beyond the chosen threshold.${d.status==='synthetic'?' These are constructed teaching signals.':''}`},
 {question:'How do we know?',answer:method},
 {question:'What supports it?',answer:'The input arrays, common validity mask and exported processing parameters reproduce the result.'},
 {question:'What does not follow?',answer:'No cause, flood depth, displacement, or event accuracy is established.'},
 {question:'Why does it matter?',answer:'The method exposes how a decision threshold changes candidate selection, enabling reproducible investigation.'}]};
}

export function spatialProfile(values:(number|null)[],width:number,height:number,row:number){
 if(!Number.isInteger(row)||row<0||row>=height||values.length!==width*height)throw Error('Invalid profile row or raster dimensions');
 return values.slice(row*width,(row+1)*width).map((value,column)=>({column,value}));
}
