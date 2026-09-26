import {expect,it} from 'vitest';
import {createServer} from 'node:http';
// @ts-expect-error Small standalone Node launcher has no TypeScript declarations.
import {inspect} from '../scripts/launch-sarflow.mjs';
it('does not mistake an unrelated occupied port for a running SARFlow instance',async()=>{
 const server=createServer((_req,res)=>res.end('unrelated application')).listen(0,'127.0.0.1');
 await new Promise<void>(r=>server.once('listening',r));
 const port=(server.address() as {port:number}).port;
 try{expect(await inspect(port,port)).toBe('blocked');}finally{await new Promise<void>(r=>server.close(()=>r()));}
 expect(await inspect(port,port)).toBe('free');
});
