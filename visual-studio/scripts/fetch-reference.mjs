// Explicit, pinned-source acquisition. Downloading never makes a component executable.
import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';import {fileURLToPath} from 'node:url';import {execFileSync} from 'node:child_process';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const id=process.argv[2];if(!/^MP-\d{3}$/.test(id||''))throw new Error('用法: node scripts/fetch-reference.mjs MP-002（仅 Motion Prompt 公开 MIT 源码）');
const catalogFile=path.join(root,'external/catalog.json'),catalog=JSON.parse(fs.readFileSync(catalogFile,'utf8')),item=catalog.find(c=>c.id===id);if(!item||item.provider!=='Motion Prompt')throw new Error('未知公开条目');
const dest=path.join(root,'external/motion-prompt/downloads',id);if(fs.existsSync(dest))throw new Error('源码目录已存在，请先人工检查，拒绝覆盖');
const base=`https://raw.githubusercontent.com/showheyohtaki/motion-prompt/${item.sourceRevision}/`;
const targets={'LICENSE':'LICENSE','kit.js':`api/v1/kit/${item.category}.js`,'element.txt':`api/v1/en/e/${id.slice(3)}.txt`};const downloaded={};
for(const [file,remote]of Object.entries(targets)){try{const r=await fetch(base+remote,{signal:AbortSignal.timeout(6000)});if(!r.ok)throw new Error(`${remote}: HTTP ${r.status}`);downloaded[file]=await r.text()}catch(error){console.log(`${file}: Node 网络读取失败，使用本机 Python urllib 代理配置重试一次`);downloaded[file]=execFileSync(process.env.LW_PYTHON||'python',['-X','utf8','-c','import sys,urllib.request;sys.stdout.write(urllib.request.urlopen(sys.argv[1],timeout=20).read().decode("utf-8"))',base+remote],{encoding:'utf8',timeout:25000,maxBuffer:8*1024*1024})}}
if(!downloaded.LICENSE.includes('MIT License')||!downloaded.LICENSE.includes('Shohei Ohtaki'))throw new Error('许可证内容与预期不符，停止获取');
fs.mkdirSync(dest,{recursive:true});for(const [file,text]of Object.entries(downloaded))fs.writeFileSync(path.join(dest,file),text);
fs.writeFileSync(path.join(dest,'provenance.json'),JSON.stringify({id,revision:item.sourceRevision,files:Object.fromEntries(Object.entries(downloaded).map(([n,t])=>[n,createHash('sha256').update(t).digest('hex')]))},null,2));
if(!item.adapter){item.sourceAvailable=true;item.installStatus='source-downloaded';item.executable=false;item.renderStatus='not-tested';fs.writeFileSync(catalogFile,JSON.stringify(catalog,null,2))}
console.log(`${id}: 已下载固定版本 MIT 源码；尚未适配/测试，不进入制作候选。刷新工作台与重启本地服务后同步目录。`);
