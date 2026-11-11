#!/usr/bin/env node
/* ============================================================
   天依 fork — 歌词结构 / 情绪推荐 CLI（纯本地启发，无网络、无 AI 依赖；Node ≥16）
   ---------------------------------------------------------------------------
   用法：
     node tools/tyx_recommend.js auto  <lyrics.txt> [out_prefix]
       → 本地启发：重复块→副歌边界预测 + 10 套情绪模版打分
       → 写 <out_prefix>.annotated.txt（副歌行尾已加 `!`，可直接贴进 JIZURA 歌词框）
         和 <out_prefix>.report.json（建议明细 + 依据，供人审）
     node tools/tyx_recommend.js merge <ai.json> <lyrics.txt> [out_prefix]
       → 把你的 AI 工具产出的 JSON（schema 同 report.json 的 sections/moods 形状，
         每项必须带 basis 依据字段）与本地启发交叉验证：
         与启发一致的边界置信 +，不一致的标 humanReview=true。
   原则：工具只“建议”，永不直接改工程；人工确认后才贴进渲染（人审闭环）。
   `*词*` 强调留给 UI/手动（或 fork 92 的 tianyi.starWords 配置）。
   ---------------------------------------------------------------------------
   情绪模版 preset 键（与 fork/92_moods_tianyi.js 一一对应）：
     tysweet 甜系治愈 · tyblue 蓝调深情 · tynova 星空电子 · tyfire 热血燃
     tyspring 青春校园 · tyghost 黑化 · tywafolk 国风水墨 · tydream 空灵幻想
     tyidol 偶像应援 · tynight 深夜电台
   ============================================================ */
'use strict';
const fs = require('fs'), path = require('path');
const X = require(path.join(__dirname, '..', 'fork', '89_tyx_shared.js'));

function fail(msg) { console.error('tyx_recommend:', msg); process.exit(1); }

function readLines(file) {
  return fs.readFileSync(file, 'utf8').split(/\r?\n/).map(l => l.replace(/\r$/, ''));
}

/* ---------- similarity (char-set Jaccard; deterministic, no deps) ---------- */
function similarity(a, b) {
  if (!a || !b) return 0;
  const A = new Set(a), B = new Set(b);
  let inter = 0; for (const c of A) if (B.has(c)) inter++;
  return inter / (A.size + B.size - inter);
}

/* ---------- hook (副歌候选行) detection ----------
   一行在更早处出现过“几乎相同”的文本（Ban list strip 后 char 相似度 ≥0.85，
   长度≥2）→ 两行都是 hook。只认可验证的重复：宁少勿错。 */
function hookRows(lines) {
  const mask = lines.map(l => !String(l).trim() || X.isSectionMark(l) !== null || X.isInterludeRow(l));   // blank/标记/间奏行不参与
  const clean = lines.map(l => X.cleanLine(l));
  const hook = new Set();
  for (let i = 0; i < clean.length; i++) {
    if (mask[i] || clean[i].length < 2) continue;
    for (let j = 0; j < i; j++) {
      if (mask[j] || clean[j].length < 2) continue;
      if (clean[i] === clean[j] || similarity(clean[i], clean[j]) >= 0.85) { hook.add(i); hook.add(j); break; }
    }
  }
  return hook;
}

/* ---------- contiguous runs → chorus blocks ---------- */
function chorusBlocks(hook, lines) {
  const n = lines.length;
  const runs = [];
  let i = 0;
  while (i < n) {
    if (!hook.has(i)) { i++; continue; }
    let j = i; while (j + 1 < n && hook.has(j + 1)) j++;
    runs.push([i, j]);
    i = j + 1;
  }
  /* merge runs separated by ≤2 行（副歌内部常见 1~2 行非重复行/过渡行） */
  const merged = [];
  for (const r of runs) {
    const last = merged[merged.length - 1];
    if (last && r[0] - last[1] <= 3) last[1] = r[1];          // 间隔 ≤2~3 行视为同段副歌
    else merged.push([...r]);
  }
  return merged.filter(([s, e]) => e - s + 1 >= 2);                          // ≥2 行才算块
}

/* ---------- sections proposal（行号 = 原文行，含空行/标记行，人审可对照） ---------- */
function proposeSections(lines) {
  const n = lines.length;
  const blankOrMark = lines.map(l => !String(l).trim() || !!X.isSectionMark(l));
  const contentCount = t => { let c = 0; for (let i = t; i >= 0 && i < n; i++) if (!blankOrMark[i]) c++; return c; };
  const hook = hookRows(lines);
  const blocks = chorusBlocks(hook, lines);
  const sections = [];
  let cursor = 0;
  for (const [s, e] of blocks) {
    if (cursor < s) {
      const lead = contentCount(cursor) - contentCount(s);     // 内容行数（粗略，用于 intro/verse 判别）
      if (cursor === 0 && lead <= 4) sections.push({ type: 'intro', lineStart: cursor, lineEnd: s - 1 });
      else sections.push({ type: 'verse', lineStart: cursor, lineEnd: s - 1 });
    }
    sections.push({ type: 'chorus', lineStart: s, lineEnd: e });
    cursor = e + 1;
  }
  if (cursor < n) {
    const tail = contentCount(cursor) - contentCount(n);
    sections.push({ type: tail <= 3 ? 'outro' : 'bridge', lineStart: cursor, lineEnd: n - 1 });
  }
  return { sections, hook };
}

/* ---------- mood scoring (tiny lexicon, deterministic) ---------- */
function moodScores(lines, top = 3) {
  const score = new Map(Object.keys(X.MOOD_LEX).map(k => [k, 0]));
  const hits = new Map();
  for (const raw of lines) {
    if (X.isSectionMark(raw)) continue;
    for (const [mood, words] of Object.entries(X.MOOD_LEX)) {
      for (const w of words) {
        if (String(raw).includes(w)) {
          score.set(mood, score.get(mood) + (w.length >= 2 ? 2 : 1));
          if (!hits.has(mood)) hits.set(mood, []);
          if (hits.get(mood).length < 3) hits.get(mood).push(`“${w}”@${String(raw).slice(0, 14)}`);
        }
      }
    }
  }
  return [...score.entries()].sort((a, b) => b[1] - a[1]).slice(0, top)
    .map(([m, s]) => ({ preset: m, score: s, basis: (hits.get(m) || []).join(' | ') || '词表几乎未命中（中性倾向）' }));
}

/* ---------- annotate: bangs only (決めカット) ---------- */
function annotate(lines, sections, policy = 'ends') {
  const out = lines.slice();
  const bangRows = new Set();
  for (const sec of sections) {
    if (sec.type !== 'chorus') continue;
    const rows = [];
    for (let i = sec.lineStart; i <= sec.lineEnd; i++) if (X.isSectionMark(out[i]) === null && String(out[i] || '').trim()) rows.push(i);
    if (!rows.length) continue;
    if (policy === 'first') bangRows.add(rows[0]);
    else if (policy === 'all') rows.forEach(r => bangRows.add(r));
    else bangRows.add(rows[rows.length - 1]);               // 'ends'（默认）
  }
  for (const i of bangRows) {
    const row = out[i];
    if (/[!！]\s*$/.test(row.replace(/\|.*$/, '').trim())) continue;   // 已是決めCut
    const bar = row.indexOf('|');
    const cut = bar >= 0 ? row.slice(0, bar) : row, note = bar >= 0 ? row.slice(bar) : '';
    if (!cut.trim()) continue;                                       // 行为空/纯注释
    out[i] = cut.replace(/\s*$/, '') + '!' + note;
  }
  return out.join('\n');
}

/* ---------- AI schema check ----------
   ai.json: { schemaVersion:1,
              sections:[{type ∈ SECTION_TYPES, lineStart, lineEnd, basis}],
              moods:[{preset ∈ VALID_MOODS, basis}],
              bangs?:{policy ∈ off|first|ends|all} }        */
const VALID_MOODS = Object.keys(X.MOOD_LEX);
const VALID_TYPES_ARR = X.SECTION_TYPES;
function checkAI(obj, n) {
  const errs = [];
  if (!obj || typeof obj !== 'object') return ['not an object'];
  if (obj.schemaVersion !== 1) errs.push('schemaVersion must be 1');
  for (const [k, sec] of (obj.sections || []).entries()) {
    if (!X.SECTION_TYPES.includes(sec.type)) errs.push(`sections[${k}].type 无效`);
    if (!(Number.isInteger(sec.lineStart) && sec.lineStart >= 0 && sec.lineStart <= sec.lineEnd && sec.lineEnd < n)) errs.push(`sections[${k}] 行号越界`);
    if (!sec.basis) errs.push(`sections[${k}] 缺 basis（依据哪句歌词）`);
  }
  for (const [k, m] of (obj.moods || []).entries()) {
    if (!VALID_MOODS.includes(m.preset)) errs.push(`moods[${k}].preset 无效（合法键：${VALID_MOODS.join(',')})`);
    if (!m.basis) errs.push(`moods[${k}] 缺 basis`);
  }
  if (obj.bangs && !['off', 'first', 'ends', 'all'].includes(obj.bangs.policy)) errs.push('bangs.policy 无效');
  if (obj.sectionMoods != null) {
    if (!obj.sectionMoods || typeof obj.sectionMoods !== 'object' || Array.isArray(obj.sectionMoods)) errs.push('sectionMoods 必须是对象（sectionType → preset）');
    else for (const [t, p] of Object.entries(obj.sectionMoods)) {
      if (!VALID_TYPES_ARR.includes(t)) errs.push(`sectionMoods.${t} 不是段落类型`);
      if (!VALID_MOODS.includes(p)) errs.push(`sectionMoods.${t} 的 preset 无效`);
    }
  }
  return errs;
}

/* ---------- per-section mood suggestion（分段情绪：同类型 span 的行合并打分） ---------- */
function sectionMoodsSuggestion(lines, sections) {
  const byType = new Map();
  for (const s of sections) { if (!byType.has(s.type)) byType.set(s.type, []); byType.get(s.type).push(s); }
  const globalTop = moodScores(lines, 3);
  const map = {}, basis = {};
  for (const [type, secs] of byType) {
    const spanLines = [];
    for (const s of secs) for (let i = s.lineStart; i <= s.lineEnd; i++) spanLines.push(lines[i]);
    const scored = moodScores(spanLines, 3);
    map[type] = scored[0] && scored[0].score > 0 ? scored[0].preset : (globalTop[0] ? globalTop[0].preset : 'tyblue');
    basis[type] = scored[0] && scored[0].score > 0 ? scored[0].basis : '该段词表几乎未命中 → 回退全曲 Top1';
  }
  return { map, basis };
}

/* ---------- 可直接并入 JIZURA 工程文件（顶层 JSON）的 tianyi 配置片段 ---------- */
function projectFragment(sectionMoods, policy) {
  return { tianyi: {
    schemaVersion: 1, enabled: true,
    sections: 'auto', chorusBangs: policy,
    starWords: [], sectionMoods,
    _usage: '把 tianyi 对象并入你的 JIZURA 工程文件（项目另存的 JSON）顶层；sectionMoods 的段落建议见 report.sectionMoodsBasis，人工确认后再用。',
  } };
}

/* ---------- subcommands ---------- */
function sub_auto(args) {
  const [file, prefixIn] = args;
  if (!file) fail('usage: tyx_recommend auto <lyrics.txt> [out_prefix]');
  const lines = readLines(file);
  const { sections, hook } = proposeSections(lines);
  const moods = moodScores(lines);
  const policy = process.env.TYX_BANGS || 'ends';
  const prefix = prefixIn || file.replace(/\.[^.]+$/, '');
  fs.writeFileSync(prefix + '.annotated.txt', annotate(lines, sections, policy));
  const sectionMoods = sectionMoodsSuggestion(lines, sections);
  const report = {
    schemaVersion: 1, source: path.basename(file), bangs: { policy },
    sections: sections.map(s => Object.assign({}, s, { basis: heuristicBasis(s, hook) })),
    moods, sectionMoods: sectionMoods.map, sectionMoodsBasis: sectionMoods.basis,
    projectFragment: projectFragment(sectionMoods.map, policy),
    humanReview: true,
    note: '本地启发（离线保守）。人审 section 边界后把 annotated.txt 贴进 JIZURA；要更强的语义推荐走 merge 子命令。',
  };
  fs.writeFileSync(prefix + '.report.json', JSON.stringify(report, null, 2));
  console.log('sections:', sections.map(s => `${s.type}(${s.lineStart}..${s.lineEnd})`).join('  ') || '(no chorus detected)');
  console.log('moods  :', moods.map(m => `${m.preset}(${m.score})`).join('  '));
  console.log('sectionMoods:', Object.entries(sectionMoods.map).map(([t, p]) => `${t}=${p}`).join(' ') || '(no sections)');
  console.log('written:', prefix + '.annotated.txt + ' + prefix + '.report.json（含 projectFragment，可并入工程文件）');
}

function heuristicBasis(sec, hook) {
  if (sec.type === 'chorus') return `行 ${sec.lineStart}..${sec.lineEnd} 为相互重复块（hook 检测命中 ${sec.lineEnd - sec.lineStart + 1} 行中的重复链）`;
  if (sec.type === 'outro') return '距结尾 ≤3 行';
  if (sec.type === 'intro') return '首个重复块之前且 ≤4 行';
  if (sec.type === 'bridge') return '距结尾 ≥4 行的独有块';
  return '重复块之间的独有段落';
}

function sub_merge(args) {
  const [aiFile, lyricFile, prefixIn] = args;
  if (!aiFile || !lyricFile) fail('usage: tyx_recommend merge <ai.json> <lyrics.txt> [out_prefix]');
  const ai = JSON.parse(fs.readFileSync(aiFile, 'utf8'));
  const lines = readLines(lyricFile);
  const errs = checkAI(ai, lines.length);
  if (errs.length) fail('ai.json schema 不合：' + errs.join('；'));
  const local = proposeSections(lines);

  const crossOK = (s) => local.sections.some(l => l.type === s.type &&
    Math.min(l.lineEnd, s.lineEnd) >= Math.max(l.lineStart, s.lineStart));
  const sections = (ai.sections || []).map(s => Object.assign({}, s, { crossCheck: crossOK(s) ? 'agree' : 'humanReview' }));
  const flagged = sections.filter(s => s.crossCheck === 'humanReview').length;

  const policy = (ai.bangs && ai.bangs.policy) || 'ends';
  const prefix = prefixIn || lyricFile.replace(/\.[^.]+$/, '');
  fs.writeFileSync(prefix + '.annotated.txt', annotate(lines, sections, policy));
  const sectionMoods = ai.sectionMoods || sectionMoodsSuggestion(lines, local.sections).map;
  const report = {
    schemaVersion: 1, source: path.basename(lyricFile), aiSource: path.basename(aiFile), bangs: { policy },
    sections, moods: ai.moods || [], localSections: local.sections,
    sectionMoods, sectionMoodsSource: ai.sectionMoods ? 'ai' : 'local-heuristic',
    projectFragment: projectFragment(sectionMoods, policy),
    humanReview: true,
    note: 'AI 语义建议为主，本地重复性启发交叉验证。crossCheck=humanReview 的段落请人工确认后再贴进 JIZURA。',
  };
  fs.writeFileSync(prefix + '.report.json', JSON.stringify(report, null, 2));
  console.log(`merged：sections ${sections.length} 个，其中 ${flagged} 个待人工复核。sectionMoods: ` +
    Object.entries(sectionMoods).map(([t, p]) => `${t}=${p}`).join(' ') + ` (${report.sectionMoodsSource})`);
  console.log(`written: ${prefix}.annotated.txt + report.json（含 projectFragment，可并入工程文件）`);
}

/* ---- module surface (MCP / other tools require these; CLI still runs standalone) ---- */
if (require.main === module) {
  const [cmd, ...rest] = process.argv.slice(2);
  if (cmd === 'auto') sub_auto(rest);
  else if (cmd === 'merge') sub_merge(rest);
  else fail('usage: tyx_recommend <auto|merge> …（详见 docs/FORK_GUIDE.md §3）');
} else {
  /* in-process API: same engines the CLI uses, no files written */
  module.exports = {
    SECTION_TYPES: X.SECTION_TYPES,
    MOOD_LEX: X.MOOD_LEX,
    VALID_MOODS, VALID_TYPES_ARR,
    analyzeLyrics: (text) => {                      // lyrics string → full offline recommendation
      const rows = String(text || '').replace(/\r/g, '').split('\n').map(l => l.replace(/\r$/, ''));
      const { sections, hook } = proposeSections(rows);
      const moods = moodScores(rows);
      const policy = 'ends';
      const sm = sectionMoodsSuggestion(rows, sections);
      return {
        sections: sections.map(s => Object.assign({}, s, { basis: heuristicBasis(s, hook) })),
        moods, bangs: { policy }, sectionMoods: sm.map, sectionMoodsBasis: sm.basis,
        projectFragment: projectFragment(sm.map, policy), humanReview: true,
      };
    },
    mergeAI: checkAI,
    projectFragment,
    validateTianyi: (tianyiCfg) => {                // uses fork/90 in-memory
      const J90 = {};
      new Function('J', require('fs').readFileSync(path.join(__dirname, '..', 'fork', '90_config.js'), 'utf8'))(J90);
      const { cfg, warnings } = J90.TY.validate(J90.TY.migrate(tianyiCfg || {}));
      return { cfg, warnings };
    },
  };
}
