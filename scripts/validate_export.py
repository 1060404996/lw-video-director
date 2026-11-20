"""Decode an export and report measurable QA; visual judgment remains human."""
import argparse

import av
import numpy as np

from common import inspect, output_file, require_file, run_cli, video_frames, write_json


def main():
    parser = argparse.ArgumentParser(description="导出文件流、首尾帧、时长与音画差检查")
    parser.add_argument("input")
    parser.add_argument("--output", required=True)
    parser.add_argument("--expect-width", type=int)
    parser.add_argument("--expect-height", type=int)
    parser.add_argument("--expect-fps", type=float)
    parser.add_argument("--require-audio", action="store_true")
    args = parser.parse_args()
    source = require_file(args.input)
    output = output_file(args.output, [source])
    meta = inspect(source)
    video = next(s for s in meta["streams"] if s["type"] == "video")
    audio = next((s for s in meta["streams"] if s["type"] == "audio"), None)
    checks = []
    if args.expect_width:
        checks.append({"name": "width", "pass": video["width"] == args.expect_width})
    if args.expect_height:
        checks.append({"name": "height", "pass": video["height"] == args.expect_height})
    if args.expect_fps:
        from fractions import Fraction
        checks.append({"name": "fps", "pass": abs(float(Fraction(video["fps"])) - args.expect_fps) < 0.02})
    if args.require_audio:
        checks.append({"name": "audio_present", "pass": audio is not None})
    first, last = None, None
    frame_count = 0
    previous_t = None
    largest_gap = 0.0
    for timestamp, frame in video_frames(source):
        if frame_count == 0:
            first = float(np.mean(frame.to_ndarray(format="gray")))
        last = float(np.mean(frame.to_ndarray(format="gray")))
        if previous_t is not None:
            largest_gap = max(largest_gap, timestamp - previous_t)
        previous_t = timestamp
        frame_count += 1
    if frame_count == 0:
        raise ValueError("视频无可解码帧")
    video_duration = video["duration_s"] or meta["duration_s"]
    audio_duration = audio["duration_s"] if audio else None
    drift = abs(video_duration - audio_duration) if video_duration and audio_duration else None
    result = {"source": str(source), "metadata": meta, "decoded_frame_count": frame_count,
              "first_frame_mean_luma": round(first, 3), "last_frame_mean_luma": round(last, 3),
              "possible_black_first": first < 8, "possible_black_last": last < 8,
              "largest_frame_gap_s": round(largest_gap, 5),
              "audio_video_duration_difference_s": round(drift, 5) if drift is not None else None,
              "checks": checks, "all_requested_checks_pass": all(c["pass"] for c in checks),
              "limitations": "黑帧阈值仅供提示；不证明无闪烁、遮字、错切、失真或字幕内容正确。"}
    write_json(output, result)
    print(f"写入 {output}；解码 {frame_count} 帧；指定检查 {'通过' if result['all_requested_checks_pass'] else '失败'}")
    if not result["all_requested_checks_pass"]:
        raise ValueError("导出文件未通过指定检查")


if __name__ == "__main__":
    run_cli(main)
