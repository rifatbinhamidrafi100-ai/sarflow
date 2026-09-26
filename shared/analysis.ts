import type { Analysis, Dataset } from './schema';

export function db(power:number):number {if(!Number.isFinite(power)||power<=0)throw new Error('Power must be finite and positive');return 10*Math.log10(power);}

/** Fixed 3x3 box mean in linear power. Invalid centers remain invalid. */
export function smooth(values:(number|null)[],width:number,height:number):(number|null)[] {
  return values.map((value,i)=>{
    if(value===null)return null;
    let sum=0,count=0;const x=i%width,y=Math.floor(i/width);
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
      const xx=x+dx,yy=y+dy;if(xx<0||xx>=width||yy<0||yy>=height)continue;
      const v=values[yy*width+xx];if(v!==null){sum+=v;count++;}
    }
    return count?sum/count:null;
  });
}

export function preparePair(dataset:Dataset,beforeIndex:number,afterIndex:number,filter:boolean){
 const a=dataset.observations[beforeIndex].power,b=dataset.observations[afterIndex].power;
 const commonA=a.map((v,i)=>v===null||b[i]===null?null:v),commonB=b.map((v,i)=>v===null||a[i]===null?null:v);
 return {before:filter?smooth(commonA,dataset.width,dataset.height):commonA,after:filter?smooth(commonB,dataset.width,dataset.height):commonB};
}

export function analyze(dataset:Dataset,beforeIndex:number,afterIndex:number,threshold:number,filter:boolean):Analysis {
  const started=performance.now();
  if(!Number.isInteger(beforeIndex)||!Number.isInteger(afterIndex)||beforeIndex<0||afterIndex>=dataset.observations.length||beforeIndex>=afterIndex)throw new Error('Select a chronological pair of different observations');
  if(!Number.isFinite(threshold)||threshold<0.5||threshold>10)throw new Error('Threshold must be between 0.5 and 10 dB');
  const a=dataset.observations[beforeIndex].power,b=dataset.observations[afterIndex].power;
  if(a.length!==dataset.width*dataset.height||b.length!==a.length)throw new Error('Mismatched raster dimensions');
  if([...a,...b].some(v=>v!==null&&(!Number.isFinite(v)||v<=0)))throw new Error('Invalid linear power');
  // Common support before filtering avoids comparing different neighborhoods.
  const {before,after}=preparePair(dataset,beforeIndex,afterIndex,filter);
  const delta=before.map((v,i)=>v===null||after[i]===null?null:db(after[i]!)-db(v));
  const values=delta.filter((v):v is number=>v!==null);
  if(!values.length)throw new Error('No overlapping valid pixels for this pair');
  const mask=delta.map(v=>v===null?null:Math.abs(v)>=threshold?(v>0?1:-1):0);
  const increase=mask.filter(v=>v===1).length,decrease=mask.filter(v=>v===-1).length,changed=increase+decrease;
  const histogram=Array.from({length:12},(_,i)=>({label:i===0?'< −5':i===11?'≥ 5':`${i-6} to ${i-5}`,count:0}));
  values.forEach(v=>histogram[Math.max(0,Math.min(11,Math.floor(v)+6))].count++);
  return {delta,before,after,mask,valid:values.length,excluded:delta.length-values.length,changed,increase,decrease,mean:values.reduce((s,v)=>s+v,0)/values.length,
    areaKm2:dataset.pixelAreaM2===null?null:changed*dataset.pixelAreaM2/1e6,
    sensitivity:[Math.max(.5,threshold-.5),threshold,Math.min(10,threshold+.5)].map(t=>({threshold:t,count:values.filter(v=>Math.abs(v)>=t).length})),histogram,threshold,elapsedMs:performance.now()-started};
}

export function temporalSupport(dataset:Dataset){
 const common=dataset.observations[0].power.map((_,i)=>dataset.observations.every(o=>o.power[i]!==null));
 return {common,count:common.filter(Boolean).length,perDate:dataset.observations.map(o=>o.power.filter(v=>v!==null).length)};
}
export function temporalMeans(dataset:Dataset):number[]{const {common,count}=temporalSupport(dataset);return dataset.observations.map(o=>count?db(o.power.reduce<number>((sum,v,i)=>sum+(common[i]?v!:0),0)/count):NaN);}
