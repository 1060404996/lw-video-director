"""Sample preview frames at requested timestamps without modifying source."""
import argparse
import csv
from pathlib import Path

from common import require_file, run_cli, video_frames


def main():
    parser = argparse.ArgumentParser(description="按时间抽取 JPG 预览及 CSV 时间索引")
    parser.add_argument("input")
    parser.add_argument("--out-dir", required=True)
    parser.add_argument("--times", nargs="*", type=float, help="秒；省略时按 --interval")
    parser.add_argument("--interval", type=float, default=2.0)
    parser.add_argument("--until", type=float, help="只取前 N 秒")
    parser.add_argument("--max-width", type=int, default=640)
    args = parser.parse_args()
    source = require_file(args.input)
    out = Path(args.out_dir).expanduser().resolve()
    if out.exists() and any(out.iterdir()):
        raise ValueError(f"输出目录非空，不覆盖: {out}")
    if args.interval <= 0 or args.max_width <= 0:
        raise ValueError("interval 和 max-width 必须大于 0")
    if args.times is not None and any(t < 0 for t in args.times):
        raise ValueError("抽帧时间不能小于 0")
    out.mkdir(parents=True, exist_ok=True)
    targets = sorted(set(args.times)) if args.times else None
    next_auto = 0.0
    idx = 0
    rows = []
    for timestamp, frame in video_frames(source):
        if args.until is not None and timestamp > args.until + 0.1:
            break
        if targets is None:
            if timestamp + 0.001 < next_auto:
                continue
            requested = next_auto
            next_auto += args.interval
        else:
            if idx >= len(targets):
                break
            if timestamp + 0.001 < targets[idx]:
                continue
            requested = targets[idx]
            idx += 1
        image = frame.to_image()
        if image.width > args.max_width:
            from PIL import Image
            image.thumbnail((args.max_width, 100000), Image.Resampling.LANCZOS)
        filename = f"frame-{len(rows):04d}-{timestamp:.3f}s.jpg"
        image.save(out / filename, quality=90)
        rows.append((requested, timestamp, filename))
        if targets is not None and idx >= len(targets):
            break
    if not rows:
        raise ValueError("未解码出可用视频帧")
    with (out / "frames.csv").open("w", encoding="utf-8-sig", newline="") as stream:
        writer = csv.writer(stream)
        writer.writerow(("requested_s", "actual_s", "filename"))
        writer.writerows(rows)
    print(f"写入 {len(rows)} 帧至 {out}；时间为解码帧 PTS")


if __name__ == "__main__":
    run_cli(main)
