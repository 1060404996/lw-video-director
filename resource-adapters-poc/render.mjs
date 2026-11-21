import {bundle} from '@remotion/bundler';
import {selectComposition,renderMedia,renderStill} from '@remotion/renderer';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const output=path.resolve(process.argv[2]||path.join(root,'evidence'));
fs.mkdirSync(output,{recursive:true});
const serveUrl=await bundle({entryPoint:path.join(root,'src/root.tsx'),rootDir:root,publicDir:path.join(root,'public'),outDir:path.join(root,'.cache/bundle'),gitSource:null});
const opts={browserExecutable:process.env.LW_BROWSER||(process.platform==='win32'?'C:/Program Files/Google/Chrome/Application/chrome.exe':undefined),chromiumOptions:{gl:'angle'}};
const composition=await selectComposition({serveUrl,id:'ResourceAdaptersPOC',...opts});
const video=path.join(output,'resource-adapters-poc.mp4');
if(fs.existsSync(video))throw new Error('Output exists; choose a new evidence directory');
await renderMedia({serveUrl,composition,outputLocation:video,codec:'h264',audioCodec:'aac',pixelFormat:'yuv420p',concurrency:2,crf:18,...opts});
// Same frame repeatedly and out of order: compare PNG bytes for stable seeks.
for(const [i,frame] of [0,30,60,110,170,60,30].entries()) await renderStill({serveUrl,composition,frame,output:path.join(output,`seek-${i}-${frame}.png`),...opts});
fs.writeFileSync(path.join(output,'render.json'),JSON.stringify({width:composition.width,height:composition.height,fps:composition.fps,frames:composition.durationInFrames,node:process.version,platform:process.platform,renderConcurrency:2,seekOrder:[0,30,60,110,170,60,30]},null,2));
console.log(video);
