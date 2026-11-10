/* ============================================================
   天依 fork — 93: J.plan hook 「结构记法 → 整体安排」 (contract: FORK_GUIDE.md)

   投入口（写在歌词文本里，一行一个）：
     [前奏]/[Intro]  [主歌]/[Verse 1]  [导歌]/[Pre]  [副歌]/[Chorus 2]  [桥]/[Bridge]  [尾声]/[Outro]
     [间奏 8] 交给上游 parser，本 fork 不碰。
   规则（由 project.tianyi 配置，见 90_config.js）：
     · 标记行被剥离（上游会把未识别的 [] 行当文字渲染，剥离是纯收益）；
     · chorus 段按 chorusBangs 在行尾补成願めCut `!`（off/first/ends/all）；
     · starWords 里的词包成 *词*（上游行级 emph 语法）；
     · sections:'strong' 时桥段行在用户未指定时给 hold:'still'。
   安全性 / 不出问题契约：
     · 只有 project.tianyi 存在且 enabled !== false 才介入——无 opt-in ⇒ 与上游逐位一致；
     · 不写用户 project：全部变换发生在浅拷贝上（只替换 lyrics/overrides/tianyi 三个键）；
     · 用户已写的每行 overrides 永远优先（只填缺口，不覆盖）；
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
  if (/[!！]\s*$/.test(cut)) return null;                       // 已是願めCut → 无需重复
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
  /* chorus bangs + strong-mode hold */
  const ovAdds = new Map();                                     // original row → {} ov additions
  if (cfg.sections !== 'off') {
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
      if (!content.length) continue;
      if (sp.type === 'chorus' && cfg.chorusBangs !== 'off') {
        const pick = cfg.chorusBangs === 'all' ? content : cfg.chorusBangs === 'first' ? [content[0]] : [content[content.length - 1]];
        for (const ri of pick) if (!replacements.has(ri)) { const r2 = addBang(rows[ri]); if (r2 != null) { replacements.set(ri, r2); changed = true; } }
      } else if (sp.type === 'bridge' && cfg.sections === 'strong') {
        for (const ri of content) {
          if (isInterlude(rows[ri])) continue;
          const li = linesAt[ri], cur = (project.overrides || {})[li];
          if (cur && cur.hold != null) continue;                // 用户已写 hold → 用户赢
          ovAdds.set(li, { hold: 'still' });
        }
      }
    }
  }
  if (!changed && !ovAdds.size) return project;

  /* assemble new text: strip marker rows themselves (they were never kept rows) */
  const out = [];
  rows.forEach((row, ri) => { if (!marks.some(mk => mk.ri === ri)) out.push(replacements.get(ri) ?? row); });
  const newText = out.join('\n');
  if (newText === lyrics && !ovAdds.size) return project;

  /* ov merge: user keys win; never touch rows the user already set */
  let ov = project.overrides;
  if (ovAdds.size) {
    ov = Object.assign({}, (project.overrides && typeof project.overrides === 'object') ? project.overrides : {});
    for (const [li, add] of ovAdds) {
      const cur = (project.overrides || {})[li];
      ov[li] = Object.assign({}, cur || {}, add);               // add fills gaps; user keys already checked above
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
