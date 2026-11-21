import {fork,spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const server=fork(new URL('../server.mjs',import.meta.url),[],{cwd:root,env:{...process.env,LW_PORT:'0'},stdio:['ignore','pipe','pipe','ipc']});
server.stdout.pipe(process.stdout);server.stderr.pipe(process.stderr);
const exited=new Promise(resolve=>server.once('exit',(code,signal)=>resolve({code,signal})));
let failed=false;
try{
 const url=await new Promise((resolve,reject)=>{
  const timeout=setTimeout(()=>reject(new Error('Server startup timed out after 30s')),30000);
  server.once('error',e=>{clearTimeout(timeout);reject(e)});
  server.once('exit',code=>{clearTimeout(timeout);reject(new Error(`Server exited before ready: ${code}`))});
  server.on('message',m=>{if(m?.type==='ready'){clearTimeout(timeout);resolve(m.url)}});
 });
 console.log(`[api-runner] owned test server ready: ${url}`);
 const cases=spawn(process.execPath,['--test','tests/api/*.test.mjs'],{cwd:root,env:{...process.env,LW_TEST_BASE_URL:url},stdio:'inherit'});
 const caseTimer=setTimeout(()=>{console.error('[api-runner] tests timed out after 60s');failed=true;cases.kill()},60000);
 const code=await new Promise((resolve,reject)=>{cases.once('error',reject);cases.once('exit',resolve)}).finally(()=>clearTimeout(caseTimer));
 if(code!==0)failed=true;
}catch(e){console.error(e);failed=true}
finally{
 if(server.connected)server.send({type:'shutdown'});
 const timer=setTimeout(()=>{console.error('[api-runner] graceful shutdown timed out; terminating owned process');server.kill();failed=true},10000);
 const result=await exited;clearTimeout(timer);
 console.log('[api-runner] owned server closed:',JSON.stringify(result));
 if(result.code!==0)failed=true;
}
process.exitCode=failed?1:0;
