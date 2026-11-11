# 天依 fork — 开发进度与维护日志

> 仓库：qmday/JIZURA（分支 `tianyi`）· 上游：852wa/JIZURA（MIT）
> 维护文档见 `FORK_GUIDE.md`（架构/铁律/门禁/边界），本文只记"做到哪了、怎么跑"。

## 状态总览（2026-11-11）

| 项 | 状态 |
|---|---|
| 版本 | v0.2.0 |
| 分支 | `tianyi`（`main` 与上游保持同步干净） |
| 线上 | https://qmday.github.io/JIZURA/zh-hans/ （Pages 由 tianyi 分支服务） |
| CI | guard.yml 全绿（语法/确定性守卫/构建/产物断言/fork 单测/CLI 冒烟） |
| 核心文件修改 | **0**（仅 build.py / dev/build_test.py 各 1 行 glob 注入，见 FORK_GUIDE §1） |
| 回归 | mini-host 27 项全绿（`node dev/fork_tests.js`）+ 无头 Chrome 真机 5 项全绿 |

## 交付时间线

| 日期 | commit | 内容 | 验收 |
|---|---|---|---|
| — | （初版） | fork 骨架、天依蓝调/夜航风格包、10 套情绪模版、推荐器 CLI、文档与 CI | mini-host 11 项 + 全语言构建 |
| — | （初版） | 结构记法钩子（标记剥离 / 決めCut / starWords / 桥段 hold） | 联画表真机验收 |
| — | `f1035c9` | **分段情绪 sectionMoods**：段类型→模版部件池→逐行 layout/enter/exit 覆盖（段内 sticky、用户逐键优先）；推荐器产出 `sectionMoods/Basis/projectFragment`；AI JSON 可直接携带（带校验） | mini-host 14 项 + guard 断言 |
| — | `bb958dc` | **中文字体 ×10（ty_\*）** + **拆字点缀 glyphFx**（off/some/lots，笔画分解部件池调度） | mini-host 27 项 + 真机 5 项（字体真加载、拆字落 cut、渲染零异常、off=original 逐位一致） |
| — | 本次 | **投稿格式预设 format**（douyin 9:16·30fps / bilibili）+ **MCP 服务器**（4 工具，零依赖离线） | mini-host 34 项 + MCP 冒烟 9 项 + 真机 7 项（含 9:16 渲染与 1080×1920 断言） |

> commit 日期以 `git log` 为准；本文按交付顺序记录。

## 已交付能力 ↔ 代码位置

| 能力 | 代码 | 配置入口 |
|---|---|---|
| 风格包 天依蓝调/夜航 | `fork/91_styles_tianyi.js` | 风格网格 |
| 10 套情绪模版 | `fork/92_moods_tianyi.js` | おまかせ / sectionMoods |
| 配置 schema/校验/迁移 | `fork/90_config.js`（`J.TY`） | `project.tianyi.*` |
| 结构记法钩子 | `fork/93_sections.js` | 歌词里写 `[主歌]` 等 |
| 分段情绪 | `fork/93_sections.js`（池在 92） | `"sectionMoods":{"verse":"tyblue"}` |
| 中文字体 ×10 | `fork/94_fonts_tianyi.js` | `"fonts":{"display":"ty_mashan"}` 或风格包抽取 |
| 拆字点缀 | `fork/94`（池）+ `fork/93`（调度） | `"glyphFx":"some"` |
| 投稿格式预设 | `fork/95_presets_tianyi.js` + `fork/93` | `"format":"douyin"` |
| MCP 服务器 | `tools/ty_mcp.js`（冒烟 `dev/mcp_smoke.js`） | Claude Desktop / Cursor 配置 |
| AI/离线推荐 | `tools/tyx_recommend.js` | `auto` / `merge` 子命令 |

## 命令速查（开发维护）

```bash
# fork 单测（34 项，无需浏览器；guard.yml 同款）
node dev/fork_tests.js

# MCP 服务器冒烟（stdio 协议 + 4 工具全通；guard.yml 同款）
node dev/mcp_smoke.js

# 完整构建（7 语言，fork 自动并入）
python3 tools/fork_build.py            # = build.py + fork 注入（不改核心文件）
python3 build.py                       # 仓库内此副本已打补丁，两者等价

# 隔离测试包（浏览器 QA 用）：core + 全部件包 → dev/www/t_<name>.{js,html}
python3 dev/build_test.py tianyi --all-packs

# 浏览器 QA 联画表（无头 Chrome 驱动脚本见下）
#   dev/www/ty_sheet.html          —— 多格联画表（決めCut/标记剥离/off 对比）
#   dev/www/ty_fonts_glyphs.html   —— ty 字体加载 + glyphFx 拆字 + off=original
#   两页分别引用 dev/www/jizura.js（整包，本地构建产物）与 t_tianyi.js（测试包）

# 推荐器（离线）
node tools/tyx_recommend.js auto fixtures/demo_lyrics.txt out_prefix
node tools/tyx_recommend.js merge ai.json fixtures/demo_lyrics.txt out2

# 上游同步（slow-safe）
git fetch upstream && git merge upstream/main   # 冲突只可能落在 build.py 补丁行
```

## 无头 Chrome 验收（真机回归怎么做）

1. `python3 dev/build_test.py tianyi --all-packs`
2. 本机起静态服务指向 `dev/www/`，用 CDP 打开 QA 页，等 9s（字体网络加载）
3. 读 `window.__QA`（页内断言数组）+ `document.title`（GREEN / PROBLEMS）
4. 页面自身把结果写进 `document.title` 与 `body` 文本——CI 外人工过目用

真机验收关注四件事：`ty_*` 字体经 Google Fonts 真实加载（`document.fonts.check`）、
拆字部件确实落在 cut 上（`c.enter/c.exit ∈ 池`）、渲染零异常（console 干净）、
`glyphFx:off` 与无 `tianyi` 的 plan 逐位一致（off=original 铁律）。

## 下一步（闸门见 FORK_GUIDE §6）

- [ ] **M3** 逐字 LRC / VSQX→LRC 工具（CLI 独立 + 渲染对照）
- [ ] **M4** 卡拉OK taste 部件包装（cost_scan 通过 + 无参降级测试）
- [ ] **M5** 本地素材（贴纸）decor 支持（与字体上传同失败路径）
- [ ] golden 回归脚本化（`dev/smoke_all.py` + playwright 进 CI，guard.yml 已留注释位）
- [ ] 用户真实歌词过一遍 `tyx_recommend auto`，校准情绪词表（89 纯数据，加词安全）
- [ ] 竖屏专项联画表（9:16 全部件过目，出竖屏观感分级清单；当前仅抽查主路径）
- [ ] MCP：`ty_build_project` 支持音频时间轴提示（BPM/offset 建议）

## 维护守则（3 条，违反即回退）

1. **核心文件 0 修改**——一切进 `fork/`，编号递增，纯数据文件不写控制流；
2. **off = original**——`tianyi.enabled:false` 或无配置时必须与上游逐位一致
   （每次改 93/94 后跑 `node dev/fork_tests.js`，里面有逐位断言）;
3. **fail-safe 降级**——钩子内任何异常只 console.warn + 回落上游 plan，绝不抛出。
