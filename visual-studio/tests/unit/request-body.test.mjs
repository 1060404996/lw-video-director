import test from 'node:test';
import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import http from 'node:http';
import {readJsonBody, MAX_REQUEST_BYTES} from '../../scripts/request-body.mjs';
import {defaultsFor, validateProps} from '../../src/catalog/validation.mjs';

const payload = (patch = {}) => ({componentId:'TYPE-001', theme:'future', params:{...defaultsFor('TYPE-001'), ...patch}});

test('Chinese title, subtitle and 2/3/4-byte characters survive every byte boundary', async () => {
  const input = payload({title:'中文标题 é Ω 🙂 𠮷', subtitle:'字幕：请求分块也应完整保留。🚀'});
  const bytes = Buffer.from(JSON.stringify(input));
  const decoded = await readJsonBody(Readable.from([...bytes].map(byte => Buffer.from([byte]))));
  assert.deepEqual(validateProps(decoded), input);
});

test('maximum-length Chinese strings survive splits; overlong strings fail schema', async () => {
  const input = payload({title:'中'.repeat(160), subtitle:'字'.repeat(180)});
  const bytes = Buffer.from(JSON.stringify(input));
  const split = bytes.indexOf(Buffer.from('中')) + 1;
  assert.deepEqual(validateProps(await readJsonBody(Readable.from([bytes.subarray(0,split), bytes.subarray(split)]))), input);
  for (const patch of [{title:'中'.repeat(161)}, {subtitle:'字'.repeat(181)}]) {
    assert.throws(() => validateProps(payload(patch)), /过长/);
  }
});

test('byte limit accepts exactly 9MB and rejects a multi-chunk overflow', async () => {
  const exact = Buffer.from('"' + 'a'.repeat(MAX_REQUEST_BYTES - 2) + '"');
  assert.equal((await readJsonBody(Readable.from([exact]))).length, MAX_REQUEST_BYTES - 2);
  await assert.rejects(readJsonBody(Readable.from([exact, Buffer.from(' ')])), /请求超过 9MB/);
});

test('invalid JSON, empty bodies and invalid UTF-8 are rejected', async () => {
  for (const bytes of [Buffer.from('{'), Buffer.alloc(0), Buffer.from([34,0xc3,0x28,34])]) {
    await assert.rejects(readJsonBody(Readable.from([bytes])));
  }
});

test('HTTP chunked requests preserve text and report invalid payloads', async () => {
  // Exercise the production parser and schema without triggering expensive rendering.
  const server = http.createServer(async (req,res) => {
    try { const data=validateProps(await readJsonBody(req)); res.writeHead(200,{'Content-Type':'application/json'}); res.end(JSON.stringify(data)); }
    catch(error) {res.writeHead(400,{'Content-Type':'application/json'});res.end(JSON.stringify({error:error.message}));}
  });
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  try {
    const send = chunks => new Promise((resolve,reject) => {
      const req=http.request({hostname:'127.0.0.1',port:server.address().port,method:'POST'},res => {
        let text='';res.setEncoding('utf8');res.on('data',chunk=>text+=chunk);res.on('end',()=>resolve({status:res.statusCode,body:JSON.parse(text)}));
      });
      req.on('error',reject);
      void (async()=>{for(const chunk of chunks){req.write(chunk);await new Promise(resolve=>setTimeout(resolve,10));}req.end();})();
    });
    const input=payload({title:'中'.repeat(160),subtitle:'中文跨块字幕🙂'}), bytes=Buffer.from(JSON.stringify(input));
    const first=bytes.indexOf(Buffer.from('中'))+1, last=bytes.indexOf(Buffer.from('🙂'))+2;
    assert.deepEqual(await send([bytes.subarray(0,first),bytes.subarray(first,last),bytes.subarray(last)]),{status:200,body:input});
    for(const body of [Buffer.from(JSON.stringify(payload({title:'中'.repeat(161)}))),Buffer.from('{'),Buffer.from([34,0xff,34])]) {
      assert.equal((await send([body])).status,400);
    }
  } finally {await new Promise(resolve=>server.close(resolve));}
});
