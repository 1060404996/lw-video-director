"""Original 2D component proof: staggered cards, data bars, screen transition."""
import argparse
from pathlib import Path
import subprocess
import tempfile
import wave

from PIL import Image, ImageDraw, ImageFont
import numpy as np

from common import ffmpeg_path, output_file, run_cli


def ease(x):
    x = max(0.0, min(1.0, x))
    return 1 - (1 - x) ** 3


def font(size):
    for path in (Path("C:/Windows/Fonts/msyh.ttc"), Path("C:/Windows/Fonts/arial.ttf")):
        if path.exists():
            return ImageFont.truetype(str(path), size)
    return ImageFont.load_default()


def render_frame(frame, fps, width, height):
    t = frame / fps
    im = Image.new("RGB", (width, height), (244, 247, 250))
    d = ImageDraw.Draw(im)
    unit = width / 640

    def box(rect, fill, radius=0, outline=None, stroke=1):
        rect = tuple(round(v * unit) for v in rect)
        if radius:
            d.rounded_rectangle(rect, round(radius * unit), fill=fill, outline=outline, width=max(1, round(stroke * unit)))
        else:
            d.rectangle(rect, fill=fill, outline=outline, width=max(1, round(stroke * unit)))

    def label(x, y, value, size, fill):
        d.text((round(x * unit), round(y * unit)), value, font=font(round(size * unit)), fill=fill)

    if t < 1.5:
        label(36, 24, "CARD ARRAY / ORIGINAL", 21, "#132F40")
        for i in range(5):
            p = ease((t - i * 0.09) / 0.55)
            y = 270 - 140 * p + i * 6
            x = 30 + i * 119
            box((x, y, x + 104, y + 127), (23 + i * 8, 60 + i * 5, 83 + i * 7), 12)
            label(x + 13, y + 14, f"0{i+1}", 26, "#FFFFFF")
            box((x + 13, y + 75, x + 80, y + 80), "#63C6C0", 2)
            box((x + 13, y + 91, x + 62, y + 95), "#B9D8DC", 2)
        label(36, 310, "Stagger  /  0.09 s", 19, "#4E6876")
    elif t < 3.0:
        p = ease((t - 1.5) / 0.85)
        label(36, 24, "BAR CHART / FICTIONAL DATA", 21, "#132F40")
        values = (30, 55, 80)
        for i, value in enumerate(values):
            y = 88 + i * 83
            label(37, y + 11, f"A{i+1}", 23, "#132F40")
            box((100, y, 560, y + 48), "#D7E3E8", 8)
            box((100, y, 100 + 460 * value / 100 * p, y + 48), "#198D9B", 8)
            label(567, y + 10, f"{round(value*p)}", 19, "#132F40")
        label(36, 322, "Shared progress drives width and number", 17, "#4E6876")
    else:
        p = ease((t - 3.0) / 1.2)
        label(36, 24, "SCREEN TRANSITION / 2D", 21, "#132F40")
        screen_w = 420 + 300 * p
        screen_h = 235 + 180 * p
        cx, cy = 320, 205
        box((cx - screen_w/2, cy - screen_h/2, cx + screen_w/2, cy + screen_h/2), "#162B3D", 18)
        inner_w, inner_h = screen_w - 20, screen_h - 20
        box((cx - inner_w/2, cy - inner_h/2, cx + inner_w/2, cy + inner_h/2), "#E2F0F2", 12)
        box((cx - inner_w/2 + 20, cy - inner_h/2 + 25, cx + inner_w/2 - 20, cy - inner_h/2 + 55), "#1D8794", 5)
        label(60, 118, "INTERFACE", 27, "#132F40")
        label(36, 322, "Continuous frame-driven zoom", 17, "#4E6876")
    return im


def main():
    parser = argparse.ArgumentParser(description="渲染三项原创 2D 技术测试，输出 H.264/AAC MP4")
    parser.add_argument("--output", required=True)
    parser.add_argument("--width", type=int, default=640)
    parser.add_argument("--height", type=int, default=360)
    parser.add_argument("--fps", type=int, default=30)
    args = parser.parse_args()
    if args.width < 320 or args.height < 180 or args.fps <= 0:
        raise ValueError("画幅过小或帧率无效")
    output = output_file(args.output, [])
    ffmpeg = ffmpeg_path()
    frames = round(4.5 * args.fps)
    with tempfile.TemporaryDirectory() as temp:
        temp = Path(temp)
        video = temp / "video.mp4"
        audio = temp / "tone.wav"
        command = [ffmpeg, "-nostdin", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgb24",
                   "-s", f"{args.width}x{args.height}", "-r", str(args.fps), "-i", "-",
                   "-an", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-y", str(video)]
        process = subprocess.Popen(command, stdin=subprocess.PIPE, stderr=subprocess.PIPE)
        try:
            for n in range(frames):
                process.stdin.write(render_frame(n, args.fps, args.width, args.height).tobytes())
            process.stdin.close()
            error = process.stderr.read()
            code = process.wait()
        except Exception:
            process.kill()
            raise
        if code:
            raise RuntimeError(f"视频编码失败: {error.decode('utf-8', 'replace')[-1000:]}")
        rate = 48000
        duration = frames / args.fps
        with wave.open(str(audio), "wb") as wav:
            wav.setnchannels(1)
            wav.setsampwidth(2)
            wav.setframerate(rate)
            samples = (np.sin(2 * np.pi * 330 * np.arange(round(rate * duration)) / rate) * 0.03 * 32767).astype("<i2")
            wav.writeframes(samples.tobytes())
        mux = subprocess.run([ffmpeg, "-nostdin", "-v", "error", "-i", str(video), "-i", str(audio),
                              "-c:v", "copy", "-c:a", "aac", "-b:a", "128k", "-shortest", str(output)],
                             capture_output=True, text=True, errors="replace")
        if mux.returncode:
            raise RuntimeError(f"音画合成失败: {mux.stderr[-1000:]}")
    print(f"写入 {output}；{frames} 帧，{args.width}x{args.height}@{args.fps}fps，原创合成音")


if __name__ == "__main__":
    run_cli(main)
