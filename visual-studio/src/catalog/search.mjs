import manifest from './manifest.json' with {type:'json'};
import external from '../../external/catalog.json' with {type:'json'};
import quality from './quality.json' with {type:'json'};
export function searchAssets(query='',library,provider,category){const own=manifest.components.map(c=>({...c,library:'originals',provider:'LW Originals',executable:quality[c.id]?.renderStatus==='passed',installStatus:'source-local',renderStatus:quality[c.id]?.renderStatus||'pending-v0.2'}));const refs=external.map(c=>({...c,library:'references'}));const q=query.toLocaleLowerCase().trim();return [...own,...refs].filter(c=>(!library||c.library===library)&&(!provider||provider==='all'||c.provider===provider)&&(!category||category==='all'||c.category===category)&&`${c.id} ${c.name} ${c.description} ${c.category} ${c.provider}`.toLowerCase().includes(q));}
export const productionCandidates=()=>searchAssets('').filter(c=>c.executable&&c.renderStatus==='passed');
