import { useEffect, useRef } from 'react';
import { db } from '../../shared/analysis';
import type { Lens } from '../../shared/schema';
export function color(value:number|null,lens:Lens,threshold=3):string {
 if(value===null)return '#d2dbe0';
 if(lens==='detected')return Math.abs(value)<threshold?'#c8d2d6':value<0?'#245f98':'#a66b21';
 if(lens==='uncertainty')return Math.abs(Math.abs(value)-threshold)<.5?'#985b16':Math.abs(value)>=threshold?'#36576b':'#d5dde1';
 if(lens==='difference'){const t=Math.min(1,Math.abs(value)/6);return value<0?`rgb(${Math.round(235-200*t)},${Math.round(239-135*t)},${Math.round(241-82*t)})`:`rgb(${Math.round(235-61*t)},${Math.round(239-130*t)},${Math.round(241-212*t)})`;}
 const t=Math.max(0,Math.min(1,(db(value)+24)/20));const n=Math.round(25+220*t);return `rgb(${n},${n},${n})`;
}
export function rasterURL(values:(number|null)[],width:number,height:number,lens:Lens,threshold=3){const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d')!;values.forEach((v,i)=>{ctx.fillStyle=color(v,lens,threshold);ctx.fillRect(i%width,Math.floor(i/width),1,1);});return canvas.toDataURL('image/png');}
export default function Raster({values,width,height,lens='raw',threshold=3,label}:{values:(number|null)[];width:number;height:number;lens?:Lens;threshold?:number;label:string}){const ref=useRef<HTMLCanvasElement>(null);useEffect(()=>{const ctx=ref.current?.getContext('2d');if(!ctx)return;values.forEach((v,i)=>{ctx.fillStyle=color(v,lens,threshold);ctx.fillRect(i%width,Math.floor(i/width),1,1);});},[values,width,lens,threshold]);return <canvas ref={ref} width={width} height={height} role="img" aria-label={label} className="raster"/>;}
