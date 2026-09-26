import { AlertCircle, ArrowUpRight, Database, LoaderCircle } from 'lucide-react';
import type { ReactNode } from 'react';
import { useWorkspace } from '../data/Workspace';
export const date=(iso:string)=>new Date(iso).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric',timeZone:'UTC'});
export function Badge({observed=false}:{observed?:boolean}){return <span className={`badge ${observed?'observed':''}`}><Database size={12}/>{observed?'OBSERVED DATA':'DEMO DATA · SYNTHETIC'}</span>;}
export function Empty({title,children,retry}:{title:string;children?:ReactNode;retry?:()=>void}){return <div className="empty" role="status"><AlertCircle size={26}/><h2>{title}</h2><p>{children}</p>{retry&&<button onClick={retry}>Retry</button>}</div>;}
export function DataGate({children}:{children:ReactNode}){const w=useWorkspace();if(w.loading)return <div className="empty" role="status"><LoaderCircle className="spin"/>Loading validated observations…</div>;if(w.error)return <Empty title="Observations could not be loaded" retry={w.retry}>{w.error}</Empty>;if(!w.dataset)return <Empty title="No observations available">Connect a validated dataset to begin.</Empty>;return children;}
export function External({href,children}:{href:string;children:ReactNode}){return <a href={href} target="_blank" rel="noreferrer">{children}<ArrowUpRight size={14}/></a>;}
export function Download({label,value,name}:{label:string;value:unknown;name:string}){return <button onClick={()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}}>{label}</button>;}
