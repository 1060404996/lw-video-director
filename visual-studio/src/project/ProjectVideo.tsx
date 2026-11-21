import React, {useMemo} from 'react';
import {AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame} from 'remotion';
import type {Params} from '../catalog/types';
import {catalog} from '../catalog/registry';
import {themes} from '../styles/themes';
import {Scene} from '../remotion/Scene';
import {buildTimeline, transitionPhase} from './timeline.mjs';
import type {ProjectFile, TimelineScene} from './types';

const resolveSrc = (src: string) =>
  /^(https?:|data:|blob:)/.test(src) ? src : staticFile(src.replace(/^\/+/, ''));

/** 字幕条高度（渲染与画面缩放共用，保证画面底边正好压在条顶上） */
const bandHeight = (timeline: ReturnType<typeof buildTimeline>) => {
  const fontSize = Math.round(timeline.height * 0.042);
  const bottom = Math.round(timeline.height * timeline.subtitles.safeBottom);
  return Math.max(Math.round(fontSize * 1.32 * 2 + bottom + fontSize * 0.9), Math.round(timeline.height * 0.16));
};

/** 单场景：负责自身的进出转场（淡入淡出 / 竖向滑入 / 缩放 / 擦除） */
const SceneTake: React.FC<{scene: TimelineScene; contentScale: number}> = ({scene, contentScale}) => {
  const frame = useCurrentFrame();
  const {inF, outF} = transitionPhase(scene);
  const kind = scene.transition?.type ?? 'cut';
  // 组件参数只有部分时，用 catalog 默认值补齐，避免组件拿到 undefined
  const params = {...(catalog.find((c) => c.id === scene.component)?.defaultProps ?? {}), ...scene.params} as Params;
  let opacity = 1;
  let transform = 'none';
  let clipPath = 'none';

  if (inF > 0 && frame < inF) {
    const p = interpolate(frame, [0, inF], [0, 1], {extrapolateRight: 'clamp'});
    if (kind === 'fade') opacity = p;
    else if (kind === 'slide') {
      opacity = p;
      transform = `translateY(${(1 - p) * 8}%)`;
    } else if (kind === 'zoom') {
      opacity = p;
      transform = `scale(${1.08 - 0.08 * p})`;
    } else if (kind === 'wipe') {
      clipPath = `inset(0 ${(1 - p) * 100}% 0 0)`;
    }
  }
  if (outF > 0 && frame > scene.duration - outF) {
    const p = interpolate(frame, [scene.duration - outF, scene.duration], [1, 0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    opacity = Math.min(opacity, kind === 'wipe' ? 1 : p);
    if (kind === 'wipe') clipPath = `inset(0 0 0 ${(1 - p) * 100}%)`;
    else if (kind === 'slide') transform = `translateY(${-(1 - p) * 8}%)`;
    else if (kind === 'zoom') transform = `scale(${1 + 0.08 * (1 - p)})`;
  }

  return (
    <AbsoluteFill style={{opacity, transform, clipPath, overflow: 'hidden'}}>
      {/* 画面整体等比缩到字幕条之上：组件底部标题/坐标不会被字幕压住 */}
      <div style={{position: 'absolute', inset: 0, transform: `scale(${contentScale})`, transformOrigin: '50% 0%'}}>
        <Scene componentId={scene.component} params={params} theme={scene.theme} />
      </div>
    </AbsoluteFill>
  );
};

/** 口播轨：淡入淡出 + 帧级音量（Remotion 每帧重渲染，常量音量即可构成包络） */
const VoTrack: React.FC<{track: NonNullable<ReturnType<typeof buildTimeline>['audio']['vo']>}> = ({track}) => {
  const frame = useCurrentFrame();
  const {duration, volume, fadeIn, fadeOut} = track;
  let v = volume;
  if (fadeIn > 0 && frame < fadeIn * 30) v *= interpolate(frame, [0, fadeIn * 30], [0, 1], {extrapolateRight: 'clamp'});
  if (fadeOut > 0 && frame > duration - fadeOut * 30)
    v *= interpolate(frame, [duration - fadeOut * 30, duration], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return <Audio src={resolveSrc(track.src)} volume={Math.max(0, v)} />;
};

const BgmTrack: React.FC<{
  track: {src: string; volume: number; fadeIn: number; fadeOut: number; duration?: number};
  from: number;
  totalFrames: number;
  duck: [number, number] | null;
}> = ({track, from, totalFrames, duck}) => {
  const frame = useCurrentFrame();
  const abs = from + frame;
  const end = track.duration ? from + track.duration : totalFrames;
  let v = track.volume;
  if (track.fadeIn > 0) v *= interpolate(abs, [from, from + track.fadeIn * 30], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  if (track.fadeOut > 0) v *= interpolate(abs, [end - track.fadeOut * 30, end], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  if (duck && abs >= duck[0] && abs <= duck[1]) v *= 0.35; // 口播期压低 BGM
  return <Audio src={resolveSrc(track.src)} volume={Math.max(0, v)} />;
};

/** 字幕层：底部安全区内，最多两行，进出行各 4 帧淡入淡出 */
const SubtitleLayer: React.FC<{timeline: ReturnType<typeof buildTimeline>}> = ({timeline}) => {
  const style = themes[timeline.theme];
  const fontSize = Math.round(timeline.height * 0.042);
  const bottom = Math.round(timeline.height * timeline.subtitles.safeBottom);
  const band = bandHeight(timeline);

  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {/* 下三分之一字幕条：panel 底色压住图表坐标与组件页脚，发丝线让覆盖显得是设计而不是遮挡 */}
      <AbsoluteFill
        style={{
          top: 'auto',
          height: band,
          background: `${style.panel}F5`,
          borderTop: `1px solid ${style.accent}66`,
          boxShadow: `inset 0 1px 0 ${style.fg}12`,
          backdropFilter: 'blur(6px)',
        }}
      />
      {timeline.subtitles.cues.map((cue, i) => (
        <Sequence key={`${cue.from}-${i}`} from={cue.from} durationInFrames={cue.duration}>
          <CueView cue={cue} fontSize={fontSize} bottom={bottom} color={style.fg} font={style.display} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

const CueView: React.FC<{cue: {duration: number; lines: string[]}; fontSize: number; bottom: number; color: string; font: string}> = ({
  cue,
  fontSize,
  bottom,
  color,
  font,
}) => {
  const frame = useCurrentFrame();
  const opacity = Math.min(
    interpolate(frame, [0, 4], [0, 1], {extrapolateRight: 'clamp'}),
    interpolate(frame, [Math.max(0, cue.duration - 4), cue.duration], [1, 0], {extrapolateLeft: 'clamp'}),
  );
  const rise = interpolate(frame, [0, 6], [12, 0], {extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{justifyContent: 'flex-end', alignItems: 'center', paddingBottom: bottom - Math.round(fontSize * 0.35), opacity}}>
      <div style={{transform: `translateY(${rise}px)`, textAlign: 'center', fontFamily: font, color}}>
        {cue.lines.map((line, i) => (
          <div
            key={i}
            style={{
              fontSize,
              lineHeight: 1.32,
              fontWeight: 600,
              letterSpacing: 0.5,
              textShadow: '0 1px 2px rgba(0,0,0,.18)',
              padding: '0 .4em',
            }}
          >
            {line}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

export const ProjectVideo: React.FC<{project: ProjectFile}> = ({project}) => {
  const timeline = useMemo(() => buildTimeline(project), [project]);
  const band = timeline.subtitles.enabled ? bandHeight(timeline) : 0;
  const contentScale = band > 0 ? (timeline.height - band) / timeline.height : 1;
  const bg = themes[timeline.theme].bg;
  const vo = timeline.audio.vo;
  // 口播覆盖区间：整条 vo 与分镜段落并起来，BGM 在这段里压低
  const spans: [number, number][] = [
    ...(vo ? [[vo.from, vo.from + vo.duration] as [number, number]] : []),
    ...timeline.audio.voSegments.map((s) => [s.from, s.from + s.duration] as [number, number]),
  ];
  const duck: [number, number] | null = spans.length
    ? [Math.min(...spans.map((s) => s[0])), Math.max(...spans.map((s) => s[1]))]
    : null;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: bg,
        // 全局纸格纹理：画面缩放后左右留白也延续同一套网格，不出现空洞
        backgroundImage: `linear-gradient(${themes[timeline.theme].fg}0D 1px, transparent 1px), linear-gradient(90deg, ${themes[timeline.theme].fg}0D 1px, transparent 1px)`,
        backgroundSize: `${themes[timeline.theme].grid}px ${themes[timeline.theme].grid}px`,
      }}
    >
      {timeline.scenes.map((scene) => (
        <Sequence key={scene.id} from={scene.from} durationInFrames={scene.duration} name={scene.id}>
          <SceneTake scene={scene} contentScale={contentScale} />
        </Sequence>
      ))}

      {timeline.subtitles.enabled ? <SubtitleLayer timeline={timeline} /> : null}

      {vo ? (
        <Sequence from={vo.from} durationInFrames={Math.max(1, vo.duration)} name="VO">
          <VoTrack track={vo} />
        </Sequence>
      ) : null}

      {timeline.audio.voSegments.map((seg) => (
        <Sequence key={`vo-${seg.sceneId}`} from={seg.from} durationInFrames={Math.max(1, seg.duration)} name={`VO-${seg.sceneId}`}>
          <Audio src={resolveSrc(seg.src)} volume={seg.volume} />
        </Sequence>
      ))}

      {timeline.audio.bgm.map((track, i) => (
        <Sequence key={`bgm-${i}`} from={Math.round((track.start ?? 0) * timeline.fps)} name={`BGM-${i + 1}`}>
          <BgmTrack
            track={track}
            from={Math.round((track.start ?? 0) * timeline.fps)}
            totalFrames={timeline.totalFrames}
            duck={duck}
          />
        </Sequence>
      ))}

      {timeline.audio.sfx.map((cue, i) => (
        <Sequence key={`sfx-${i}-${cue.name}`} from={cue.from} name={`SFX-${cue.name}`}>
          <Audio src={staticFile(cue.src)} volume={cue.volume} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
