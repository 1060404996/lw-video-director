/**
 * timeline.mjs — 成片时间轴引擎（Node CLI 与 Remotion 渲染共用同一份计算）
 *
 * 单位约定：对外一律秒，进渲染前统一换成帧（frames = round(sec * fps)）。
 * 这是项目规则第 5 条的落点：时间只在这里换算一次，别处不再出现第二套换算。
 */
export const DEFAULT_FPS = 30;
export const TRANSITIONS = ['cut', 'fade', 'slide', 'zoom', 'wipe'];
export const SAFE_MARGIN = 0.075; // 字幕安全区：底部留白占画面高度比例

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const round = Math.round;

/** 参数自带时长（entrance+hold+exit）：没有显式 duration 时的兜底 */
export function paramSeconds(params = {}) {
  const {entrance = 1, hold = 2, exit = 1} = params;
  return Math.max(0.2, entrance + hold + exit);
}

/** 文字权重：中文按 1，ASCII 按 0.56（与 shared.ts 的 wrapText 口径一致） */
const unit = (ch) => (/[\u0000-\u00ff]/.test(ch) ? 0.56 : 1);

/**
 * 语义断行：优先在标点处断开，其次按字数均分，每行 ≤ maxUnits，最多 maxLines 行。
 * 单行超长时保留尾部省略号，避免字幕被截断到看不出内容。
 */
export function breakCaption(text, maxUnits = 12, maxLines = 2) {
  const clean = String(text ?? '').replace(/\s+/g, ' ').trim();
  if (!clean) return [''];
  const segs = clean.split(/(?<=[，。！？、；：,.!?;:])\s*/).filter(Boolean);
  const lines = [];
  let cur = '';
  let wide = 0;
  const push = () => {
    if (cur.trim()) lines.push(cur.trim());
    cur = '';
    wide = 0;
  };
  for (const seg of segs) {
    const w = [...seg].reduce((s, c) => s + unit(c), 0);
    if (wide + w <= maxUnits) {
      cur += seg;
      wide += w;
      continue;
    }
    if (cur.trim()) push();
    if (w <= maxUnits) {
      cur = seg;
      wide = w;
      continue;
    }
    // 单段仍然超长：硬切
    let buf = '';
    let bw = 0;
    for (const ch of [...seg]) {
      if (bw + unit(ch) > maxUnits && buf) {
        lines.push(buf.trim());
        buf = '';
        bw = 0;
      }
      buf += ch;
      bw += unit(ch);
    }
    cur = buf;
    wide = bw;
  }
  if (cur.trim()) lines.push(cur.trim());
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    kept[maxLines - 1] = kept[maxLines - 1].replace(/[，。！？、；：,.!?;:]$/, '') + '…';
    return kept;
  }
  return lines.length ? lines : [''];
}

/** 解析 SRT：容错 CRLF、缺失序号、逗号/句点毫秒分隔符 */
export function parseSrt(raw) {
  const text = String(raw ?? '').replace(/\r/g, '');
  const blocks = text.split(/\n{2,}/).filter((b) => b.trim());
  const toSec = (stamp) => {
    const m = stamp.trim().match(/(\d+):(\d{1,2}):(\d{1,2})[.,](\d{1,3})/);
    if (!m) return null;
    return +m[1] * 3600 + +m[2] * 60 + +m[3] + +m[4].padEnd(3, '0') / 1000;
  };
  return blocks
    .map((block) => {
      const lines = block.split('\n').filter((l) => l.trim());
      const idx = lines.findIndex((l) => l.includes('-->'));
      if (idx < 0) return null;
      const [a, b] = lines[idx].split('-->');
      const start = toSec(a);
      const end = toSec(b);
      if (start === null || end === null || end <= start) return null;
      return {start, end, text: lines.slice(idx + 1).join('\n').trim()};
    })
    .filter((c) => c && c.text);
}

export function formatSrt(cues) {
  const stamp = (sec) => {
    const ms = Math.round((sec % 1) * 1000);
    const s = Math.floor(sec) % 60;
    const m = Math.floor(sec / 60) % 60;
    const h = Math.floor(sec / 3600);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
  };
  return cues
    .map((c, i) => `${i + 1}\n${stamp(c.start)} --> ${stamp(c.end)}\n${c.text}\n`)
    .join('\n');
}

const asTrack = (v, fallbackVolume) => {
  if (!v) return null;
  if (typeof v === 'string') return {src: v, volume: fallbackVolume, fadeIn: 0, fadeOut: 0, start: 0};
  return {volume: fallbackVolume, fadeIn: 0, fadeOut: 0, start: 0, ...v};
};

/**
 * 构建时间轴。输入 project 对象，输出渲染与校验共用的快照：
 * 场景绝对起点、转场重叠、音轨、字幕条（含已断行文本）。
 *
 * 时长优先级：scene.duration > 按口播时长按字数比例分配 > 组件参数时长。
 */
export function buildTimeline(project = {}) {
  const meta = project.meta ?? {};
  const fps = isNum(meta.fps) ? meta.fps : DEFAULT_FPS;
  const width = isNum(meta.width) ? meta.width : 1920;
  const height = isNum(meta.height) ? meta.height : 1080;
  const theme = meta.theme ?? 'future';
  const scenesIn = Array.isArray(project.scenes) ? project.scenes : [];
  const voDur = isNum(project.voDuration) ? project.voDuration : isNum(meta.voDuration) ? meta.voDuration : null;

  // 1. 场景时长
  const explicit = scenesIn.map((s) => (isNum(s.duration) && s.duration > 0 ? s.duration : null));
  const fixedSum = explicit.reduce((s, v) => s + (v ?? 0), 0);
  const weighted = scenesIn.map((s) => {
    const w = [...String(s.text ?? s.caption ?? '')].reduce((a, c) => a + unit(c), 0);
    return w > 0 ? w : 1;
  });
  const weightSum = weighted.reduce((a, b) => a + b, 0) || 1;
  const freeBudget = voDur && project.timing === 'vo' ? Math.max(0.5, voDur - fixedSum) : null;

  const durations = scenesIn.map((s, i) => {
    if (explicit[i]) return explicit[i];
    if (freeBudget !== null) return Math.max(1 / fps, (freeBudget * weighted[i]) / weightSum);
    return paramSeconds(s.params);
  });

  // 2. 转场重叠 + 绝对起点（全部在帧上取整，帧号必须是整数）
  const durF = durations.map((d) => Math.max(1, round(d * fps)));
  const overlapF = scenesIn.map((s, i) => {
    if (i === 0) return 0;
    const t = s.transition ?? {type: 'cut', duration: 0};
    if (!t || t.type === 'cut' || !isNum(t.duration) || t.duration <= 0) return 0;
    return Math.min(round(t.duration * fps), Math.floor(durF[i - 1] / 2), Math.floor(durF[i] / 2));
  });

  let cursor = 0;
  const scenes = scenesIn.map((s, i) => {
    const duration = durF[i];
    const from = cursor - overlapF[i];
    const startSec = from / fps;
    cursor = from + duration;
    return {
      id: s.id ?? `s${i + 1}`,
      component: s.component,
      params: s.params ?? {},
      theme: s.theme ?? theme,
      text: s.text ?? '',
      caption: s.caption ?? s.text ?? '',
      transition: s.transition ?? {type: 'cut', duration: 0},
      from,
      duration,
      prevOverlap: overlapF[i],
      nextOverlap: overlapF[i + 1] ?? 0,
      startSec,
      endSec: (from + duration) / fps,
    };
  });
  const totalFrames = Math.max(1, cursor);

  // 3. 音频轨（口播 / BGM / 音效点位）
  const audioIn = project.audio ?? {};
  const vo = asTrack(audioIn.vo, 1);
  const bgm = (Array.isArray(audioIn.bgm) ? audioIn.bgm : audioIn.bgm ? [audioIn.bgm] : [])
    .map((t) => asTrack(t, 0.18))
    .filter(Boolean);
  const sfxEvents = (Array.isArray(project.sfx) ? project.sfx : [])
    .filter((e) => e && typeof e.name === 'string' && isNum(e.at))
    .map((e) => {
      const name = e.name.replace(/\.wav$/i, '');
      return {
        name,
        src: `sfx/${name}.wav`,
        from: round(e.at * fps),
        at: e.at,
        volume: isNum(e.volume) ? e.volume : 0.8,
        anchor: e.anchor ?? null,
      };
    });

  const voTrack = vo
    ? {
        src: vo.src,
        from: round((vo.start ?? 0) * fps),
        start: vo.start ?? 0,
        duration: round((isNum(vo.duration) ? vo.duration : voDur ?? 0) * fps),
        volume: isNum(vo.volume) ? vo.volume : 1,
        fadeIn: vo.fadeIn ?? 0,
        fadeOut: vo.fadeOut ?? 0,
      }
    : null;

  // 4. 字幕：显式 cues > SRT 解析 > 场景文本
  const subIn = project.subtitles ?? {};
  const maxUnits = isNum(subIn.maxCharsPerLine) ? subIn.maxCharsPerLine : 12;
  let cues = [];
  if (Array.isArray(subIn.cues) && subIn.cues.length) {
    cues = subIn.cues;
  } else if (scenes.some((s) => String(s.caption).trim())) {
    cues = scenes
      .filter((s) => String(s.caption).trim())
      .map((s) => ({start: s.startSec, end: s.endSec - 0.08, text: s.caption}));
  }
  // 字幕条在转场重叠区会互相压住：前一条收缩到下一条起点前 0.05s
  cues = cues
    .slice()
    .sort((a, b) => a.start - b.start)
    .map((c, i, all) => {
      const next = all[i + 1];
      const hardEnd = next ? Math.min(c.end, next.start - 0.05) : c.end;
      return {...c, end: Math.max(c.start + 0.2, hardEnd)};
    });

  const subtitleCues = subIn.enabled === false
    ? []
    : cues
        .map((c) => {
          const from = round(c.start * fps);
          const to = round(c.end * fps);
          const duration = Math.max(1, Math.min(to, totalFrames) - from);
          return {from, duration, start: c.start, end: c.end, text: String(c.text).trim(), lines: breakCaption(c.text, maxUnits, 2)};
        })
        .filter((c) => c.duration > 0 && c.from < totalFrames);

  return {
    fps,
    width,
    height,
    theme,
    totalFrames,
    totalSeconds: +(totalFrames / fps).toFixed(3),
    scenes,
    audio: {vo: voTrack, bgm, sfx: sfxEvents},
    subtitles: {
      enabled: subIn.enabled !== false && subtitleCues.length > 0,
      cues: subtitleCues,
      safeBottom: isNum(subIn.safeBottom) ? subIn.safeBottom : SAFE_MARGIN,
    },
  };
}

/** 场景内的本地相位：转场进/出各占多少帧（渲染与 lint 共用） */
export function transitionPhase(scene) {
  const inF = Math.min(scene.prevOverlap, Math.floor(scene.duration * 0.5));
  const outF = Math.min(scene.nextOverlap, Math.floor(scene.duration * 0.5));
  return {inF, outF};
}
