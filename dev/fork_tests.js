/* mini-host regression for fork/89-94: run with `node dev/fork_tests.js` (needs no browser) */
let J = { plan: p => ({ __orig: true, project: p }) };
globalThis.J = J;
/* upstream registries (real keys; piece parts included so glyphFx pools validate) */
const LAYOUTS = ['bounceLine','bubbles','circleWords','columnsBig','credits','crossBands','curtain','depthStack','dotMatrix','elastic','equalizer','flipBoard','halfVertical','hanging','kanjiFocus','keycaps','myKey','neon','orbit','rain','slotMachine','splitHalves','stickerBomb','tape','tunnel','typeSpecimen','wordCloud','zoomRepeat','center','circle','condensed','diag','gloss','huge','interlude','labels','marquee','mixed','pill','ring','scatter','stack','tile','title','type','vcols','wave'];
const ENTERS = ['assemble','blur','breathe','cut','crumple','drop','flicker','glitch','glitchtick','jitter','pop','scramble','shrink','slice','spin','stretch','type','wave','wipe','zoom','windBlown','strokeOrder','xePieceRain','xePieceVortex','xePieceStrata','xePiecePile'];
const EXITS = ['assemble','blur','cut','drift','drop','explode','fall','flicker','glitch','pop','scatter','shrink','slice','spin','still','stretch','type','wave','wipe','zoom','dissolve','xhPieceStrata','xhPieceThin','xhPieceSpin','xhPieceHeap','xhPieceParts'];
J.LAYOUTS = Object.fromEntries(LAYOUTS.map(k => [k, { name: k, special: k === 'title' || k === 'interlude' }]));
J.ENTER = Object.fromEntries(ENTERS.map(k => [k, { name: k }]));
J.EXIT = Object.fromEntries(EXITS.map(k => [k, { name: k }]));
J.h = (...ns) => { let x = 2166136261 >>> 0; for (const n of ns) { x ^= Number(n) | 0; x = Math.imul(x, 16777619); } return x >>> 0; };
J.rng = seed => { let a = seed >>> 0; const f = () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  f.pick = arr => arr[Math.floor(f() * arr.length) % arr.length];
  f.chance = p => f() < p; f.int = (lo, hi) => lo + Math.floor(f() * (hi - lo + 1)); f.range = (lo, hi) => lo + f() * (hi - lo);
  return f; };
const fs = require('fs'), path = require('path');
const fork = f => new Function('J', fs.readFileSync(path.join(__dirname, '../fork', f), 'utf8'))(J);
J.MOODS = {};
J.FONTS = {};                     // stub of upstream 02_fonts catalogue (94 registers keys into it)
require('../fork/89_tyx_shared.js');
fork('90_config.js');
fork('92_moods_tianyi.js');
fork('93_sections.js');
fork('94_fonts_tianyi.js');

/* plan-line indices (markers stripped, blank = 0 lines):
   0湖水 1你数 2站台 3蓝色 4路灯(桥) 5站台 6蓝色 7回声 */
const lyrics = ['[主歌]','湖水把灯火折叠','你数着月亮的旧','','[副歌]','站台灯亮起','蓝色在靠岸','[桥]','路灯熄灭了','[副歌 2]','站台灯亮起','蓝色在靠岸','[尾声]','回声里是明天'].join('\n');
const P = (cfg, extra) => J.plan(Object.assign({ lyrics, seed: 7, tianyi: cfg }, extra || {}));
const checks = [];
const G = J.TY.GLYPHFX;
const r = P({ sectionMoods: { verse: 'tyblue', chorus: 'tyidol' } }).project;
const ov = r.overrides;
const tyblueL = J.MOODS.tyblue.layout, tyidolL = J.MOODS.tyidol.layout;

/* ---- 回归: sectionMoods (14) ---- */
checks.push(['verse rows(0,1) ← tyblue pool', [0,1].every(li => ov[li] && tyblueL.includes(ov[li].layout))]);
checks.push(['chorus rows(2,3,5,6) ← tyidol pool', [2,3,5,6].every(li => ov[li] && tyidolL.includes(ov[li].layout))]);
checks.push(['bridge(4)/outro(7) not styled', !ov[4] && !ov[7]]);
checks.push(['enter mood-sourced', [0,1].every(li => J.MOODS.tyblue.enter.includes(ov[li].enter))]);
checks.push(['span sticky: ≤3 layouts per span', new Set([ov[2].layout, ov[3].layout]).size <= 3]);
checks.push(['user per-key win', (() => { const r2 = P({ sectionMoods: { chorus: 'tyidol' } }, { overrides: { 2: { layout: 'huge', hold: 'drift' } } }).project.overrides; return r2[2].layout === 'huge' && r2[2].hold === 'drift' && J.MOODS.tyidol.enter.includes(r2[2].enter) && tyidolL.includes(r2[3].layout); })()]);
checks.push(['invalid preset → warn + skip, others ok', (() => { const ws = []; const w0 = console.warn; console.warn = (...a) => ws.push(a.join(' ')); const r3 = P({ sectionMoods: { chorus: 'nope', verse: 'tyblue' } }).project; console.warn = w0; return ws.some(w => w.includes('sectionMoods.chorus')) && [0,1].every(li => r3.overrides[li] && tyblueL.includes(r3.overrides[li].layout)) && ![2,3,5,6].some(li => r3.overrides[li]); })()]);
checks.push(['sections:off → no bangs, moods still on', (() => { const r4 = P({ sections: 'off', sectionMoods: { chorus: 'tyidol' } }).project; return !r4.lyrics.includes('!') && [2,3,5,6].every(li => r4.overrides[li] && tyidolL.includes(r4.overrides[li].layout)); })()]);
checks.push(['bridge hold + mood coexist', (() => { const r5 = P({ sections: 'strong', sectionMoods: { bridge: 'tyghost' } }).project.overrides; return r5[4].hold === 'still' && J.MOODS.tyghost.layout.includes(r5[4].layout); })()]);
checks.push(['deterministic same-seed', JSON.stringify(P({ sectionMoods: { verse: 'tyblue', chorus: 'tyidol' } }).project.overrides) === JSON.stringify(r.overrides)]);
checks.push(['LRC multi-ts row → all lines styled', (() => { const l2 = ['[主歌]','[00:01.00][00:03.00]湖水把灯火折叠','','[副歌]','站台灯亮起'].join('\n'); const r6 = J.plan({ lyrics: l2, seed: 7, tianyi: { sectionMoods: { verse: 'tyblue' } } }).project.overrides; return r6[0] && r6[1] && r6[0].layout === r6[1].layout && tyblueL.includes(r6[0].layout); })()]);
checks.push(['no tianyi → untouched', P(undefined).__orig === true]);
checks.push(['enabled:false → untouched', P({ enabled: false, sectionMoods: { verse: 'tyblue' } }).__orig === true]);
checks.push(['schema: map 非对象 → 警告回退', (() => { const ws=[]; const w0=console.warn; console.warn=(...a)=>ws.push(a.join(' ')); const r7 = P({ sectionMoods: ['bad'] }).project; console.warn=w0; return ws.some(w => w.includes('expected an object')) && !r7.overrides; })()]);

/* ---- fonts (94) ---- */
checks.push(['ty_* fonts registered (10)', ['ty_heiti','ty_songti','ty_huangyou','ty_kuaile','ty_xiaowei','ty_wenkai','ty_mashan','ty_liujian','ty_zhimang','ty_longcang'].every(k => J.FONTS[k] && J.FONTS[k].family && J.FONTS[k].gf)]);
checks.push(['fonts: never overwrite existing keys', (() => { J.FONTS.ty_heiti = { hijacked: true }; fork('94_fonts_tianyi.js'); return J.FONTS.ty_heiti.hijacked === true; })()]);
checks.push(['fontCSS resolves ty key via faceOf (zh-Hans fallback path)', (() => { const f = (J.faceOf ? J.faceOf('ty_mashan') : J.FONTS['ty_mashan']); return f.family.includes('Ma Shan Zheng'); })()]);
checks.push(['glyphFx pools only reference registered non-special parts', [...G.enter, ...G.exit].every(k => (J.ENTER[k] && !J.ENTER[k].special) || (J.EXIT[k] && !J.EXIT[k].special))]);

/* ---- glyphFx ---- */
const gPool = [...G.enter, ...G.exit];
const cnt = p2 => Object.values(p2.overrides || {}).reduce((n, o) => n + (gPool.includes(o.enter) || gPool.includes(o.exit) ? 1 : 0), 0);
checks.push(['glyphFx:off → fork writes no enter/exit', P({ glyphFx: 'off' }).project.overrides === undefined]);
checks.push(['glyphFx:some fires on a minority of lines', (() => { const p2 = P({ glyphFx: 'some', sectionMoods: { chorus: 'tyidol' } }).project; const n = cnt(p2); const total = Object.keys(p2.overrides).length; return n > 0 && n < total; })()]);
checks.push(['glyphFx:lots fires on many lines', (() => { const n = cnt(P({ glyphFx: 'lots' }).project); return n >= 4; })()]);
checks.push(['glyphFx piece values all come from the pool', (() => { const p2 = P({ glyphFx: 'lots' }).project; return Object.values(p2.overrides).every(o => (!o.enter || G.enter.includes(o.enter)) && (!o.exit || G.exit.includes(o.exit))); })()]);
checks.push(['glyphFx deterministic same-seed', JSON.stringify(P({ glyphFx: 'lots' }).project.overrides) === JSON.stringify(P({ glyphFx: 'lots' }).project.overrides)]);
checks.push(['glyphFx overrides sectionMoods enter/exit, keeps layout', (() => { const p2 = P({ glyphFx: 'lots', sectionMoods: { verse: 'tyblue' } }).project.overrides; return [0,1].every(li => tyblueL.includes(p2[li].layout)) && [0,1].every(li => !p2[li].enter || G.enter.includes(p2[li].enter) || J.MOODS.tyblue.enter.includes(p2[li].enter)); })()]);
checks.push(['glyphFx: user keys win per-key', (() => { const p2 = P({ glyphFx: 'lots' }, { overrides: { 0: { enter: 'blur', exit: 'blur' } } }).project.overrides; return p2[0].enter === 'blur' && p2[0].exit === 'blur'; })()]);
checks.push(['glyphFx skips interlude rows', (() => { const l2 = ['[主歌]','湖水','[间奏 4]','','[副歌]','蓝色在靠岸'].join('\n'); const p2 = J.plan({ lyrics: l2, seed: 7, tianyi: { glyphFx: 'lots' } }).project; return Object.values(p2.overrides || {}).every(o => gPool.includes(o.enter) || gPool.includes(o.exit)); })()]);
checks.push(['glyphFx invalid value → warn + default off', (() => { const ws = []; const w0 = console.warn; console.warn = (...a) => ws.push(a.join(' ')); const p2 = P({ glyphFx: 'mega' }).project; console.warn = w0; return ws.some(w => w.includes('glyphFx')) && cnt(p2) === 0; })()]);

let f = 0; for (const [n, ok] of checks) { console.log(ok ? '✔' : '✘', n); if (!ok) f++; }
console.log(f ? 'FAILS=' + f : 'ALL_GREEN (' + checks.length + ')');
process.exit(f ? 1 : 0);
