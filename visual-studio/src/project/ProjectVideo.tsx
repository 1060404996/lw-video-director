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

/** 单场景：负责自身的进出转场（淡入淡出 / 竖向滑入 / 缩放 / 擦除） */
const SceneTake: React.FC<{scene: TimelineScene}> = ({scene}) => {
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
      <Scene componentId={scene.component} params={params} theme={scene.theme} />
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
  const fontSize = Math.round(timeline.height * 0.046);
  const bottom = Math.round(timeline.height * timeline.subtitles.safeBottom);

  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {/* 字幕压底渐变：保证深色/浅色画面上都够对比度，也把字幕与组件页脚隔开 */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(to top, ${
            timeline.theme === 'swiss' || timeline.theme === 'archive' ? 'rgba(255,255,255,.72)' : 'rgba(0,0,0,.6)'
          } 0%, rgba(0,0,0,0) 24%)`,
          top: 'auto',
          height: '26%',
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
    <AbsoluteFill style={{justifyContent: 'flex-end', alignItems: 'center', paddingBottom: bottom, opacity}}>
      <div style={{transform: `translateY(${rise}px)`, textAlign: 'center', fontFamily: font, color}}>
        {cue.lines.map((line, i) => (
          <div
            key={i}
            style={{
              fontSize,
              lineHeight: 1.32,
              fontWeight: 600,
              letterSpacing: 0.5,
              textShadow: '0 2px 10px rgba(0,0,0,.55), 0 0 2px rgba(0,0,0,.4)',
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
  const bg = themes[timeline.theme].bg;
  const vo = timeline.audio.vo;

  return (
    <AbsoluteFill style={{backgroundColor: bg}}>
      {timeline.scenes.map((scene) => (
        <Sequence key={scene.id} from={scene.from} durationInFrames={scene.duration} name={scene.id}>
          <SceneTake scene={scene} />
        </Sequence>
      ))}

      {timeline.subtitles.enabled ? <SubtitleLayer timeline={timeline} /> : null}

      {vo ? (
        <Sequence from={vo.from} durationInFrames={Math.max(1, vo.duration)} name="VO">
          <VoTrack track={vo} />
        </Sequence>
      ) : null}

      {timeline.audio.bgm.map((track, i) => (
        <Sequence key={`bgm-${i}`} from={Math.round((track.start ?? 0) * timeline.fps)} name={`BGM-${i + 1}`}>
          <BgmTrack
            track={track}
            from={Math.round((track.start ?? 0) * timeline.fps)}
            totalFrames={timeline.totalFrames}
            duck={vo ? [vo.from, vo.from + vo.duration] : null}
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
