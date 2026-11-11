#!/usr/bin/env node
/* ============================================================
   天依 fork — MCP 服务器（用户侧工具，零依赖、完全离线）
   ============================================================
   方针合规：上游不收 AI/联网类改动（README「開発の方針」）——本服务器是
   **用户侧工具**：本地 stdio 进程，不进 renderer、不访问网络、不改工程。
   AI 客户端（Claude Desktop / Cursor 等）通过 MCP 连上来，得到的是
   「推荐 / 校验 / 生成工程片段」的能力，最终写不写、怎么用由人决定。

   接入（以 Claude Desktop 为例，claude_desktop_config.json）：
     "jizura-tianyi": {
       "command": "node",
       "args": ["/绝对路径/到/仓库/tools/ty_mcp.js"]
     }

   协议：MCP stdio 传输 = 换行分隔的 JSON-RPC 2.0（无 SDK 依赖，手写最小实现）。
   ============================================================ */
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const R = require(path.join(__dirname, 'tyx_recommend.js'));   // 推荐内核（模块模式，不写文件）

/* ---------- fork 数据（91/92/94/95 都是纯数据，stub J 即可读出） ---------- */
function forkData() {
  const J = { STYLES: {}, STYLE_ORDER: [], MOODS: {}, FONTS: {}, TY: {} };
  for (const f of ['91_styles_tianyi.js', '92_moods_tianyi.js', '94_fonts_tianyi.js', '95_presets_tianyi.js']) {
    new Function('J', fs.readFileSync(path.join(ROOT, 'fork', f), 'utf8'))(J);
  }
  return J;
}

const FORMATS = { auto: { label: '不动（用工程文件现有规格）' } };
const DATA = forkData();
for (const [k, v] of Object.entries(DATA.TY.FORMATS || {})) if (!k.startsWith('_')) FORMATS[k] = v;

const DEFAULT_PROJECT = { aspect: '16:9', res: 1080, fps: 24, seed: 20260922 };

/* ---------- tools ---------- */
const TOOLS = [
  {
    name: 'ty_analyze_lyrics',
    description: '离线分析中文歌词：检测段落结构（主歌/副歌/桥/尾声）、逐段情绪推荐（tyblue/tyidol 等 10 套模版）、決めCut 策略；输出可直接并入 JIZURA 工程文件的 tianyi 配置片段（projectFragment）。全部本地启发式，结果供人工确认。',
    inputSchema: {
      type: 'object', required: ['lyrics'],
      properties: {
        lyrics: { type: 'string', description: '歌词全文（纯文本或 LRC 时间戳行均可）' },
      },
    },
    run: (a) => {
      if (!a || typeof a.lyrics !== 'string' || !a.lyrics.trim()) throw new Error('lyrics 必填（非空字符串）');
      return R.analyzeLyrics(a.lyrics);
    },
  },
  {
    name: 'ty_validate_config',
    description: '校验一段 JIZURA 二开（tianyi）配置：schema 校验 + 非法值回退警告。返回清洗后的 cfg 与 warnings。',
    inputSchema: {
      type: 'object', required: ['tianyi'],
      properties: { tianyi: { type: 'object', description: 'project.tianyi 配置对象' } },
    },
    run: (a) => R.validateTianyi(a && a.tianyi),
  },
  {
    name: 'ty_build_project',
    description: '生成一份可直接保存/加载的 JIZURA 工程文件 JSON：给定歌词 + 可选 tianyi 配置 + 可选投稿格式（douyin=抖音竖屏 9:16·30fps / bilibili=横屏）。返回完整 project 对象与校验警告；用户确认后保存为 .json 在 JIZURA 页面加载。',
    inputSchema: {
      type: 'object', required: ['lyrics'],
      properties: {
        lyrics: { type: 'string' },
        tianyi: { type: 'object', description: '可选：手写的 tianyi 配置（会先校验）' },
        format: { type: 'string', enum: Object.keys(FORMATS), description: '投稿格式预设' },
        seed: { type: 'integer', description: '可选：随机种子（不填用默认）' },
      },
    },
    run: (a) => {
      if (!a || typeof a.lyrics !== 'string' || !a.lyrics.trim()) throw new Error('lyrics 必填（非空字符串）');
      let tianyi = {};
      let warnings = [];
      if (a.tianyi != null) { const v = R.validateTianyi(a.tianyi); tianyi = v.cfg; warnings = v.warnings; }
      if (a.format && FORMATS[a.format]) tianyi = Object.assign({}, tianyi, { format: a.format });
      const { cfg, warnings: w2 } = R.validateTianyi(tianyi); warnings = warnings.concat(w2);
      const project = Object.assign({}, DEFAULT_PROJECT, {
        lyrics: a.lyrics, tianyi: cfg, style: 'tianyi',
      });
      if (Number.isInteger(a.seed)) project.seed = a.seed;
      return { project, warnings, next: '确认后保存为 .json → JIZURA 页面「読み込み/加载」导入 → 选风格/微调 → MP4 导出' };
    },
  },
  {
    name: 'ty_list_capabilities',
    description: '列出本 fork 的能力清单：天依风格包、10 套情绪模版、中文字体（ty_*）、拆字演出池、投稿格式预设。用于 deciding 用哪些配置。',
    inputSchema: { type: 'object', properties: {} },
    run: () => ({
      styles: Object.fromEntries(DATA.STYLE_ORDER.filter(k => DATA.STYLES[k]).map(k => [k, DATA.STYLES[k].name])),
      moods: Object.fromEntries(Object.keys(DATA.MOODS).map(k => [k, DATA.MOODS[k].name || k])),
      fonts: Object.fromEntries(Object.entries(DATA.FONTS).filter(([k]) => k.startsWith('ty_')).map(([k, f]) => [k, f.label])),
      glyphFx: { modes: ['off', 'some', 'lots'], enter: DATA.TY.GLYPHFX.enter, exit: DATA.TY.GLYPHFX.exit },
      formats: Object.fromEntries(Object.entries(FORMATS).map(([k, v]) => [k, v.label])),
      configKeys: ['enabled', 'sections', 'chorusBangs', 'starWords', 'sectionMoods', 'glyphFx', 'format'],
    }),
  },
];

/* ---------- minimal JSON-RPC / MCP stdio loop ---------- */
const VERSION = '0.2.0';
const SERVER_INFO = { name: 'jizura-tianyi', version: VERSION };

function reply(id, result) { if (id !== undefined) process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, result }) + '\n'); }
function replyErr(id, code, message) { if (id !== undefined) process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, error: { code, message } }) + '\n'); }

function handle(msg) {
  const { id, method, params } = msg || {};
  try {
    if (method === 'initialize') {
      return reply(id, {
        protocolVersion: (params && params.protocolVersion) || '2024-11-05',
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
      });
    }
    if (method === 'ping') return reply(id, {});
    if (method === 'tools/list') {
      return reply(id, { tools: TOOLS.map(t => ({ name: t.name, description: t.description, inputSchema: t.inputSchema })) });
    }
    if (method === 'tools/call') {
      const tool = TOOLS.find(t => t.name === (params || {}).name);
      if (!tool) return replyErr(id, -32602, `unknown tool: ${params && params.name}`);
      try {
        const out = tool.run(params.arguments || {});
        return reply(id, { content: [{ type: 'text', text: JSON.stringify(out, null, 2) }], structuredContent: out });
      } catch (e) {
        return reply(id, { content: [{ type: 'text', text: 'ERROR: ' + (e && e.message) }], isError: true });
      }
    }
    if (id !== undefined) return replyErr(id, -32601, `method not found: ${method}`);
    /* notification (e.g. notifications/initialized) → no reply */
  } catch (e) {
    replyErr(id, -32603, 'internal: ' + (e && e.message));
  }
}

let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => {
  buf += chunk;
  let at;
  while ((at = buf.indexOf('\n')) >= 0) {
    const line = buf.slice(0, at).trim(); buf = buf.slice(at + 1);
    if (!line) continue;
    let msg; try { msg = JSON.parse(line); } catch (e) { replyErr(null, -32700, 'parse error'); continue; }
    handle(msg);
  }
});
process.stdin.on('end', () => process.exit(0));
/* keep alive quietly; log nothing to stdout except protocol replies */
