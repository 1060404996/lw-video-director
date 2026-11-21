/**
 * Timeline.tsx — 镜头 08 / 10「蔡伦与传播」(TIMELINE-001)
 *
 * 一个组件两种用法，靠 mode 切换：
 *  - origin：东汉 105 年蔡伦把流程定下来，西汉麻纸是「纸早就有了」的对照；
 *  - spread：纸往西走的时间+路线（751 怛罗斯 → 阿拉伯 → 12 世纪欧洲）。
 * 时间轴按真实年份等比例映射，节点逐个亮起；不用装饰性小字，最小字号 16px。
 */
import React from 'react';
import type {Params, SceneProps} from '../../catalog/types';
import {resolveStyle} from '../../styles/themes';
import {paperBackdrop, paperPalette} from './palette';
import {clamp01, easeInOut, easeOut, lerp, seg, useShot} from './kit';

type P = Params & {span?: number; mode?: string};

const W = 1280;
const H = 720;
const AX = {x1: 132, x2: 1148, y: 452};
const Y0 = -250;
const Y1 = 1300;

const MILE = [
  {year: -100, label: '西汉麻纸', note: '纸不是蔡伦发明的'},
  {year: 105, label: '蔡伦 · 105', note: '流程定型，纸变便宜'},
  {year: 751, label: '怛罗斯 · 751', note: '工匠西行，造纸出中原'},
  {year: 1150, label: '欧洲 · 12 世纪', note: '又几百年，才到全世界'},
];

const xOf = (y: number) => lerp(AX.x1, AX.x2, (y - Y0) / (Y1 - Y0));

const ROUTE = [
  {t: 0, name: '中原'},
  {t: 0.38, name: '撒马尔罕'},
  {t: 0.68, name: '巴格达'},
  {t: 1, name: '欧洲'},
];

export function Timeline({params, theme}: SceneProps) {
  const p = params as P;
  const s = resolveStyle(theme, p);
  const pal = paperPalette(theme, p.color);
  const {p: prog} = useShot(p.span, 5.2);
  const spread = String(p.mode ?? 'origin') === 'spread';

  const kick = easeOut(seg(prog, 0.0, 0.16));
  const tail = 1 - easeInOut(seg(prog, 0.93, 1));
  const axisIn = easeInOut(seg(prog, 0.08, 0.42));
  const routeIn = easeInOut(seg(prog, 0.18, 0.5));
  const dot = easeInOut(seg(prog, 0.34, 0.86));

  return (
    <div style={{position: 'absolute', inset: 0}}>
      <div style={{position: 'absolute', inset: '-16%', background: paperBackdrop(pal, theme)}} />
      <svg style={{position: 'absolute', inset: 0}} width="100%" height="100%" viewBox={`0 0 ${W} ${H}`}>
        <defs>
          <filter id="tl-blur" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="8" />
          </filter>
        </defs>

        <g opacity={kick * tail}>
          <text x="110" y="104" fill={pal.accent} fontFamily={s.mono} fontSize="15" letterSpacing="4">
            {spread ? 'HOW PAPER TRAVELLED WEST' : 'WHO MADE IT CHEAP'}
          </text>
          <text x="110" y="172" fill={pal.ink} fontFamily={s.display} fontSize="50" fontWeight="500">
            {String(p.title || (spread ? '纸，一路往西' : '蔡伦，把纸做便宜'))}
          </text>
          <text x="110" y="206" fill={pal.muted} fontFamily={s.font} fontSize="19" opacity={0.88}>
            {String(p.subtitle || (spread ? '751 → 阿拉伯 → 12 世纪欧洲' : '公元 105 年，东汉'))}
          </text>
          <line x1="110" y1="226" x2={110 + 190 * kick} y2="226" stroke={pal.accent} strokeWidth="2" opacity="0.7" />
        </g>

        {/* 时间轴本体 */}
        <g opacity={axisIn * tail}>
          <line x1={AX.x1} y1={AX.y} x2={lerp(AX.x1, AX.x2, axisIn)} y2={AX.y} stroke={pal.edge} strokeWidth="2" opacity="0.5" />
          {MILE.map((m, i) => {
            const x = xOf(m.year);
            const lit = easeOut(seg(prog, 0.34 + i * 0.09, 0.5 + i * 0.09));
            const isKey = (spread && m.year >= 751) || (!spread && m.year === 105);
            if (x > lerp(AX.x1, AX.x2, axisIn) + 3) return null;
            return (
              <g key={m.year} opacity={1}>
                <line x1={x} y1={AX.y - 8} x2={x} y2={AX.y + 8} stroke={pal.muted} strokeWidth="1.4" opacity={0.7} />
                <circle cx={x} cy={AX.y} r={isKey ? 6 + 2 * lit : 4} fill={isKey ? pal.accent : pal.paperHi} opacity={isKey ? 0.45 + 0.55 * lit : 0.9} stroke={pal.muted} strokeWidth="1" />
                <text x={x} y={AX.y + 46} textAnchor="middle" fill={isKey && lit > 0.4 ? pal.ink : pal.muted} fontFamily={s.font} fontSize="22" fontWeight={isKey ? 600 : 400} opacity={0.55 + 0.45 * lit}>
                  {m.label}
                </text>
                <text x={x} y={AX.y + 74 + (i % 2 ? 24 : 0)} textAnchor="middle" fill={pal.muted} fontFamily={s.font} fontSize="17" opacity={0.75 * lit}>
                  {m.note}
                </text>
              </g>
            );
          })}
        </g>

        {/* 传播路线：只在 spread 下出现 */}
        {spread ? (
          <g opacity={routeIn * tail}>
            <line x1={AX.x1 + 40} y1="330" x2={lerp(AX.x1 + 40, AX.x2 - 40, routeIn)} y2="330" stroke={pal.accent} strokeWidth="2" opacity="0.35" strokeDasharray="6 8" />
            {ROUTE.map((r) => {
              const x = lerp(AX.x1 + 40, AX.x2 - 40, r.t);
              const on = dot >= r.t - 0.02 ? 1 : 0;
              return (
                <g key={r.name} opacity={0.35 + 0.65 * on}>
                  <circle cx={x} cy="330" r={10} fill={on ? pal.accent : pal.paperHi} stroke={pal.muted} strokeWidth="1.4" />
                  <text x={x} y="298" textAnchor="middle" fill={pal.ink} fontFamily={s.font} fontSize="22" fontWeight={on ? 600 : 400}>
                    {r.name}
                  </text>
                </g>
              );
            })}
            {/* 行走的点：从撒马尔罕到欧洲，说明「工匠带着手艺走」 */}
            <circle cx={lerp(AX.x1 + 40, AX.x2 - 40, dot)} cy="330" r="7" fill={pal.paperHi} stroke={pal.accent} strokeWidth="2.5" />
          </g>
        ) : (
          <g opacity={easeOut(seg(prog, 0.4, 0.6)) * tail}>
            <text x="150" y="286" fill={pal.ink} fontFamily={s.font} fontSize="26" opacity={0.92}>
              蔡伦的功劳不是发明
            </text>
            <text x="150" y="326" fill={pal.muted} fontFamily={s.font} fontSize="24" opacity={0.8}>
              是把四道工序做稳定、做便宜
            </text>
            <text x="150" y="366" fill={pal.muted} fontFamily={s.font} fontSize="22" opacity={0.7}>
              从贵族案头的稀罕物，变成普通人写字用的日用品
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}
