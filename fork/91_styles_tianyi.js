/* ============================================================
   天依 fork — 91: style packs (pure data, registered like upstream 11p_styles).
   洛天依应援色 = 灰 (#8C8C94 白灰 · #46464C 深灰) + 粉丝梗色「天依蓝」#66CCFF。
   Never overwrites a core style; pushed to the end of J.STYLE_ORDER.
   ============================================================ */
(() => {
'use strict';

const S = {
  tianyi: {
    name: '天依蓝调', desc: '天依蓝×灰白·湖水光晕',
    moods: ['pop', 'emotional', 'calm'],
    schemes: [
      /* 主唱谱: 暗夜蓝底 + 天依蓝强调 (全曲基准感) */
      { bg: '#0D1216', fg: '#EAF4FA', sub: '#7E93A0', accent: '#66CCFF', accent2: '#9BE7FF', ink: '#66CCFF', dim: '#1A242B', ghostA: '#66CCFF', ghostB: '#FFFFFF', grad: ['#66CCFF', '#EAF4FA'] },
      /* 白灰: 洛天依应援灰的纸面感 */
      { bg: '#F3F5F7', fg: '#3B4148', sub: '#707A84', accent: '#12A3D8', accent2: '#3B4148', ink: '#3B4148', dim: '#DCE4EA', ghostA: '#66CCFF', ghostB: '#12A3D8', swap: true },
      /* 高亮: 天依蓝全底 (决定段落变色时给副歌) */
      { bg: '#66CCFF', fg: '#0F1418', sub: '#38596E', accent: '#FFFFFF', accent2: '#2E3438', ink: '#0F1418', dim: '#56AEE0', ghostA: '#FFFFFF', ghostB: '#0F1418' },
    ],
    fonts: { display: ['gothic_black', 'dela', 'round'], serif: ['mincho_light', 'mincho'], body: ['gothic_med'], mono: ['mono'] },
    texture: { grain: 0.4, paper: 0, scan: 0.2 }, ghost: 0.55, glow: 1.2,
    bias: { layout: { vcols: 1.6, mixed: 1.4, wave: 1.4, gloss: 1.3, center: 1.2 },
            enter: { pop: 1.6, wipe: 1.4, drop: 1.2, blur: 1.2 },
            exit: { drift: 1.4, shrink: 1.3, blur: 1.2 } },
    decor: { dots: 1, leaders: 0.8, rings: 0.8, sparks: 0.7, waveform: 0.6, grid: 0.4 },
    hud: false,
  },
  tianyiNight: {
    name: '天依夜航', desc: '深灰蓝×霓虹·星空弹幕感',
    moods: ['emotional', 'glitch', 'graphic'],
    schemes: [
      { bg: '#14181C', fg: '#F2F7FA', sub: '#8FA0AC', accent: '#66CCFF', accent2: '#FF6FA6', ink: '#66CCFF', dim: '#22282E', ghostA: '#66CCFF', ghostB: '#FF6FA6', grad: ['#66CCFF', '#2E3438'] },
      { bg: '#2A2E33', fg: '#66CCFF', sub: '#9BB3C2', accent: '#FFFFFF', accent2: '#FFB378', ink: '#66CCFF', dim: '#3B4148', ghostA: '#FFFFFF', ghostB: '#66CCFF' },
      { bg: '#F2F7FA', fg: '#1A232B', sub: '#5A6B76', accent: '#12A3D8', accent2: '#46464C', ink: '#1A232B', dim: '#DCE4EA', ghostA: '#12A3D8', ghostB: '#66CCFF', swap: true },
    ],
    fonts: { display: ['zenkaku', 'dela'], serif: ['mincho'], body: ['sansui'], mono: ['mono'] },
    texture: { grain: 0.55, paper: 0, scan: 0.45 }, ghost: 0.85, glow: 1.35,
    bias: { layout: { vcols: 1.8, marquee: 1.5, tile: 1.3, huge: 1.4, type: 1.2 },
            enter: { slice: 1.5, scramble: 1.4, flicker: 1.2, stretch: 1.3 },
            exit: { glitch: 1.5, slice: 1.4, fall: 1.2 } },
    decor: { barcode: 0.9, grid: 0.8, waveform: 0.8, rings: 0.6, leaders: 0.5 },
    hud: true, glitchBoost: 1.15,
  },
};

for (const [k, v] of Object.entries(S)) {
  if (J.STYLES[k]) continue;              // never overwrite a core/user style
  J.STYLES[k] = v;
  if (!J.STYLE_ORDER.includes(k)) J.STYLE_ORDER.push(k);
}
/* tianyi.getDate? no: same as upstream extra styles: NOT in J.BASE_STYLES (loaded before us),
   so these styles do NOT get the `extra` flag either — they are always visible in the style
   grid and always eligible for random picks. As a mild weight hint, keep them OUT of the
   core おまかせ styles lists (upstream mood `styles` arrays simply don't mention them). */
})();
