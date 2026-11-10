/* ============================================================
   天依 fork — 92: mood presets (模板情绪).
   Same shape as upstream J.MOODS (src/08b_omakase.js): each preset is a
   {name, fx ranges, layout/enter/exit lists, styles[].} — omakase picks by
   mood; parts are picked from the given part key lists, styles by
   st.moods containing the mood key. Existing keys only (core registry keys).
   ============================================================ */
(() => {
'use strict';

/* part lists use only VERIFIED upstream registry keys (core 06/05);
   styles may name extra styles (sakura/vapor/…) — when the 追加分 switch is
   off, upstream's own randomOk() filters them out, so listing is always safe */
const L = (m) => m;

J.MOODS.tysweet = {
  name: '甜系治愈', fx: { motion: [0.75, 1], glitch: [0.05, 0.2], chroma: [0.3, 0.5], decor: [0.7, 1], density: [0.6, 0.9], texture: [0.1, 0.35], bgSwitch: [0.5, 0.9] },
  layout: ['mixed', 'wave', 'scatter', 'labels', 'pill', 'gloss', 'center'],
  enter: ['pop', 'drop', 'stretch', 'zoom', 'blur'], exit: ['scatter', 'shrink', 'stretch', 'blur'],
  styles: ['tianyi', 'magenta', 'candy', 'sakura'],
};
J.MOODS.tyblue = {
  name: '蓝调深情', fx: { motion: [0.55, 0.8], glitch: [0.15, 0.35], chroma: [0.5, 0.8], decor: [0.35, 0.65], density: [0.4, 0.7], texture: [0.5, 0.85], bgSwitch: [0.25, 0.55] },
  layout: ['center', 'vcols', 'stack', 'huge', 'condensed', 'mixed'],
  enter: ['assemble', 'blur', 'zoom', 'wipe', 'type'], exit: ['drift', 'fall', 'blur', 'shrink'],
  styles: ['tianyi', 'tianyiNight', 'noir', 'mono'],
};
J.MOODS.tynova = {
  name: '星空电子', fx: { motion: [0.6, 0.9], glitch: [0.35, 0.6], chroma: [0.55, 0.85], decor: [0.5, 0.8], density: [0.5, 0.8], texture: [0.3, 0.6], bgSwitch: [0.35, 0.7] },
  layout: ['vcols', 'marquee', 'tile', 'tunnel', 'equalizer', 'center', 'typeSpecimen'],
  enter: ['scramble', 'slice', 'stretch', 'zoom', 'assemble'], exit: ['glitch', 'slice', 'drift', 'scatter'],
  styles: ['tianyi', 'tianyiNight', 'synth80', 'vapor'],
};
J.MOODS.tyfire = {
  name: '热血燃', fx: { motion: [0.85, 1], glitch: [0.4, 0.7], chroma: [0.6, 0.9], decor: [0.5, 0.85], density: [0.7, 1], texture: [0.35, 0.7], bgSwitch: [0.4, 0.8] },
  layout: ['huge', 'vcols', 'condensed', 'crossBands', 'columnsBig', 'marquee'],
  enter: ['scramble', 'slice', 'stretch', 'zoom', 'drop'], exit: ['explode', 'glitch', 'fall', 'slice'],
  styles: ['crimson', 'noir', 'hud', 'acid', 'tianyiNight'],
};
J.MOODS.tyspring = {
  name: '青春校园', fx: { motion: [0.7, 0.95], glitch: [0.1, 0.3], chroma: [0.3, 0.6], decor: [0.6, 0.95], density: [0.5, 0.8], texture: [0.25, 0.55], bgSwitch: [0.4, 0.75] },
  layout: ['mixed', 'labels', 'pill', 'ring', 'center', 'stickerBomb', 'tape'],
  enter: ['pop', 'drop', 'spin', 'wipe', 'type'], exit: ['scatter', 'shrink', 'wipe', 'blur'],
  styles: ['sakura', 'candy', 'paper', 'kraft', 'tianyi'],
};
J.MOODS.tyghost = {
  name: '黑化', fx: { motion: [0.5, 0.8], glitch: [0.45, 0.75], chroma: [0.4, 0.7], decor: [0.3, 0.6], density: [0.35, 0.6], texture: [0.65, 1], bgSwitch: [0.15, 0.4] },
  layout: ['stack', 'huge', 'type', 'vcols', 'condensed'],
  enter: ['flicker', 'blur', 'type', 'scramble'], exit: ['glitch', 'fall', 'blur', 'drift'],
  noHold: ['wave', 'breathe'],
  styles: ['noir', 'mono', 'crimson', 'tianyiNight'],
};
J.MOODS.tywafolk = {
  name: '国风水墨', fx: { motion: [0.4, 0.65], glitch: [0.05, 0.2], chroma: [0.15, 0.4], decor: [0.35, 0.65], density: [0.3, 0.55], texture: [0.6, 0.95], bgSwitch: [0.15, 0.4] },
  layout: ['center', 'circle', 'halfVertical', 'hanging', 'kanjiFocus', 'vcols'],
  enter: ['type', 'wipe', 'blur', 'assemble'], exit: ['drift', 'blur', 'wipe', 'shrink'],
  styles: ['sumi', 'paper', 'kraft', 'mono', 'gold'],
};
J.MOODS.tydream = {
  name: '空灵幻想', fx: { motion: [0.5, 0.75], glitch: [0.1, 0.3], chroma: [0.4, 0.7], decor: [0.45, 0.75], density: [0.4, 0.65], texture: [0.55, 0.9], bgSwitch: [0.25, 0.55] },
  layout: ['orbit', 'circle', 'wave', 'hanging', 'bubbles', 'center'],
  enter: ['blur', 'assemble', 'zoom', 'type'], exit: ['drift', 'blur', 'shrink', 'fall'],
  styles: ['vapor', 'ocean', 'forest', 'tianyi'],
};
J.MOODS.tyidol = {
  name: '偶像应援', fx: { motion: [0.85, 1], glitch: [0.15, 0.4], chroma: [0.45, 0.75], decor: [0.75, 1], density: [0.65, 0.95], texture: [0.2, 0.45], bgSwitch: [0.5, 0.9] },
  layout: ['huge', 'marquee', 'ring', 'wave', 'pill', 'scatter', 'zoomRepeat'],
  enter: ['pop', 'drop', 'spin', 'zoom', 'flicker'], exit: ['scatter', 'shrink', 'stretch', 'blur', 'explode'],
  styles: ['tianyi', 'magenta', 'candy', 'acid'],
};
J.MOODS.tynight = {
  name: '深夜电台', fx: { motion: [0.3, 0.55], glitch: [0.05, 0.2], chroma: [0.2, 0.45], decor: [0.25, 0.55], density: [0.3, 0.55], texture: [0.6, 0.95], bgSwitch: [0.1, 0.35] },
  layout: ['type', 'gloss', 'vcols', 'center', 'stack', 'condensed'],
  enter: ['type', 'blur', 'wipe', 'assemble'], exit: ['drift', 'blur', 'wipe', 'shrink'],
  styles: ['tianyiNight', 'noir', 'mono', 'sumi'],
};
})();
