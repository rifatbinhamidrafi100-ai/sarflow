import { createApp } from './app';
const port=Number(process.env.SARFLOW_PORT||5187);
if(!Number.isInteger(port)||port<1||port>65535)throw new Error('SARFLOW_PORT must be between 1 and 65535');
createApp({production:true}).listen(port,process.env.SARFLOW_HOST||'127.0.0.1',()=>console.log(`SARFlow API / production server: http://127.0.0.1:${port}`));
