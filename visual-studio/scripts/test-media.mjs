import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawn, execFileSync} from 'node:child_process';
import {createHash, randomUUID} from 'node:crypto';
import {reviewDir, studioRoot} from '../tests/review-dir.mjs';

if(fs.readdirSync(reviewDir).length) throw new Error(`Use a new, empty LW_REVIEW_DIR; refusing to mix evidence: ${reviewDir}`);
const hash=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const git=(...args)=>execFileSync('git',args,{cwd:studioRoot,encoding:'utf8'}).trim();
const files=git('ls-files','--cached','--others','--exclude-standard').split('\n').filter(Boolean);
const run={id:randomUUID(),startedAt:new Date().toISOString(),status:'running',head:git('rev-parse','HEAD'),dirty:git('status','--short'),environment:{node:process.version,platform:process.platform,arch:process.arch,os:os.release(),browser:process.env.LW_BROWSER||'platform default',python:process.env.LW_PYTHON||'python'},sourceSha256:Object.fromEntries(files.map(file=>[file,hash(path.join(studioRoot,file))])),steps:[]};
const save=()=>fs.writeFileSync(path.join(reviewDir,'run.json'),JSON.stringify(run,null,2));
save();
try {
  for(const [name,command,args] of [
    ['verify',process.execPath,['tests/verify-v02.mjs']],
    ['refine',process.execPath,['tests/refine-v02.mjs']],
    ['custom-inputs',process.execPath,['tests/custom-inputs.mjs']],
    ['media-audit',process.env.LW_PYTHON||'python',['-B','tests/audit-v02.py']],
  ]) {
    const step={name,command:[command,...args],startedAt:new Date().toISOString()};run.steps.push(step);save();
    const log=fs.createWriteStream(path.join(reviewDir,`${name}.log`));
    try {
      const code=await new Promise((resolve,reject)=>{
        const child=spawn(command,args,{cwd:studioRoot,env:{...process.env,LW_REVIEW_DIR:reviewDir},stdio:['ignore','pipe','pipe']});
        for(const stream of [child.stdout,child.stderr]) stream.on('data',chunk=>{process.stdout.write(chunk);log.write(chunk);});
        child.once('error',reject);child.once('close',resolve);
      });
      step.exitCode=code;if(code!==0)throw new Error(`${name} failed: ${code}`);
    } finally {await new Promise(resolve=>log.end(resolve));step.finishedAt=new Date().toISOString();save();}
  }
  run.status='passed';
} catch(error) {run.status='failed';run.error=error.stack;process.exitCode=1;console.error(error);}
finally {
  run.finishedAt=new Date().toISOString();
  run.artifactSha256=Object.fromEntries(fs.readdirSync(reviewDir).filter(file=>file!=='run.json'&&fs.statSync(path.join(reviewDir,file)).isFile()).map(file=>[file,hash(path.join(reviewDir,file))]));
  save();console.log(`Media review ${run.status}: ${path.join(reviewDir,'run.json')}`);
}
