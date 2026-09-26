import { datasetSchema, type Dataset, type CatalogRecord, type Bounds } from '../../shared/schema';
export interface IDataProvider {datasets(signal?:AbortSignal):Promise<Dataset[]>;catalog(bounds:Bounds,signal?:AbortSignal):Promise<{records:CatalogRecord[];retrieved:string;cached:boolean}>;}
async function read(url:string,signal?:AbortSignal){const response=await fetch(url,{signal});if(!response.ok){const error=await response.json().catch(()=>({error:'Service unavailable'}));throw new Error(error.error||`Request failed (${response.status})`);}return response.json();}
export class NISARDataProvider implements IDataProvider {
 async datasets(signal?:AbortSignal){return datasetSchema.array().parse(await read('/api/datasets',signal));}
 async catalog(bounds:Bounds,signal?:AbortSignal){return read(`/api/catalog?bbox=${bounds.join(',')}`,signal);}
}
export class DemoProvider implements IDataProvider {
 async datasets(){return (await import('../../shared/demo')).demoDatasets;}
 async catalog(){return {records:[] as CatalogRecord[],retrieved:'',cached:false};}
}
export const provider=new NISARDataProvider();
