import { datasetSchema, type Dataset } from './schema.js';

const cases=[
 {id:'delta',title:'A wetland in transition',location:'Brahmaputra floodplain, Bangladesh',phenomenon:'wetland',bounds:[89.58,25.04,89.90,25.32],description:'A controlled teaching experiment: a growing low-backscatter zone, inspired by open-water change. Coordinates provide geographic context only. No flood occurred here is implied.'},
 {id:'fields',title:'The rhythm of a growing season',location:'Sacramento Valley, California',phenomenon:'agriculture',bounds:[-121.93,38.8,-121.61,39.08],description:'A controlled teaching experiment: alternating field-like blocks brighten and darken through time. It demonstrates ambiguity between crop structure, moisture, and management, without claiming crop classification.'},
 {id:'forest',title:'Reading a disturbed landscape',location:'Central Kalimantan, Indonesia',phenomenon:'disturbance',bounds:[113.68,-2.28,114.0,-2.0],description:'A controlled teaching experiment: an expanding rectangular disturbance changes radar intensity. It demonstrates why intensity alone cannot identify deforestation or wildfire.'}
] as const;

export function createDemo(index:number):Dataset {
 const c=cases[index];const width=48,height=48;
 return datasetSchema.parse({...c,status:'synthetic',width,height,pixelAreaM2:null,crs:'EPSG:4326 illustrative display grid',polarization:'HH-like teaching values; not measured',track:'Not applicable — synthetic',unit:'linear power',
 provenance:{source:'SARFlow deterministic teaching fixture',url:'https://science.nasa.gov/mission/nisar/',product:'SYNTHETIC-POWER v1 (not a NISAR product)',created:'2026-09-23T00:00:00Z',license:'Project-authored teaching fixture, CC0-1.0',generator:'shared/demo.ts:createDemo v1',processing:['Deterministic mathematical grid','Pairwise common valid mask','Optional 3×3 linear-power mean','10 log10(after / before)','Symmetric user-defined absolute threshold'],limitations:['All values and dates are synthetic. No satellite imagery is generated.','No ground truth, calibrated error model, or classification probability.','Geographic bounds are context only; physical affected area is unavailable.','Threshold sensitivity is not a confidence interval.']},
 observations:Array.from({length:6},(_,t)=>({id:`${c.id}-t${t}`,date:new Date(Date.UTC(2026,5,1+t*12)).toISOString(),sourceId:`fixture-v1-${c.id}-${t}`,power:Array.from({length:width*height},(_,i)=>{
 const x=i%width,y=Math.floor(i/width);
 if(x<2||y<2||x>45||y>45||(x>35&&y<8))return null;
 const base=-12+1.4*Math.sin(x*.35)+1.1*Math.cos(y*.28)+.55*Math.sin(i*1.73+t*.8);
 let change=0;
 if(index===0){const river=23+6*Math.sin(y*.13);if(Math.abs(x-river)<2+t*1.15)change=-t*1.35;}
 if(index===1)change=((Math.floor(x/9)+Math.floor(y/8))%2?1:-1)*Math.sin(t*.45)*4;
 if(index===2&&x>12&&x<18+t*4&&y>17&&y<34)change=t*.95;
 return Number((10**((base+change)/10)).toPrecision(7));
 })}))});
}
export const demoDatasets=cases.map((_,i)=>createDemo(i));
