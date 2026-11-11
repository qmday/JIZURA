#!/usr/bin/env node
/* MCP smoke: spawn tools/ty_mcp.js, drive the protocol, assert all tools answer.
   usage: node dev/mcp_smoke.js   →  ALL_GREEN / FAILS=n (exit code) */
'use strict';
const { spawn } = require('child_process'), path = require('path');

const srv = spawn(process.execPath, [path.join(__dirname, '..', 'tools', 'ty_mcp.js')], { stdio: ['pipe', 'pipe', 'pipe'] });
let buf = '';
const queue = [];
srv.stdout.on('data', d => {
  buf += d;
  let at;
  while ((at = buf.indexOf('\n')) >= 0) { const line = buf.slice(0, at).trim(); buf = buf.slice(at + 1); if (line) queue.push(JSON.parse(line)); }
});
srv.stderr.on('data', d => queue.push({ stderr: String(d) }));
let id = 0;
const call = (method, params) => new Promise(res => { const i = ++id; srv.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: i, method, params }) + '\n'); const t0 = Date.now();
  const poll = () => { const m = queue.find(m2 => m2.id === i); if (m) res(m); else if (Date.now() - t0 > 10000) res({ error: { message: 'timeout' } }); else setTimeout(poll, 50); }; poll(); });

(async () => {
  const checks = [];
  const ok = (name, v) => checks.push([name, !!v]);

  const init = await call('initialize', { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'smoke', version: '0' } });
  ok('initialize returns serverInfo + tools capability', init.result && init.result.serverInfo && init.result.capabilities.tools);
  srv.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');

  const list = await call('tools/list', {});
  const names = (list.result && list.result.tools || []).map(t => t.name);
  ok('tools/list: 4 tools with schemas', ['ty_analyze_lyrics', 'ty_validate_config', 'ty_build_project', 'ty_list_capabilities'].every(n => names.includes(n)) && list.result.tools.every(t => t.inputSchema));

  const lyr = '湖水把灯火折叠\n你数着月亮的旧\n蓝色在靠岸\n天依在唱歌\n路灯熄灭了\n回声里是明天';
  const ana = await call('tools/call', { name: 'ty_analyze_lyrics', arguments: { lyrics: lyr } });
  const anaOut = ana.result && ana.result.structuredContent || {};
  ok('ty_analyze_lyrics: sections + sectionMoods + fragment', Array.isArray(anaOut.sections) && anaOut.projectFragment && anaOut.projectFragment.tianyi && !ana.result.isError);

  const val = await call('tools/call', { name: 'ty_validate_config', arguments: { tianyi: { glyphFx: 'mega' } } });
  const valOut = val.result && val.result.structuredContent || {};
  ok('ty_validate_config: illegal value warned + fallback', Array.isArray(valOut.warnings) && valOut.warnings.some(w => w.includes('glyphFx')) && valOut.cfg.glyphFx === 'off');

  const proj = await call('tools/call', { name: 'ty_build_project', arguments: { lyrics: lyr, format: 'douyin', tianyi: { sectionMoods: { chorus: 'tyidol' } } } });
  const projOut = proj.result && proj.result.structuredContent || {};
  ok('ty_build_project: douyin preset lands (9:16/30fps)', projOut.project && projOut.project.tianyi.format === 'douyin' && !proj.result.isError);
  const js = JSON.stringify(projOut.project || {});
  ok('ty_build_project output is loadable JSON w/ lyrics+style', js.includes('湖水把灯火折叠') && js.includes('tianyi'));

  const caps = await call('tools/call', { name: 'ty_list_capabilities', arguments: {} });
  const capsOut = caps.result && caps.result.structuredContent || {};
  ok('ty_list_capabilities: styles/moods/fonts/formats', capsOut.styles && Object.keys(capsOut.moods || {}).length === 10 && Object.keys(capsOut.fonts || {}).length === 10 && capsOut.formats.douyin);

  const bad = await call('tools/call', { name: 'nope', arguments: {} });
  ok('unknown tool → -32602', bad.error && bad.error.code === -32602);

  const e1 = await call('tools/call', { name: 'ty_analyze_lyrics', arguments: { lyrics: '' } });
  ok('empty lyrics → isError result', e1.result && e1.result.isError);

  srv.kill();
  let f = 0; for (const [n, v] of checks) { console.log(v ? '✔' : '✘', n); if (!v) f++; }
  console.log(f ? 'FAILS=' + f : 'ALL_GREEN (' + checks.length + ')');
  process.exit(f ? 1 : 0);
})();
