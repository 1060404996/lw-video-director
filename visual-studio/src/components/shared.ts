import {useCurrentFrame,useVideoConfig} from 'remotion';
import type {Params} from '../catalog/types';
export const clamp=(n:number)=>Math.max(0,Math.min(1,n));
export const totalDuration=(p:Pick<Params,'entrance'|'hold'|'exit'>)=>p.entrance+p.hold+p.exit;
export function ease(t:number,curve:string){t=clamp(t);return curve==='linear'?t:curve==='easeOut'?1-(1-t)**3:t*t*(3-2*t)}
export function phaseAt(frame:number,fps:number,p:Params){const time=frame/fps;const duration=totalDuration(p);const enter=ease(time/p.entrance,p.easing);const out=ease((time-p.entrance-p.hold)/Math.max(1/fps,p.exit-1/fps),p.easing);return {time,enter,out,visibility:enter*(1-out),progress:clamp(time/duration),move:ease(clamp((time-p.entrance)/Math.max(1/fps,p.hold)),p.easing),duration};}
export function usePhase(p:Params){const f=useCurrentFrame(),{fps}=useVideoConfig();return phaseAt(f,fps,p)}
export function wrapText(text:string,maxUnits:number,maxLines=3){const lines:string[]=[];let line='',units=0;for(const char of [...text]){const weight=/[\u0000-\u00ff]/.test(char)?.56:1;if(char==='\n'||units+weight>maxUnits){lines.push(line.trim());line='';units=0;if(lines.length===maxLines)break;if(char==='\n')continue;}line+=char;units+=weight;}if(lines.length<maxLines&&line)lines.push(line.trim());const joined=lines.join('').replace(/\s/g,'');if(text.replace(/\s/g,'').length>joined.length&&lines.length)lines[lines.length-1]=lines.at(-1)!.slice(0,-1)+'…';return lines.length?lines:[''];}
