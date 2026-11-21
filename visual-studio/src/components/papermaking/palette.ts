/**
 * 造纸系列的主题调色板。
 *
 * 为什么要单独一层：
 * 三个镜头组件里有大量「纸纤维 / 水 / 陶缸」的专用颜色，这些不属于通用主题字段
 * （theme 只有 bg/fg/accent/muted/panel）。把纸艺专属色集中在这里，换主题只改这一处，
 * 组件本身保持几何与动画不变——这样同一套镜头可以随时切 archive / mist-blue-paper。
 */
import type {ThemeId} from '../../catalog/types';
import {themes} from '../../styles/themes';

export type PaperPalette = {
  /** 画面底色（可带透明度，让底层薄雾青山透出来） */
  page: string;
  /** 宣纸高光 / 中间调 / 暗调 */
  paperHi: string;
  paperMid: string;
  paperLo: string;
  /** 纸边毛口 */
  edge: string;
  /** 纤维本体 / 纤维暗部 / 颗粒 / 帘纹 */
  fiber: string;
  fiberAlt: string;
  grain: string;
  weave: string;
  /** 毛边高光 */
  deckleHi: string;
  /** 光斑 */
  spot: string;
  /** 投影 / 暗角 */
  shadow: string;
  vignette: string;
  /** 水：表层 / 中层 / 深层 / 水面亮线 / 泡沫 */
  waterHi: string;
  waterMid: string;
  waterLo: string;
  foam: string;
  bubble: string;
  /** 陶缸：外壁亮 / 中 / 暗 / 内壁 */
  clayHi: string;
  clayMid: string;
  clayLo: string;
  tankIn: string;
  tankLo: string;
  tankDark: string;
  /** 干纤维团 */
  lump: string;
  lumpFiber: string;
  /** 文字与朱红/铜色重点 */
  ink: string;
  accent: string;
  muted: string;
};

const ARCHIVE: PaperPalette = {
  page: '#d3c3a4',
  paperHi: '#f6eedf',
  paperMid: '#efddc5',
  paperLo: '#e2d3b7',
  edge: '#a89272',
  fiber: '#8a7350',
  fiberAlt: '#7a6244',
  grain: '#7d6549',
  weave: '#7c6549',
  deckleHi: '#fffaf0',
  spot: '#b9946a',
  shadow: '#8b7554',
  vignette: '#4a3826',
  waterHi: '#a97f4c',
  waterMid: '#8e6539',
  waterLo: '#6d4a26',
  foam: '#fff2d3',
  bubble: '#ffeccb',
  clayHi: '#b08a5f',
  clayMid: '#96714a',
  clayLo: '#6f5233',
  tankIn: '#7a5a36',
  tankLo: '#4a3118',
  tankDark: '#5e4429',
  lump: '#c9ab77',
  lumpFiber: '#dcc59b',
  ink: '#352d26',
  accent: '#9f4933',
  muted: '#746351',
};

/** 青灰蓝 + 宣纸白 + 薄雾青山 */
const MIST: PaperPalette = {
  // 宣纸白留一点透，底下的青山雾层才能隐约透出来
  page: '#F8F7F2EE',
  paperHi: '#FDFCF7',
  paperMid: '#F6F5EF',
  paperLo: '#E7E9E1',
  edge: '#A9BCC4',
  fiber: '#7C97A0',
  fiberAlt: '#66838D',
  grain: '#6E858C',
  weave: '#7A9099',
  deckleHi: '#FFFFFF',
  spot: '#B6C8CE',
  shadow: '#8FA6AE',
  vignette: '#193447',
  waterHi: '#7E9AA3',
  waterMid: '#5E818C',
  waterLo: '#3F5D68',
  foam: '#EFF6F7',
  bubble: '#DDEBEE',
  clayHi: '#9FB8C0',
  clayMid: '#7C97A0',
  clayLo: '#5D7982',
  tankIn: '#6E8A93',
  tankLo: '#3F5862',
  tankDark: '#42606B',
  lump: '#A9C0C6',
  lumpFiber: '#D8E6E9',
  ink: '#193447',
  accent: '#B78456',
  muted: '#537B87',
};

export const paperPalette = (theme: ThemeId, accentOverride?: string): PaperPalette => {
  const base = theme === 'mist-blue-paper' ? MIST : ARCHIVE;
  const t = themes[theme];
  return {
    ...base,
    ink: t.fg,
    muted: t.muted,
    accent: accentOverride && accentOverride.trim() ? accentOverride : t.accent,
  };
};

/**
 * 纸面底：mist 主题下不能整块盖死，否则底层的薄雾青山看不见。
 * 这里用一张「中间实、边缘透」的纸，字区（左侧）保持高遮盖，右侧与下缘留出山雾，
 * archive 主题则维持原来的实心纸面。
 */
export const paperBackdrop = (pal: PaperPalette, theme: ThemeId): string => {
  if (theme !== 'mist-blue-paper') return pal.page;
  return [
    // 字区（左上）最实，右下与下缘逐步放开，让分层青山透出来
    'radial-gradient(120% 105% at 24% 14%, #F8F7F2F2 0%, #F8F7F2E6 40%, #F8F7F2B6 66%, #F8F7F26E 100%)',
    'linear-gradient(180deg, #F8F7F2EC 0%, #F8F7F2CE 58%, #F8F7F286 100%)',
  ].join(', ');
};
