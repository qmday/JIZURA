/* ============================================================
   天依 fork — 89: shared constants between the browser hook (93) and the
   recommendation CLI (tools/tyx_recommend.js). UMD, zero dependencies.
   Single source of truth for the section-marker grammar and the mood lexicon.
   ============================================================ */
(() => {
'use strict';

/* section markers: lines like [intro] / [主歌] / [副歌1] / [桥段] that describe song
   structure. They are REMOVED from the lyrics before the upstream parser sees them
   (upstream would render unknown brackets as literal text). Interlude tags
   ([間奏][间奏][inst]…) stay with the upstream parser and are never stripped here. */
const SECTION_TYPES = ['intro', 'prechorus', 'chorus', 'bridge', 'verse', 'outro'];
const SECTION_LABEL = { intro: '前奏', prechorus: '导歌', chorus: '副歌', bridge: '桥段', verse: '主歌', outro: '尾声' };

const TAG_RULES = [
  /* [zhPrefixRe, enWholeRe, type] — type:null ⇒ 上游记法（间奏家族），永不剥离 */
  [/^(間奏|间奏|interlude|instrumental|inst|간주)/, /^$/, null],
  [/^(前奏|开头|开场)/,                            /^(intro|opening)\s*\d*$/,               'intro'],
  [/^(导歌|预副歌)/,                               /^(prechorus|pre-?chorus|build)\s*\d*$/, 'prechorus'],
  [/^(副歌)/,                                      /^(chorus|refrain|hook|drop)\s*\d*$/,    'chorus'],
  [/^(桥)/,                                        /^bridge\s*\d*$/,                        'bridge'],
  [/^(主歌)/,                                      /^verse\s*\d*$/,                         'verse'],
  [/^(尾声|结尾)/,                                 /^(outro|ending|out)\s*\d*$/,            'outro'],
];
const matchTag = tag => {
  const s = String(tag || '').trim().toLowerCase();
  for (const [zhRe, enRe, type] of TAG_RULES) {
    if (zhRe.test(s) || enRe.test(s)) return type;               // matched: null ⇒ not ours, else its section type
  }
  /* a/b/c/d 段 · 中文段落别名: 主歌 a段, 导歌 b段, 副歌 c段, 桥段 d段 */
  const seg = s.match(/^(a|b|c|d)段$/);
  return seg ? { a: 'verse', b: 'prechorus', c: 'chorus', d: 'bridge' }[seg[1]] : null;
};
const isSectionMark = lineText => {
  const s = String(lineText || '').replace(/^\s*\[\s*\d+:\d+(?:[.:]\d+)?\]\s*/, '');   // strip a leading LRC tag
  const m = s.match(/^\[\s*([^\[\]]{1,12})\s*\]$/);
  if (!m) return null;
  const type = matchTag(m[1]);
  return type ? { type, tag: m[1].trim() } : null;   // unknown brackets → not ours, upstream keeps them verbatim
};

/* the lyric cleaner used by the heuristics: strip LRC tags + upstream notation */
const cleanLine = lineText => String(lineText || '')
  .replace(/^\s*\[\s*\d+:\d+(?:[.:]\d+)?\]\s*/g, '')
  .replace(/\*([^*]+)\*/g, '$1')
  .replace(/[!！]+\s*$/g, '')
  .replace(/\|.*$/, '')
  .replace(/[\s、。，．,.!！?？…・「」『』（）()"'“”‘’~〜ー―\-—_]/g, '');

/* tiny zh mood lexicon → preset weights (space-separated tokens, one string per preset).
   Tokens are matched by "line contains token"; 1-char tokens match anywhere, longer
   tokens match as substrings. Deliberately small: real recommends come from the AI
   bridge, this just seeds the first guess offline. */
const MOOD_LEX = {
  tysweet:  ['甜', '糖', '笑', '喜欢你', '宠', '温柔', '可爱', '心动', '少女', '糖果', '奶茶', '咕', '心跳', '恋', '今天', '呀'],
  tyblue:   ['蓝', '天依', '想你', '等', '湖', '水', '泪', '相思', '沉默', '停止', '遥', '波纹', '眼神', '深深的', '别走', '回来', '留'],
  tynova:   ['星', '电子', '光', '夜空', '信号', '引力', '数据', '雷达', '幻', '湛蓝', '飞行', '磁', '脉冲', '失联', '巡航', '轨道'],
  tyfire:   ['火', '燃', '战', '闯', '烈', '雷', '怒', '醒', '冲', '吼', '破', '决', '命', '势', '唤醒', '咆哮', '生死'],
  tyspring: ['青春', '校园', '樱', '操场', '教室', '单车', '蝉', '夏日', '奔跑', '明天', '少年', '街道', '清爽', '课本', '起风', '走吧'],
  tyghost:  ['黑', '暗', '镜', '影', '坏', '谎', '咒', '冷', '蚀', '空壳', '无声', '崩溃', '裂缝', '嘲弄', '沉沦', '枷锁', '崩坏'],
  tywafolk: ['洛水', '华夏', '墨', '长', '长安', '古', '琴', '弦', '青砖', '折扇', '灯', '扇', '山水', '诗', '云袖', '翩翩', '宫商'],
  tydream:  ['梦', '泡', '云雾', '倒影', '漂', '潮', '羽', '蝶', '鳞', '蜃楼', '浮', '幽', '湖面', '涟', '光斑', '呼吸'],
  tyidol:   ['应援', '舞台', '告白', '麦克风', '欢呼', '光芒', '掌声', '奶油', '打卡', '亮起', 'WOW', '灯光', '打call', '偶像', '出道'],
  tynight:  ['深夜', '电台', '凌晨', '微', '失眠', '雾', '旧城', '熄灭', '缱', '夜', '倦', '晚风', '路灯', '落单', '无人', '入睡'],
};

const isInterludeRow = row =>
  /^\s*\[\s*(?:\d+:\d+(?:[.:]\d+)?\]\s*)?\[?\s*(間奏|间奏|interlude|instrumental|inst|간주)/i.test(String(row || ''));

const api = { SECTION_TYPES, SECTION_LABEL, matchTag, isSectionMark, isInterludeRow, cleanLine, MOOD_LEX };
if (typeof module !== 'undefined' && module.exports) module.exports = api;
(typeof window !== 'undefined' ? window : globalThis).JTYX = api;
})();
