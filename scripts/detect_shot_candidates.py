"""Sparse visual-change triage, never a final cut list."""
import argparse
import csv
from collections import deque

import cv2
import numpy as np

from common import output_file, require_file, run_cli, video_frames, write_json


def features(frame):
    image = frame.to_ndarray(format="rgb24")
    small = cv2.resize(image, (160, 90), interpolation=cv2.INTER_AREA)
    gray = cv2.cvtColor(small, cv2.COLOR_RGB2GRAY)
    hsv = cv2.cvtColor(small, cv2.COLOR_RGB2HSV)
    hist = cv2.calcHist([hsv], [0, 1], None, [24, 16], [0, 180, 0, 256])
    cv2.normalize(hist, hist)
    return gray, hist, float(gray.mean())


def main():
    parser = argparse.ArgumentParser(description="稀疏采样，分列硬切/渐变/屏幕运动候选；必须人工复核")
    parser.add_argument("input")
    parser.add_argument("--output", required=True, help="JSON 报告；旁边另写 CSV")
    parser.add_argument("--interval", type=float, default=0.25)
    parser.add_argument("--until", type=float)
    parser.add_argument("--cut-threshold", type=float, default=0.45, help="HSV 直方图 Bhattacharyya 距离")
    parser.add_argument("--motion-threshold", type=float, default=1.8, help="稀疏样本间平均光流像素，160x90 尺度")
    args = parser.parse_args()
    if args.interval <= 0 or not 0 <= args.cut_threshold <= 1 or args.motion_threshold <= 0:
        raise ValueError("间隔或阈值无效")
    source = require_file(args.input)
    output = output_file(args.output, [source])
    csv_path = output.with_suffix(".csv")
    if csv_path.exists():
        raise ValueError(f"输出已存在，不覆盖: {csv_path}")
    samples = []
    candidates = []
    last = None
    next_time = 0.0
    brightness = deque(maxlen=4)
    for t, frame in video_frames(source):
        if args.until is not None and t > args.until + args.interval:
            break
        if t + 0.001 < next_time:
            continue
        gray, hist, mean = features(frame)
        row = {"time_s": round(t, 4), "brightness": round(mean, 3),
               "hist_distance": None, "pixel_difference": None, "motion_px": None}
        if last is not None:
            old_gray, old_hist, old_t = last
            distance = float(cv2.compareHist(old_hist, hist, cv2.HISTCMP_BHATTACHARYYA))
            diff = float(np.mean(cv2.absdiff(old_gray, gray)))
            flow = cv2.calcOpticalFlowFarneback(old_gray, gray, None, 0.5, 3, 15, 2, 5, 1.2, 0)
            motion = float(np.linalg.norm(flow, axis=2).mean())
            row.update(hist_distance=round(distance, 4), pixel_difference=round(diff, 3), motion_px=round(motion, 3))
            if distance >= args.cut_threshold and diff >= 20:
                candidates.append({"type": "hard_cut_candidate", "time_s": round(t, 4),
                                   "score": round(distance, 4), "window_s": [round(old_t, 4), round(t, 4)]})
            elif motion >= args.motion_threshold:
                candidates.append({"type": "screen_motion_candidate", "time_s": round(t, 4),
                                   "score": round(motion, 3), "window_s": [round(old_t, 4), round(t, 4)]})
        brightness.append((t, mean))
        if len(brightness) == 4:
            values = [x[1] for x in brightness]
            deltas = np.diff(values)
            if (all(d > 7 for d in deltas) or all(d < -7 for d in deltas)) and abs(values[-1] - values[0]) > 45:
                candidates.append({"type": "gradual_change_candidate", "time_s": round(t, 4),
                                   "score": round(abs(values[-1] - values[0]), 3),
                                   "window_s": [round(brightness[0][0], 4), round(t, 4)]})
        samples.append(row)
        last = gray, hist, t
        next_time += args.interval
    if not samples:
        raise ValueError("未解码出可用视频帧")
    result = {"source": str(source), "method": "160x90 sparse HSV histogram + grayscale difference + Farneback flow; monotone brightness for gradual change",
              "interval_s": args.interval, "cut_threshold": args.cut_threshold,
              "motion_threshold_px": args.motion_threshold,
              "limitations": "稀疏采样误差约一个采样间隔；闪白、UI变化、快速运动、叠化可能误判；所有候选需人工确认，非精确切点。",
              "candidate_count": len(candidates), "candidates": candidates}
    write_json(output, result)
    with csv_path.open("w", encoding="utf-8-sig", newline="") as stream:
        writer = csv.DictWriter(stream, fieldnames=list(samples[0]))
        writer.writeheader()
        writer.writerows(samples)
    print(f"写入 {output} 与 {csv_path}；样本 {len(samples)}，候选 {len(candidates)}")


if __name__ == "__main__":
    run_cli(main)
