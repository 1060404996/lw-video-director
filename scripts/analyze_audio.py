"""Measure a mixed audio track; do not infer voice activity."""
import argparse
import math
import re
import subprocess

import av
import numpy as np

from common import ffmpeg_path, output_file, require_file, run_cli, write_json


def db(value):
    return round(20 * math.log10(value), 3) if value > 0 else None


def main():
    parser = argparse.ArgumentParser(description="混合音轨 RMS、低能量窗、采样峰值及可用时 EBU R128")
    parser.add_argument("input")
    parser.add_argument("--output", required=True)
    parser.add_argument("--window-ms", type=int, default=100)
    parser.add_argument("--low-dbfs", type=float, default=-40)
    args = parser.parse_args()
    source = require_file(args.input)
    output = output_file(args.output, [source])
    if args.window_ms <= 0 or 16000 * args.window_ms % 1000:
        raise ValueError("window-ms 必须为正数且在 16kHz 下产生整数采样")
    with av.open(str(source)) as container:
        if not container.streams.audio:
            write_json(output, {"source": str(source), "audio_present": False,
                                "limitation": "无音轨，不能提取口播或字幕"})
            print(f"写入 {output}；无音轨")
            return
    ffmpeg = ffmpeg_path()
    command = [ffmpeg, "-nostdin", "-v", "error", "-i", str(source), "-map", "0:a:0",
               "-ac", "1", "-ar", "16000", "-f", "f32le", "-"]
    process = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    raw, error = process.communicate()
    if process.returncode != 0:
        raise RuntimeError(f"FFmpeg 音频解码失败: {error.decode('utf-8', 'replace')[-1000:]}")
    samples = np.frombuffer(raw, dtype="<f4")
    width = 16 * args.window_ms
    count = len(samples) // width
    if count == 0:
        raise ValueError("音频不足一个完整分析窗")
    windows = samples[:count * width].reshape(count, width).astype(np.float64)
    mean_squares = np.mean(windows * windows, axis=1)
    rms = math.sqrt(float(np.mean(mean_squares)))
    low_fraction = float(np.mean(mean_squares < 10 ** (args.low_dbfs / 10)))
    peak = float(np.max(np.abs(samples)))
    result = {"source": str(source), "audio_present": True,
              "method": "FFmpeg first audio stream, mono downmix, 16kHz float32, non-overlapping full windows",
              "sample_rate": 16000, "window_ms": args.window_ms, "window_count": count,
              "discarded_tail_samples": int(len(samples) - count * width),
              "rms_dbfs": db(rms), "sample_peak_dbfs": db(peak),
              "low_energy_threshold_dbfs": args.low_dbfs,
              "low_energy_window_fraction": round(low_fraction, 6),
              "limitation": "混合音轨指标；低能量不是人声停顿率；采样峰值不是真峰值。"}
    loud = subprocess.run([ffmpeg, "-nostdin", "-hide_banner", "-i", str(source),
                           "-map", "0:a:0", "-af", "ebur128=peak=true",
                           "-f", "null", "-"], capture_output=True, text=True, errors="replace")
    if loud.returncode == 0:
        summary = loud.stderr.rsplit("Summary:", 1)[-1]
        lufs = re.search(r"Integrated loudness:\s*I:\s*([-+\d.]+) LUFS", summary)
        true_peak = re.search(r"True peak:\s*Peak:\s*([-+\d.]+) dBFS", summary)
        result["integrated_lufs"] = float(lufs.group(1)) if lufs else None
        result["true_peak_dbtp"] = float(true_peak.group(1)) if true_peak else None
    else:
        result["loudness_error"] = loud.stderr[-500:]
    write_json(output, result)
    print(f"写入 {output}；RMS {result['rms_dbfs']} dBFS；低能量窗 {low_fraction:.2%}")


if __name__ == "__main__":
    run_cli(main)
