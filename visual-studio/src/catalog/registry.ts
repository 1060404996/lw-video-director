import manifest from './manifest.json' with {type:'json'};
import quality from './quality.json' with {type:'json'};
import type {Entry,Params,ParamKey,ThemeId} from './types';
import {TitleEntrance} from '../components/typography/TitleEntrance';
import {MaskTransition} from '../components/transitions/MaskTransition';
import {OrbitCamera} from '../components/camera/OrbitCamera';
import {DataChart} from '../components/infographics/DataChart';
import {ScanLight} from '../components/lighting/ScanLight';
import {FiberFormation} from '../components/papermaking/FiberFormation';
import {Materials} from '../components/papermaking/Materials';
import {SoakVat} from '../components/papermaking/SoakVat';
const implementations:Record<string,Entry['component']>={ 'TYPE-001':TitleEntrance,'TRANS-001':MaskTransition,'CAM-001':OrbitCamera,'INFO-001':DataChart,'LIGHT-001':ScanLight,'PAPER-001':FiberFormation,'MATERIAL-001':Materials,'SOAK-001':SoakVat };
export const catalog:Entry[]=manifest.components.map(c=>{
  const defaults=Object.fromEntries(Object.entries(manifest.parameters).map(([k,v])=>[k,v.default]));
  const p={...defaults,...c.defaults} as unknown as Params;
  return {...c,component:implementations[c.id],defaultProps:p,editableParams:c.editableParams as ParamKey[],duration:p.entrance+p.hold+p.exit,fps:manifest.fps,supportedStyles:manifest.styles as ThemeId[],renderStatus:(quality as Record<string,{renderStatus:string}>)[c.id]?.renderStatus||'pending',visualReviewStatus:'pending'};
});
