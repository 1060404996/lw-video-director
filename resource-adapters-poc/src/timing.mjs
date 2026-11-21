export function localFrame(frame, start, duration) {
  if (![frame,start,duration].every(Number.isFinite) || duration <= 0) throw new Error('Invalid frame range');
  return Math.max(0, Math.min(duration - 1, frame - start));
}
export function lottieFrame(frame, fps, data, rate=1, loop=false) {
  if (!(fps>0 && rate>0 && data.fr>0 && data.op>data.ip)) throw new Error('Invalid Lottie timing');
  const n=data.op-data.ip, t=Math.max(0,frame)*data.fr/fps*rate;
  return data.ip+(loop?t%n:Math.min(n-1,t));
}
// Deliberately small input profile: audited, self-contained vector shape layers only.
export function validateLottie(data) {
  if (!data || !Number.isFinite(data.fr) || !Number.isFinite(data.ip) || !Number.isFinite(data.op) || !(data.fr>0 && data.op>data.ip && data.w>0 && data.h>0)) throw new Error('Invalid Lottie header');
  if ((data.assets?.length??0) || data.fonts || data.chars || !Array.isArray(data.layers) || !data.layers.length) throw new Error('External assets/fonts/precomps are outside POC profile');
  if(data.layers.some(l=>l.ty!==4 || l.ef || l.masksProperties)) throw new Error('Only simple vector shape layers supported');
  const walk=x=>{if(!x || typeof x!=='object')return;for(const [k,v] of Object.entries(x)){if(k==='x' && typeof v==='string')throw new Error('Expressions unsupported');if(['u','p'].includes(k)&&typeof v==='string')throw new Error('Resource paths unsupported');walk(v);}};
  walk(data);return data;
}
