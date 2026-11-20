"""Probe local videos and identify duplicate SHA256 values."""
import argparse
from pathlib import Path

from common import inspect, output_file, require_file, run_cli, write_json


def main():
    parser = argparse.ArgumentParser(description="媒体清点；输入可为多个文件或目录，源文件只读")
    parser.add_argument("inputs", nargs="+", help="视频文件或目录")
    parser.add_argument("--output", required=True, help="输出 JSON 文件（拒绝覆盖）")
    args = parser.parse_args()
    paths = []
    for item in args.inputs:
        path = Path(item).expanduser().resolve()
        if path.is_dir():
            paths.extend(p.resolve() for p in sorted(path.iterdir()) if p.suffix.lower() in {".mp4", ".mov", ".mkv", ".webm"})
        else:
            paths.append(require_file(path))
    paths = list(dict.fromkeys(paths))
    if not paths:
        raise ValueError("没有可探测的视频文件")
    output = output_file(args.output, paths)
    items = [inspect(p) for p in paths]
    seen = {}
    for item in items:
        item["duplicate_of"] = seen.get(item["sha256"])
        seen.setdefault(item["sha256"], item["filename"])
    result = {"method": "PyAV stream probe + SHA256", "file_count": len(items),
              "unique_sha256_count": len(seen), "items": items}
    write_json(output, result)
    print(f"写入 {output}；文件 {len(items)}，唯一 {len(seen)}")


if __name__ == "__main__":
    run_cli(main)
