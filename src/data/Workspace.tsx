import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Analysis, Dataset, Lens } from '../../shared/schema';
import { provider } from './providers';

function useWorkspaceState(){
 const [datasets,setDatasets]=useState<Dataset[]>([]),[error,setError]=useState(''),[loading,setLoading]=useState(true),[reload,setReload]=useState(0);
 const [selected,setSelected]=useState('delta'),[before,setBefore]=useState(0),[after,setAfter]=useState(5),[frame,setFrame]=useState(5),[threshold,setThreshold]=useState(3),[filter,setFilter]=useState(true),[lens,setLens]=useState<Lens>('processed');
 const [result,setResult]=useState<Analysis|null>(null),[analyzing,setAnalyzing]=useState(false),[analysisError,setAnalysisError]=useState(''),[evidence,setEvidence]=useState(false);
 const [playing,setPlaying]=useState(false),[speed,setSpeed]=useState(1);
 const dataset=datasets.find(d=>d.id===selected)??datasets[0];
 const worker=useRef<Worker|null>(null),request=useRef(0);
 useEffect(()=>{const controller=new AbortController();setLoading(true);setError('');provider.datasets(controller.signal).then(d=>setDatasets(d)).catch(e=>{if(e.name!=='AbortError')setError(e.message);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});return()=>controller.abort();},[reload]);
 useEffect(()=>{worker.current=new Worker(new URL('../workers/analysis.worker.ts',import.meta.url),{type:'module'});return()=>worker.current?.terminate();},[]);
 useEffect(()=>{request.current++;setResult(null);setAnalysisError('');setAnalyzing(false);setLens(l=>['difference','detected','uncertainty'].includes(l)?'processed':l);},[selected,before,after,threshold,filter]);
 useEffect(()=>{if(!playing||!dataset)return;const timer=setInterval(()=>setFrame(f=>{if(f>=dataset.observations.length-1){setPlaying(false);return f;}return f+1;}),1400/speed);return()=>clearInterval(timer);},[playing,speed,dataset]);
 function choose(id:string){const d=datasets.find(x=>x.id===id);if(!d)return;setSelected(id);setBefore(0);setAfter(d.observations.length-1);setFrame(d.observations.length-1);setPlaying(false);}
 function run(){if(!dataset||!worker.current)return;const id=++request.current;setAnalyzing(true);setAnalysisError('');setResult(null);
  const timer=setTimeout(()=>{if(request.current===id){request.current++;setAnalyzing(false);setAnalysisError('Analysis timed out. Retry with a smaller imported grid.');}},15000);
  worker.current.onmessage=({data})=>{if(data.id!==request.current)return;clearTimeout(timer);setAnalyzing(false);if(data.error)setAnalysisError(data.error);else{setResult(data.result);setLens('detected');}};
  worker.current.onerror=()=>{clearTimeout(timer);setAnalyzing(false);setAnalysisError('Analysis worker failed. Reload the application and retry.');};
  worker.current.postMessage({id,dataset,before,after,threshold,filter});
 }
 return {datasets,dataset,error,loading,retry:()=>setReload(v=>v+1),choose,before,setBefore,after,setAfter,frame,setFrame,threshold,setThreshold,filter,setFilter,lens,setLens,result,analyzing,analysisError,run,evidence,setEvidence,playing,setPlaying,speed,setSpeed};
}
type State=ReturnType<typeof useWorkspaceState>;
const Context=createContext<State|null>(null);
export function WorkspaceProvider({children}:{children:ReactNode}){return <Context.Provider value={useWorkspaceState()}>{children}</Context.Provider>;}
export function useWorkspace(){const ctx=useContext(Context);if(!ctx)throw new Error('Workspace provider is required');return ctx;}
