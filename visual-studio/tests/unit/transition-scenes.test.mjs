import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {transitionImagePath} from '../../src/components/transitions/scene-source.mjs';
test('each theme resolves two distinct shipped default scenes',()=>{
 const contents=new Set();
 for(const theme of ['swiss','future','archive'])for(const side of ['before','after']){
  const file=transitionImagePath(`sample:${side}`,theme);
  const svg=fs.readFileSync(new URL(`../../public/${file}`,import.meta.url),'utf8');
  assert.match(svg,/viewBox="0 0 1280 720"/);contents.add(svg);
 }
 assert.equal(contents.size,6);
});
test('custom image inputs bypass theme defaults without alteration',()=>{
 const data='data:image/png;base64,iVBORw0KGgo=';
 for(const theme of ['swiss','future','archive'])assert.equal(transitionImagePath(data,theme),data);
});
