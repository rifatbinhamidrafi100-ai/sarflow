import net from 'node:net';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

export async function portOpen(port){
 return new Promise(resolve=>{const socket=net.connect({host:'127.0.0.1',port});const done=value=>{socket.destroy();resolve(value);};socket.once('connect',()=>done(true));socket.once('error',()=>done(false));socket.setTimeout(1000,()=>done(false));});
}
export async function inspect(front=5186,api=5187){
 const occupied=await Promise.all([portOpen(front),portOpen(api)]);
 if(occupied.every(v=>!v))return 'free';
 try{
  const [page,health,proxied]=await Promise.all([
   fetch(`http://127.0.0.1:${front}`,{signal:AbortSignal.timeout(2000)}),
   fetch(`http://127.0.0.1:${api}/api/health`,{signal:AbortSignal.timeout(2000)}),
   fetch(`http://127.0.0.1:${front}/api/observatory`,{signal:AbortSignal.timeout(2000)})]);
  if(page.ok&&health.ok&&proxied.ok&&(await page.text()).includes('SARFlow')&&(await health.json()).status==='ok'&&(await proxied.json()).collection==='NISAR_L2_GCOV_PROVISIONAL_V1')return 'running';
 }catch{/* Occupied ports without healthy SARFlow must never be killed or reused. */}
 return 'blocked';
}
async function main(){
 const root=fileURLToPath(new URL('../',import.meta.url));process.chdir(root);
 const open=()=>{if(process.env.SARFLOW_NO_BROWSER!=='1'){const browser=spawn('explorer.exe',['http://127.0.0.1:5186'],{windowsHide:true,stdio:'ignore'});browser.on('error',()=>console.log('Open http://127.0.0.1:5186 in your browser.'));browser.unref();}};
 const state=await inspect();
 if(state==='running'){console.log('SARFlow is already running. Opening http://127.0.0.1:5186');open();return;}
 if(state==='blocked')throw Error('Ports 5186 or 5187 are occupied, but SARFlow is not fully healthy. Close the older SARFlow terminal and retry. No existing process was stopped.');
 console.log('Starting SARFlow. Keep this window open; press Ctrl+C to stop.');
 const child=spawn(process.execPath,[path.join(root,'node_modules/concurrently/dist/bin/concurrently.js'),'-k','tsx watch server/index.ts','vite --host 127.0.0.1 --port 5186 --strictPort'],{cwd:root,stdio:'inherit',windowsHide:true,env:{...process.env,SARFLOW_PORT:'5187',SARFLOW_HOST:'127.0.0.1',PATH:path.join(root,'node_modules/.bin')+path.delimiter+process.env.PATH}});
 let ended=false;
 child.on('error',e=>{ended=true;console.error('Startup failed:',e.message);process.exitCode=1;});
 child.on('exit',code=>{ended=true;process.exitCode=code??1;});
 for(let attempt=0;attempt<60&&!ended;attempt++){
  if(await inspect()==='running'){console.log('SARFlow ready: http://127.0.0.1:5186');open();return;}
  await new Promise(r=>setTimeout(r,500));
 }
 if(!ended)console.error('Startup is taking longer than expected. Review the server errors above.');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(e=>{console.error(e.message);process.exitCode=1;});
