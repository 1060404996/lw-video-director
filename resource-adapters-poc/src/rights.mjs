// Validates a human rights declaration, not the legal truth of a web page.
export function checkRights(record,assetSha256,evidenceSha256){
  if(!record)return {status:'reference-only',reason:'No reviewed rights declaration'};
  if(!record.assetId||!record.author||!record.reviewedBy||!record.sourceUrl||!record.license)throw new Error('Missing rights provenance/reviewer');
  if(!/^(https:\/\/|repository:)/.test(record.sourceUrl))throw new Error('Unsupported source URL');
  if(record.assetSha256!==assetSha256||record.evidence?.sha256!==evidenceSha256)throw new Error('Rights evidence or asset hash mismatch');
  if(!['MIT','ISC','Apache-2.0','CC0-1.0','CC-BY-4.0'].includes(record.license))throw new Error('License requires separate review outside POC');
  for(const scope of ['download','adapt','render','redistribute'])if(record.rightsScopes?.[scope]!==true)throw new Error(`Missing right: ${scope}`);
  if(!record.attribution?.trim())throw new Error('Missing attribution');
  return {status:'declaration-validated',reason:'Human declaration and local evidence hashes match; render not yet tested'};
}
