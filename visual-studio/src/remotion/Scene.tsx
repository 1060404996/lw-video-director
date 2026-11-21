import {AbsoluteFill} from 'remotion';import {catalog} from '../catalog/registry';import type {SceneProps} from '../catalog/types';import {themes} from '../styles/themes';
export type CompositionProps=SceneProps&{componentId:string};
export function Scene({componentId,...props}:CompositionProps){const entry=catalog.find(c=>c.id===componentId);if(!entry)throw new Error('Unknown component');const Component=entry.component;return <AbsoluteFill style={{background:themes[props.theme].bg,overflow:'visible'}}><Component {...props}/></AbsoluteFill>}
