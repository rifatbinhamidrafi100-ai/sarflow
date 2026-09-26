// @vitest-environment jsdom
import {afterEach,expect,it,vi} from 'vitest';
import {act,cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import Water from '../src/pages/Water';
const deferred=()=>{let resolve!:(v:any)=>void;const promise=new Promise<any>(r=>{resolve=r;});return {promise,resolve};};
const response=(body:unknown,ok=true)=>({ok,json:async()=>body});
const result=(name:string)=>({location:name,dataType:'synthetic-software-fixture',commonValidCells:1,counts:{'1':1},legend:{'1':'Persistent candidate'},observations:[{id:'test',date:'2026-01-01'}],perDateValidCells:[1],temporalMeansDb:[-25],thresholdBaseline:{candidateCells:0},limitations:[],previews:[],outputs:['classes'],window:{width:16,height:16}});
const inputs=response({inputs:[{id:'test',location:'Software fixture',dataType:'synthetic-software-fixture',dates:4}],workerAvailable:true});
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
it('completed A cannot be polled again or control B while its POST is delayed',async()=>{
 const postB=deferred(),staleA=deferred();let posts=0,aPolls=0;
 const fetcher=vi.fn((url:string,init?:RequestInit)=>{
  if(url.endsWith('/inputs'))return Promise.resolve(inputs);
  if(init?.method==='POST')return ++posts===1?Promise.resolve(response({id:'A'})):postB.promise;
  if(url.endsWith('/A'))return ++aPolls===1?Promise.resolve(response({status:'complete',message:'A completed',result:result('Result A')})):staleA.promise;
  return Promise.resolve(response({status:'complete',message:'B completed',result:result('Result B')}));
 });vi.stubGlobal('fetch',fetcher);render(<MemoryRouter><Water/></MemoryRouter>);
 const run=await screen.findByRole('button',{name:'Run water-candidate analysis'});await waitFor(()=>expect((run as HTMLButtonElement).disabled).toBe(false));fireEvent.click(run);
 await screen.findByText(/Result A ·/,{selector:'p'});fireEvent.change(screen.getByLabelText('Co-pol threshold (dB)'),{target:{value:'-20'}});fireEvent.click(run);
 await act(async()=>{staleA.resolve(response({status:'failed',message:'OLD A ERROR',result:result('Old A')}));});
 expect(screen.queryByText(/Result A ·/)).toBeNull();expect(screen.queryByText('OLD A ERROR')).toBeNull();expect((run as HTMLButtonElement).disabled).toBe(true);expect(aPolls).toBe(1);
 expect((screen.getByRole('button',{name:'Cancel processing'}) as HTMLButtonElement).disabled).toBe(true);
 await act(async()=>postB.resolve(response({id:'B'})));await screen.findByText(/Result B ·/,{selector:'p'});
 expect(screen.getByRole('link',{name:'classes GeoTIFF'}).getAttribute('href')).toContain('/B/');expect((run as HTMLButtonElement).disabled).toBe(false);
 expect(JSON.parse(fetcher.mock.calls.find(([,i])=>i?.method==='POST'&&i.body?.toString().includes('-20'))![1]!.body as string).parameters.co_db).toBe(-20);
});
it('an in-flight A poll that ignores abort cannot overwrite a later run',async()=>{
 const stale=deferred();let posts=0;
 vi.stubGlobal('fetch',vi.fn((url:string,i?:RequestInit)=>{
  if(url.endsWith('/inputs'))return Promise.resolve(inputs);
  if(i?.method==='POST')return Promise.resolve(response({id:++posts===1?'A':'B'}));
  if(i?.method==='DELETE')return Promise.resolve(response({status:'cancelled'}));
  if(url.endsWith('/A'))return stale.promise;
  return Promise.resolve(response({status:'complete',message:'B completed',result:result('Result B')}));
 }));render(<MemoryRouter><Water/></MemoryRouter>);const run=await screen.findByRole('button',{name:'Run water-candidate analysis'});await waitFor(()=>expect((run as HTMLButtonElement).disabled).toBe(false));fireEvent.click(run);
 const cancel=screen.getByRole('button',{name:'Cancel processing'});await waitFor(()=>expect((cancel as HTMLButtonElement).disabled).toBe(false));fireEvent.click(cancel);await waitFor(()=>expect((run as HTMLButtonElement).disabled).toBe(false));fireEvent.click(run);await screen.findByText(/Result B ·/,{selector:'p'});
 await act(async()=>stale.resolve(response({status:'complete',message:'Stale A',result:result('Old A')})));expect(screen.queryByText('Stale A')).toBeNull();expect(screen.queryByText(/Old A/)).toBeNull();expect(screen.getByRole('link',{name:'classes GeoTIFF'}).getAttribute('href')).toContain('/B/');
});
it('failed submissions clear job state and unmount aborts a pending POST',async()=>{
 const pending=deferred();let posts=0,signal:AbortSignal|undefined;
 vi.stubGlobal('fetch',vi.fn((url:string,i?:RequestInit)=>{if(url.endsWith('/inputs'))return Promise.resolve(inputs);signal=i?.signal as AbortSignal;return ++posts===1?Promise.resolve(response({error:'Submission failed'},false)):pending.promise;}));
 const view=render(<MemoryRouter><Water/></MemoryRouter>);const run=await screen.findByRole('button',{name:'Run water-candidate analysis'});await waitFor(()=>expect((run as HTMLButtonElement).disabled).toBe(false));fireEvent.click(run);await screen.findByRole('alert');expect((run as HTMLButtonElement).disabled).toBe(false);expect((screen.getByRole('button',{name:'Cancel processing'}) as HTMLButtonElement).disabled).toBe(true);fireEvent.click(run);view.unmount();expect(signal?.aborted).toBe(true);await act(async()=>pending.resolve(response({id:'late'})));
});
