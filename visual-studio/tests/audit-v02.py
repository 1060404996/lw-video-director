from pathlib import Path
import json,hashlib,os
import av,numpy as np
from PIL import Image

root=Path(__file__).resolve().parents[1]
folder=(root/os.environ.get('LW_REVIEW_DIR','test-results/review')).resolve();reports=[]
expected={f'{name}.mp4' for name in ['TYPE-001','TRANS-001','CAM-001','INFO-001','LIGHT-001','REF-MP001','REF-MP001-adapted','TRANS-custom-images','INFO-custom-data']}
actual={p.name for p in folder.glob('*.mp4')}
if actual != expected: raise RuntimeError(f'Video inventory mismatch: missing={expected-actual}, unexpected={actual-expected}')
for p in sorted(folder.glob('*.mp4')):
    with av.open(str(p)) as c:
        s=c.streams.video[0];prev=None;last=None;gaps=[];changes=[];black=0;n=0
        for f in c.decode(s):
            t=float(f.pts*f.time_base);a=f.reformat(width=160,height=90,format='gray').to_ndarray().astype(float)
            if last is not None:gaps.append(t-last)
            if prev is not None:changes.append(float(np.abs(a-prev).mean()))
            black+=int(a.max()<8);n+=1;last=t;prev=a
        r={'file':p.name,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'frames':n,'width':s.width,'height':s.height,'fps':float(s.average_rate),'duration_s':float(s.duration*s.time_base),'black_frames':black,'max_pts_gap_s':max(gaps),'max_mean_pixel_change':max(changes),'change_outliers_gt_35':[i+1 for i,x in enumerate(changes) if x>35]}
        assert max(changes)>0, r
        assert n==(141 if p.name.startswith('REF') else 120) and s.width==1280 and s.height==720 and float(s.average_rate)==30 and max(gaps)<.034 and black==0,r
        reports.append(r)
def pixels(name):return np.asarray(Image.open(folder/name).convert('RGB')).astype(float)
dof=float(np.mean(np.abs(pixels('dof-0.png')-pixels('dof-0.01.png'))));assert dof>.1,dof
colors={}
for hexc in ['d53d61','207657']:
    rgb=np.array([int(hexc[i:i+2],16) for i in [0,2,4]]);a=pixels(f'color-{hexc}.png');count=int(np.all(a==rgb,axis=2).sum());assert count>100,count;colors['#'+hexc]=count
result={'status':'passed','review_dir':str(folder),'videos':reports,'dof_on_off_mean_abs_pixel_difference':dof,'svg_accent_exact_pixel_counts':colors,'limitation':'Temporal and pixel checks are triage, not a claim of aesthetic approval or universal GPU stability.'}
(folder/'media-audit.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps(result,ensure_ascii=False,indent=2))
