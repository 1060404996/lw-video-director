"""Shared, read-only media helpers."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path
import sys

import av


def fail(message: str) -> None:
    raise ValueError(message)


def require_file(path: str | Path) -> Path:
    p = Path(path).expanduser().resolve()
    if not p.is_file():
        fail(f"输入文件不存在: {p}")
    return p


def output_file(path: str | Path, sources: list[Path]) -> Path:
    p = Path(path).expanduser().resolve()
    if any(p == s.resolve() for s in sources):
        fail("输出路径不能覆盖输入文件")
    if p.exists():
        fail(f"输出已存在，不覆盖: {p}")
    p.parent.mkdir(parents=True, exist_ok=True)
    return p


def write_json(path: Path, value: object) -> None:
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def stream_info(stream: av.stream.Stream) -> dict:
    codec = stream.codec_context
    result = {
        "index": stream.index,
        "type": stream.type,
        "codec": codec.name,
        "duration_s": float(stream.duration * stream.time_base) if stream.duration is not None else None,
        "bit_rate": codec.bit_rate,
    }
    if stream.type == "video":
        result.update(width=codec.width, height=codec.height,
                      fps=str(stream.average_rate) if stream.average_rate else None,
                      frame_count=stream.frames or None,
                      pixel_format=codec.format.name if codec.format else None)
    elif stream.type == "audio":
        result.update(sample_rate=codec.sample_rate, channels=codec.channels,
                      layout=codec.layout.name if codec.layout else None)
    return result


def inspect(path: Path) -> dict:
    try:
        with av.open(str(path)) as container:
            streams = [stream_info(s) for s in container.streams]
            duration_s = container.duration / av.time_base if container.duration is not None else None
            if not any(s["type"] == "video" for s in streams):
                fail(f"没有视频流: {path}")
            return {"path": str(path), "filename": path.name, "bytes": path.stat().st_size,
                    "sha256": sha256(path), "duration_s": duration_s,
                    "format": container.format.name, "streams": streams}
    except (av.error.FFmpegError, OSError) as exc:
        fail(f"媒体探测失败 {path}: {exc}")


def video_frames(path: Path):
    try:
        with av.open(str(path)) as container:
            if not container.streams.video:
                fail(f"没有视频流: {path}")
            stream = container.streams.video[0]
            for frame in container.decode(stream):
                if frame.pts is None:
                    continue
                yield float(frame.pts * frame.time_base), frame
    except (av.error.FFmpegError, OSError) as exc:
        fail(f"视频解码失败 {path}: {exc}")


def ffmpeg_path() -> str:
    import shutil
    exe = shutil.which("ffmpeg")
    if exe:
        return exe
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except (ImportError, RuntimeError) as exc:
        fail(f"FFmpeg 不可用: {exc}")


def run_cli(fn) -> None:
    try:
        fn()
    except (ValueError, RuntimeError, OSError, av.error.FFmpegError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        sys.exit(2)
