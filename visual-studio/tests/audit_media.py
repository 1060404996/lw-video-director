"""Decode the actual MP4s. Report temporal gaps and frame-change outliers for review."""
from pathlib import Path
import json
import av
import numpy as np
from PIL import Image, ImageDraw

root=Path(__file__).resolve().parents[1]
reports=[]
for path in sorted((root/'test-results').glob('*.mp4')):
    count=0; prev=None; last_t=None; gaps=[]; changes=[]; black=0; thumbs=[]
    with av.open(str(path)) as c:
        s=c.streams.video[0]
        for f in c.decode(s):
            t=float(f.pts*f.time_base)
            arr=f.reformat(width=160,height=90,format='gray').to_ndarray().astype(float)
            if last_t is not None:gaps.append(t-last_t)
            if prev is not None:changes.append(float(np.mean(np.abs(arr-prev))))
            if arr.max()<8:black+=1
            if count in [0,30,60,119]:thumbs.append(f.to_image().resize((480,270)))
            prev=arr;last_t=t;count+=1
        report={'id':path.stem,'codec':s.codec_context.name,'width':s.width,'height':s.height,'fps':str(s.average_rate),'frames':count,'duration_s':float(s.duration*s.time_base),'audio_streams':len(c.streams.audio),'max_frame_gap_s':max(gaps),'black_frames':black,'max_mean_pixel_change':max(changes),'change_outlier_frames':[i+1 for i,x in enumerate(changes) if x>35]}
        assert count==120 and s.width==1280 and s.height==720 and float(s.average_rate)==30 and max(gaps)<.034 and black==0,report
        reports.append(report)
    board=Image.new('RGB',(960,580),'#19201c');draw=ImageDraw.Draw(board)
    for i,img in enumerate(thumbs):board.paste(img,(i%2*480,i//2*290));draw.text((i%2*480+10,i//2*290+272),f'{path.stem} frame {[0,30,60,119][i]}',fill='white')
    board.save(root/'evidence'/f'{path.stem}-review.jpg',quality=92)
(root/'evidence'/'media-audit.json').write_text(json.dumps(reports,indent=2),encoding='utf8')
print(json.dumps(reports,indent=2))
