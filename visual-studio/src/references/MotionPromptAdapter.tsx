import {useLayoutEffect,useRef} from 'react';
import {useCurrentFrame,useVideoConfig} from 'remotion';
import {drawPopIn} from '../../external/motion-prompt/runtime.js';
export type ExternalProps={speed:number;scale:number};
export function MotionPromptAdapter({speed,scale}:ExternalProps){const ref=useRef<HTMLCanvasElement>(null),f=useCurrentFrame(),{fps}=useVideoConfig();useLayoutEffect(()=>{const c=ref.current!.getContext('2d')!;c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,1280,720);c.fillStyle='#0F1A3D';c.fillRect(0,0,1280,720);c.save();const factor=2*scale;c.translate(640-539*factor/2,360-208*factor/2);c.scale(factor,factor);drawPopIn(c,f/fps,speed);c.restore();c.fillStyle='#99abd9';c.font='18px Arial';c.fillText('Motion Prompt #001 — Pop-in · © 2026 Shohei Ohtaki · MIT',48,664)},[f,fps,speed,scale]);return <canvas ref={ref} width={1280} height={720} style={{width:'100%',height:'100%'}}/>}
