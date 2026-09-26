import { analyze } from '../../shared/analysis';
self.onmessage=({data})=>{try {self.postMessage({id:data.id,result:analyze(data.dataset,data.before,data.after,data.threshold,data.filter)});}catch(error){self.postMessage({id:data.id,error:error instanceof Error?error.message:'Analysis failed'});}};
