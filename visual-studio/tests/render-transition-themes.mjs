import fs from 'node:fs';import path from 'node:path';
import {renderVideo,still} from '../render.mjs';import {defaultsFor} from '../src/catalog/validation.mjs';
const output=path.resolve(process.argv[2]||'test-results/final-fixes/transitions');fs.mkdirSync(output,{recursive:true});
const records=[];
for(const theme of ['swiss','future','archive']){
 const props={componentId:'TRANS-001',theme,params:defaultsFor('TRANS-001')};
 const file=path.join(output,`TRANS-001-${theme}.mp4`);
 if(fs.existsSync(file))throw new Error(`Refusing to overwrite ${file}`);
 await renderVideo(props,file);for(const frame of [30,100,119])await still(props,frame,path.join(output,`${theme}-${frame}.png`));
 records.push({theme,file,bytes:fs.statSync(file).size,params:props.params});
 console.log(`Theme transition rendered: ${theme}`);
}
fs.writeFileSync(path.join(output,'render-records.json'),JSON.stringify(records,null,2));
