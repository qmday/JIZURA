/* ============================================================
   天依 fork — 93: J.plan hook 「结构记法 → 整体安排」 (contract: FORK_GUIDE.md)

   投入口（写在歌词文本里，一行一个）：
     [前奏]/[Intro]  [主歌]/[Verse 1]  [导歌]/[Pre]  [副歌]/[Chorus 2]  [桥]/[Bridge]  [尾声]/[Outro]
     [间奏 8] 交给上游 parser，本 fork 不碰。
   规则（由 project.tianyi 配置，见 90_config.js）：
     · 标记行被剥离（上游会把未识别的 [] 行当文字渲染，剥离是纯收益）；
     · chorus 段按 chorusBangs 在行尾补成決めCut `!`（off/first/ends/all）；
       ——注意：完整キメ演出需上游「統一感」(project.unify) 开启，off 时 `!` 仍为行级强调；
     · starWords 里的词包成 *词*（上游行级 emph 语法）；
     · sections:'strong' 时桥段行在用户未指定时给 hold:'still'；
     · sectionMoods: { verse:'tyblue', chorus:'tyidol' } —— 分段情绪：从各模版
       (fork/92) 的部件池为本段每行生成 layout/enter/exit 覆盖（段内 sticky、
       段间切换；独立于 sections 开关工作）；
     · glyphFx: 'off'|'some'|'lots' —— 拆字点缀：按 seed 概率把行的 enter/exit
       换成上游部件级演出（笔画分解飞行/碎裂，池见 fork/94）；开启时接管
       sectionMoods 的 enter/exit（版面/配色仍归段落情绪），用户手写仍最优先。
   安全性 / 不出问题契约：
     · 只有 project.tianyi 存在且 enabled !== false 才介入——无 opt-in ⇒ 与上游逐位一致；
     · 不写用户 project：全部变换发生在浅拷贝上（只替换 lyrics/overrides/tianyi 三个键）；
     · 用户已写的 overrides 逐键优先（只填缺口，不覆盖）；
     · 任何异常 → console.warn + 完整走原 J.plan（fail-safe）。
   ============================================================ */
(() => {
'use strict';

const X = (typeof JTYX !== 'undefined') ? JTYX : null;
if (!X || !J.TY) { console.warn('JIZURA fork: 93_sections needs 89_tyx_shared + 90_config; hook disabled'); return; }
const isInterlude = X.isInterludeRow;

/* ---- index mapping: replicate the upstream parser's row→plan-line 1:n shape ----
   LRC row with N timestamps → N plan lines；blank/无文本行 → 0；普通行 → 1。 */
const keptCount = rawRow => {
  let s = String(rawRow), n = 0, m;
  while ((m = s.match(/^\s*\[(\d+):(\d+(?:[.:]\d+)?)\]/))) { n++; s = s.slice(m[0].length); }
  s = s.trim();
  return s ? (n || 1) : 0;
};

/* 行尾补 bang —— 尊重上游记法窄缝：`!` 必须落在 note(|注释) 之前的正文尾部 */
const addBang = row => {
  let cut = row, note = '';
  const bar = row.indexOf('|');
  if (bar >= 0) { cut = row.slice(0, bar); note = row.slice(bar); }
  if (/[!！]\s*$/.test(cut)) return null;                       // 已是決めCut → 无需重复
  cut = cut.replace(/\s*$/, '');
  if (!cut) return null;                                        // 空白/纯注释行不补
  return cut + '!' + note;
};

const addStar = (row, word) => {
  if (row.indexOf('*') >= 0) return null;                       // 已有 emph 记法 → 不叠加，避免嵌套歧义
  const at = row.indexOf(word);
  if (at < 0) return null;
  return row.slice(0, at) + '*' + word + '*' + row.slice(at + word.length);
};

/* ---- sectionMoods：模版部件池 → 该段逐行覆盖（段内 sticky：小调色板轮换，气质一致） ----
   只引用上游已注册且非 special 的部件键；模版里不存在的键自然为空。 */
const MOOD_PARTS = ['layout', 'enter', 'exit'];                 // 本机制会写的键（逐键让位给用户）
const moodPalette = (preset, rng) => {
  const M = J.MOODS && J.MOODS[preset];
  if (!M) return null;
  const pool = (list, reg, n) => {
    const uniq = [...new Set(list || [])].filter(k => reg[k] && !reg[k].special);
    const out = [];
    while (out.length < Math.min(n, uniq.length)) { const k = rng.pick(uniq); if (!out.includes(k)) out.push(k); }
    return out;
  };
  return {
    layout: pool(M.layout, J.LAYOUTS || {}, 3),
    enter:  pool(M.enter,  J.ENTER   || {}, 2),
    exit:   pool(M.exit,   J.EXIT    || {}, 2),
  };
};

/* ---- glyphFx：拆字点缀（概率注入部件级 enter/exit；版面/配色不动） ----
   池与概率来自 fork/94（J.TY.GLYPHFX）。语义分层：用户手写 > glyphFx（接管
   enter/exit）> sectionMoods（版面+入出场基线）> planner 随机。seed 逐行确定。 */
function glyphFxPass(ovAdds, cfg, seed, linesAt, keptRow, rows, warns) {
  const G = J.TY && J.TY.GLYPHFX;
  const probs = G && G.prob && G.prob[cfg.glyphFx];
  if (!probs) return;
  const ok = (list, reg) => (list || []).filter(k => reg[k] && !reg[k].special);
  const ep = ok(G.enter, J.ENTER || {}), xp = ok(G.exit, J.EXIT || {});
  if (!ep.length && !xp.length) { warns.push('glyphFx: no piece part registered (upstream changed?)'); return; }
  for (const ri of keptRow) {
    if (isInterlude(rows[ri])) continue;
    const n = Math.max(1, keptCount(rows[ri]));
    for (let k = 0; k < n; k++) {
      const li = linesAt[ri] + k;
      const rng = J.rng(J.h(seed | 0, 707, li));
      const add = {};
      if (ep.length && rng.chance(probs.enter)) add.enter = rng.pick(ep);
      if (xp.length && rng.chance(probs.exit)) add.exit = rng.pick(xp);
      if (add.enter || add.exit) ovAdds.set(li, Object.assign({}, ovAdds.get(li) || {}, add));
    }
  }
}

/* returns a new project (shallow copy) or the ORIGINAL when nothing changed */
function transform(project, cfg) {
  const lyrics = project.lyrics;
  if (typeof lyrics !== 'string' || !lyrics) return project;

  const rows = lyrics.split(/\r?\n/);
  const marks = [];
  rows.forEach((row, ri) => {
    const m = X.isSectionMark(row);
    if (m) marks.push({ ri, ...m });
  });
  /* strip → kept rows; strip is unconditional once opted-in (upstream renders raw brackets) */
  let changed = marks.length > 0;
  const keptRow = [];                                           // keptRowIndex → original row index
  const linesAt = [];                                           // original row → first plan-line index
  let pi = 0;
  rows.forEach((row, ri) => {
    if (marks.some(mk => mk.ri === ri)) return;
    linesAt[ri] = pi;
    pi += keptCount(row);
    keptRow.push(ri);
  });

  const replacements = new Map();                               // original row index → new row text
  /* starWords (any section) */
  for (const w of cfg.starWords) {
    for (const ri of keptRow) {
      if (isInterlude(rows[ri])) continue;
      const next = addStar(rows[ri], w);
      if (next != null) { replacements.set(ri, next); changed = true; break; }
    }
  }
  /* chorus bangs + strong-mode hold + sectionMoods（三者共用同一份段落内容表） */
  const ovAdds = new Map();                                     // plan-line index → {} ov additions（跨机制合并）
  const warns = [];
  const spans = marks.map((m, i) => ({
    type: m.type, s: m.ri, e: (i + 1 < marks.length ? marks[i + 1].ri : rows.length),
  }));
  for (const sp of spans) {
    const content = [];
    for (let ri = sp.s + 1; ri < sp.e; ri++) {
      if (marks.some(mk => mk.ri === ri)) continue;
      if (isInterlude(rows[ri])) { if (content.length) break; continue; }   // 间奏结束该段；段首间奏只跳过
      if (!rows[ri].trim() || !keptCount(rows[ri])) continue;
      content.push(ri);
    }
    sp.content = content;
  }
  if (cfg.sections !== 'off') {
    for (const sp of spans) {
      const content = sp.content;
      if (!content.length) continue;
      if (sp.type === 'chorus' && cfg.chorusBangs !== 'off') {
        const pick = cfg.chorusBangs === 'all' ? content : cfg.chorusBangs === 'first' ? [content[0]] : [content[content.length - 1]];
        for (const ri of pick) if (!replacements.has(ri)) { const r2 = addBang(rows[ri]); if (r2 != null) { replacements.set(ri, r2); changed = true; } }
      } else if (sp.type === 'bridge' && cfg.sections === 'strong') {
        for (const ri of content) ovAdds.set(linesAt[ri], Object.assign({}, ovAdds.get(linesAt[ri]) || {}, { hold: 'still' }));
      }
    }
  }
  /* sectionMoods：独立于 sections 开关（标记行无条件剥离，不会残留到画面） */
  for (const [type, preset] of Object.entries(cfg.sectionMoods || {})) {
    if (!J.MOODS || !J.MOODS[preset]) { warns.push(`sectionMoods.${type}: unknown preset "${preset}"`); continue; }
    for (const sp of spans.filter(s => s.type === type)) {
      if (!sp.content.length) continue;
      const rng = J.rng(J.h(project.seed | 0, 40501, sp.s));
      const pal = moodPalette(preset, rng);
      if (!pal || !pal.layout.length) continue;
      sp.content.forEach((ri, i) => {
        const n = Math.max(1, keptCount(rows[ri]));
        for (let k = 0; k < n; k++) {
          const add = { layout: pal.layout[i % pal.layout.length] };
          if (pal.enter.length) add.enter = pal.enter[i % pal.enter.length];
          if (pal.exit.length) add.exit = pal.exit[i % pal.exit.length];
          const li = linesAt[ri] + k;
          ovAdds.set(li, Object.assign({}, ovAdds.get(li) || {}, add));
        }
      });
    }
  }
  glyphFxPass(ovAdds, cfg, project.seed, linesAt, keptRow, rows, warns);
  if (warns.length) console.warn('JIZURA fork tianyi', warns.join(' / '));
  if (!changed && !ovAdds.size) return project;

  /* assemble new text: strip marker rows themselves (they were never kept rows) */
  const out = [];
  rows.forEach((row, ri) => { if (!marks.some(mk => mk.ri === ri)) out.push(replacements.get(ri) ?? row); });
  const newText = out.join('\n');
  if (newText === lyrics && !ovAdds.size) return project;

  /* ov merge: 用户已写的键永远赢（逐键让位），未写的行/键由 fork 填充 */
  let ov = project.overrides;
  if (ovAdds.size) {
    ov = Object.assign({}, (project.overrides && typeof project.overrides === 'object') ? project.overrides : {});
    for (const [li, add] of ovAdds) {
      const cur = ov[li];
      const merged = Object.assign({}, add);
      if (cur && typeof cur === 'object') {
        for (const k of Object.keys(merged)) if (cur[k] != null) delete merged[k];   // user wins per key
        if (!Object.keys(merged).length) continue;
        ov[li] = Object.assign({}, cur, merged);
      } else {
        ov[li] = merged;
      }
    }
  }

  return Object.assign({}, project, {
    lyrics: newText,
    overrides: ov,
    tianyi: Object.assign({}, project.tianyi, J.TY.migrate(project.tianyi)),   // config provenance (harmless, unknown keys kept)
  });
}

/* ---- the wrap ---- */
if (!J.plan || J.plan.tianyiWrapped) { if (J.plan && J.plan.tianyiWrapped) return; console.warn('JIZURA fork: J.plan missing, hook disabled'); return; }
const origPlan = J.plan;
J.plan = function (project, audio) {
  if (!project || !project.tianyi || project.tianyi.enabled === false) return origPlan(project, audio);   // fast path = exact upstream behavior
  try {
    const { cfg, warnings } = J.TY.validate(J.TY.migrate(project.tianyi));
    if (warnings.length) console.warn('JIZURA fork tianyi config:', warnings.join(' / '));
    const p2 = transform(project, cfg);
    return origPlan(p2 || project, audio);
  } catch (e) {
    console.warn('JIZURA fork: sections hook skipped (fail-safe → upstream) :', e && e.message);
    return origPlan(project, audio);
  }
};
J.plan.tianyiWrapped = true;
})();
