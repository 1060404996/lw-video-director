import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
import {validateLottie} from './src/timing.mjs';import {checkRights} from './src/rights.mjs';
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
try{
  if(!process.argv[2])throw new Error('Usage: node inspect-lottie.mjs file.json [rights.json]');
  const file=path.resolve(process.argv[2]);if(fs.statSync(file).size>5*1024*1024)throw new Error('JSON exceeds 5 MiB profile limit');
  const bytes=fs.readFileSync(file),data=JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/,''));validateLottie(data);
  let record=null,evidenceHash=null;
  if(process.argv[3]){
    const rightsFile=path.resolve(process.argv[3]);record=JSON.parse(fs.readFileSync(rightsFile,'utf8'));
    if(!record.evidence?.path||path.isAbsolute(record.evidence.path))throw new Error('Evidence must be relative to rights file');
    const evidence=path.resolve(path.dirname(rightsFile),record.evidence.path),relative=path.relative(path.dirname(rightsFile),evidence);
    if(relative==='..'||relative.startsWith(`..${path.sep}`))throw new Error('Evidence must stay within rights directory');
    evidenceHash=hash(fs.readFileSync(evidence));
  }
  const rights=checkRights(record,hash(bytes),evidenceHash);
  console.log(JSON.stringify({profile:'lw-vector-precomp/2',assetSha256:hash(bytes),compatibility:'eligible-for-render-test',rights,renderStatus:'not-run',productionApproved:false,sourceFps:data.fr,inPoint:data.ip,outPoint:data.op,embeddedPrecomps:data.assets?.length??0},null,2));
}catch(error){console.error(JSON.stringify({status:'blocked',reason:error.message,productionApproved:false}));process.exitCode=2;}
