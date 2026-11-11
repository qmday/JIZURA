# 天依 fork 工程指南（FORK GUIDE）

> 目标读者：未来接手这份二开的你（或任何协作者）。
> 项目策略：**开发可以慢，但每一步必须可回退、可审查、不出问题。**
> 上游：https://github.com/852wa/JIZURA（MIT）。fork 目录 `fork/`、工具 `tools/`、
> 文档 `docs/`、fixture `fixtures/` 均为二开新增；除 `build.py`/`dev/build_test.py`
> 各 1 行注入外，**核心文件 0 修改**。

------------------------------------------------------------

## 0. 三条铁律（先读，后面每一条设计都是它们的推论）

1. **off = original**：`project.tianyi` 不存在或 `enabled:false` 时，`J.plan` 输出必须
   与上游逐位一致。任何新配置项都必须通过同一条断言：`!"新配置 → 同 seed plan 不变"`。
2. **配置优于代码**：一切可调的东西写成数据（style/mood 包、schema、词表），
   部件行为留在注册表条目内，不给核心路径加 `if (tianyi)` 分支。
3. **失败即降级**：任何 fork 代码异常 → `console.warn` + 原样走上游（93 的
   fail-safe 模式）。新输入源（LRC/AI JSON/贴纸）一律 “校验失败→回退默认→警告”，
   不抛到 UI。

## 1. 文件地图与加载顺序

构建时 `sources = sorted(glob('src/*.js')) + sorted(glob('fork/*.js'))`，
fork 文件全部在 12 个核心文件之后执行（编号 89 起，晚于上游一切）：

| 文件 | 职责 | 依赖 |
|---|---|---|
| `fork/89_tyx_shared.js` | 结构记法语法 + 情绪词表的**单一来源**（UMD：浏览器 + Node CLI 双用） | 无 |
| `fork/90_config.js` | `project.tianyi` 配置 schema / 校验 / 迁移（`J.TY`） | 无 |
| `fork/91_styles_tianyi.js` | 风格包 `tianyi`（天依蓝调）/ `tianyiNight`（天依夜航），纯数据 | 无 |
| `fork/92_moods_tianyi.js` | 10 套情绪模版（`J.MOODS.ty*`），纯数据，只引用已存在的部件键 | `91`（样式名） |
| `fork/93_sections.js` | `J.plan` 外包裹钩子：结构记法 → `!` / `*词*` / 桥段 hold / 分段情绪 / 拆字点缀，fail-safe | `89` + `90`（+`94` 的池） |
| `fork/94_fonts_tianyi.js` | 中文字体 `ty_*`（纯数据进 `J.FONTS`）+ 拆字部件池 `J.TY.GLYPHFX` | `02_fonts`（目录对象） |

约定：新增某个类型的 fork 文件时，编号前缀保持递增；91+ 的纯数据文件不要引入
控制流；一切共享常量先进 89，禁止在 90+ 里重复字面量。

## 2. 配置层级（cascade）

```
上游默认  ←  project.tianyi（fork 配置）  ←  project.overrides[li]（行级手动）
                                                      ↑ 永远最高优先
```

`project.tianyi` 全部字段见 `90_config.js` SCHEMA：

```jsonc
"tianyi": {
  "schemaVersion": 1,
  "enabled": true,          // 总开关；false 时与上游逐位一致
  "sections": "auto",       // off | auto（剥离标记 + 決め） | strong（桥段 hold 收束）
  "chorusBangs": "ends",    // off | first | ends | all —— 决めCut（!）落在副歌哪几行
  "starWords": ["路灯"],    // ≤8 个词：出现时自动包成 *词*（上游行级 emph 语法）
  "sectionMoods": {         // 分段情绪：段类型 → 情绪模版键（fork/92）
    "verse": "tyblue",      // 主歌 → 蓝调深情
    "chorus": "tyidol"      // 副歌 → 偶像应援
  },                        // 独立于 sections 开关；用户手写 overrides 逐键优先
  "glyphFx": "off"          // 拆字点缀: off | some | lots —— 按概率把行的
                            // enter/exit 换成笔画分解类演出（池见 fork/94）
}
```

- **未知键原样保留**（升级不丢数据）；**非法值回退默认 + 警告**（读到约束见 §3）。
- schemaVersion 递增时的迁移函数追加在 `90_config.js` MIGRATIONS 数组：一版一函数、
  旧→新单向、可单测。禁止在读取处写“临时兼容”。

## 3. 结构记法（喂给 93 钩子的方式）

直接写在歌词文本里，一行一个：

```
[前奏] [主歌] [导歌] [副歌] [桥段] [尾声]      中文（a段/b段/c段/d段 也行）
[Intro] [Verse 2] [Pre] [Chorus 2] [Bridge] [Outro]   英文（可带序号）
[间奏 8]  /  [00:35.20]歌词                    交给上游，fork 不动
```

规则：
- 我们识别的**记号行会被剥离**（上游会把未识别的 [] 当文字渲染，剥离是纯收益）；
  不认识的 `[...]` 原样保留（向上游语义）。
- `[间奏]` 家族属于上游 parser，fork 永不为它加 bang、也不计算它为段落内容。
- `!`（決めカット）必须落在正文尾部、`|注释` 之前 —— 93 的 `addBang` 已处理。

## 4. 门禁（CI 守卫，“不能出问题”的机械部分）

`.github/workflows/guard.yml`（放进你克隆仓库同路径）：
1. `node --check` 所有 fork/tools 文件；
2. fork 目录出现 `Math.random` 即失败（确定性 = 可golden测试的前提）；
3. `python3 build.py --dev` 完整构建 + 断言产物包含 fork 代码；
4. **`node dev/fork_tests.js`** —— mini-host 单测（27 项：记法钩子 / 分段情绪 /
   glyphFx / 字体注册 / off=original 逐位），无需浏览器，CI 与本地同一份；
5. 推荐器 CLI 用 `fixtures/demo_lyrics.txt` 冒烟（含 sectionMoods/projectFragment 断言）。

本地 QA 工具（真机过目用，`dev/www/`）：
- `dev/fork_tests.js`：纯 Node 单测（上游注册表用 stub 替身，逻辑层全覆盖）；
- `dev/www/ty_sheet.html`：多格联画表（決めCut / 标记剥离 / off 对比）；
- `dev/www/ty_fonts_glyphs.html`：ty 字体真加载 + glyphFx 拆字渲染 + off=original；
  两页引用的 bundle 用 `python3 dev/build_test.py tianyi --all-packs`（或整包
  `python3 tools/fork_build.py --dev` 后拷产物）生成。验收清单见 `PROGRESS.md`。

人工/重任务门（每个里程碑过了再进下一个，见 §6）：
- **联系表验收**：`python3 dev/build_test.py <pack> fork/11p_<pack>.js` +
  `dev/pack_sheet.py` 渲染表逐一过目（新部件时）。
- **黄金回归（M2 引入）**：固定 seed 列表导出 plan JSON 做基线；fork 配置全关
  时与上游 plan 逐位 diff。建议用上游导出的“构成数据 JSON”做基线文件。

## 5. 上游同步（slow-safe 合并策略）

```
git remote add upstream https://github.com/852wa/JIZURA.git
git fetch upstream && git merge upstream/main
```

- 因为核心文件 0 修改（除 2 个 1 行注入），预期 merge 几乎总是干净；
- merge 后跑 guard 全套 → 绿灯才算完成同步；
- 上游策略提醒：官方不会收 AI/联网类 PR（README「開発の方針」），所以本 fork 的
  AI 桥接必须保持 **用户侧工具** 形态（§7），不要说服自己往 renderer 里塞。
- JIZURA 的 “追加分/extra2/和風” 三道随机过滤（`11q_sets.js`）是行为契约：
  fork 包**不要**仿造这些 flag 的旁路。我们风格包选择不设 extra，是有意的
  （天依风格常驻），如果之后想让它跟随“追加分”开关，给 style 补
  `extra: true` 一行即可（173 行的说明见上游 11q_sets）。

## 6. 里程碑（已排好闸门）

| # | 内容 | 闸门 | 状态 |
|---|---|---|---|
| M0 | fork 骨架 + guard CI | `build.py` 注入 & 构建绿 | ✅ 本次交付 |
| M1 | 天依风格包/情绪模版（纯数据） | 渲染冒烟 + bundle grep 命中 | ✅ 本次交付（待人工过目联系表） |
| M2 | 配置 schema + 记法钩子 | §3 全通路单测 + §4 黄金回归脚本化 | ✅ 单测已过（mini host 27 项，`dev/fork_tests.js`），golden 待接 |
| M2.5 | 分段情绪 sectionMoods + 推荐器打通（计划外加餐） | mini-host 14→14 项全绿 + guard 断言 | ✅ 交付 |
| M2.6 | 中文字体 ×10（ty_*）+ 拆字点缀 glyphFx（计划外加餐） | mini-host 27 项全绿 + 无头 Chrome 真机 5 项全绿 | ✅ 交付 |
| M3 | 逐字 LRC / VSQX→LRC 工具 | CLI 独立 + 渲染对照 | 待做 |
| M4 | 卡拉OK taste 部件包装 | cost_scan 通过 + 无参降级测试 | 待做 |
| M5 | 本地素材（贴纸）decor 支持 | 与同路径字体上传相同的失败路径测试 | 待做（上游不收，纯 fork） |

## 7. AI 语义桥（“根据歌词给推荐”，政策友好版）

**定位**：AI 不进 renderer、不联网、不自动落盘 —— 推荐永远以“建议 JSON + 人工
确认”闭环。上游方针写明“用户自己让 AI 读 JIZURA 属于用户判断”，本桥即该用法。

### 7.1 推荐器（纯离线启发，`tools/tyx_recommend.js`）
```
node tools/tyx_recommend.js auto  歌词.txt            # 重复块→副歌边界 + 情绪模版 Top3
node tools/tyx_recommend.js merge ai.json 歌词.txt    # AI 建议 × 本地启发交叉验证
```
- 输出 `<prefix>.annotated.txt`（副歌行尾已加 `!`，直接贴进 JIZURA 歌词框）+
  `<prefix>.report.json`（全部建议都带 **basis 依据**，供人审）。
- AI JSON 必为 `merge` 子命令的输入，schema 见该文件头注释；缺 basis 直接拒不采纳。

### 7.2 给任意 LLM 的提示词模板（把歌词粘给它）
```
你是中文 V 家 PV 结构导演。歌词如下（行号从 0 起，空行也算行）。
请输出 JSON（且仅 JSON）：
  sections[]: {type: intro|verse|prechorus|chorus|bridge|outro, lineStart, lineEnd, basis}
  moods[]:    {preset ∈ 所列模版，basis}——从这 10 个里选：
    tysweet 甜系治愈 / tyblue 蓝调深情 / tynova 星空电子 / tyfire 热血燃 /
    tyspring 青春校园 / tyghost 黑化 / tywafolk 国风水墨 / tydream 空灵幻想 /
    tyidol 偶像应援 / tynight 深夜电台
  bangs: {policy: off|first|ends|all}
要求：basis 必须引用具体歌词；重复段落视为 chorus 的证据要明说；
不要发明 schema 外的字段。输出前自查行号不越界。
```
产出 → `merge` 子命令 → `crossCheck=humanReview` 的段落人工复核 → 才使用。

（工具不调用任何接口；把歌词拿去你自己的 AI 工具属于你的行为。）

## 8. 已知边界（写下来比忘了好）

- `93` 的段→行号映射复刻了上游 parser 的 1:n 规则（LRC 多时间戳=多行、空行/无文本
  行=0、间奏=1）。上游若改 parser 记号行规则（例如接受更多拉丁标签），本表需重对
  —— 搜 `keptCount`。
- 情绪词表刻意很小（89 `MOOD_LEX`）：它的意义是“首猜”和“给 AI 的候选项清单”，
  不是权威判断。往里加词是安全的（纯数据），加 preset 键需与 92 联动。
- `annotate`（工具）与 93 都遵循“已有 `!` / 已有 `*` 的行不动”；`*` 记法不叠加
  是故意的（避免 `*a*b*c*` 嵌套歧义）。
- 桥段 `hold:'still'` 只在 strong 模式且用户未写该行 hold 时注入。
- **`!` 的決め等级**：`!` 永远生效——产生行级强调（flash 事件/enter 偏好）；但完整的
  キメ演出（強制 single cut、KIME 池 layout/enter 强制）在上游「統一感」开关
  （`project.unify`）开启时才生效，这是上游默认值如此，不是 fork 行为。
  依赖此文档做产品说明时记得带上这个前提。
- **sectionMoods 的表达范围**：它写的是行级 overrides（layout/enter/exit），所以
  段间"情绪差"来自版面/入出场/配色轮换；`fx`（glitch/motion 等区间）是上游全曲级
  配置，fork 不逐行伪造。用户的行级 overrides **逐键**优先（同键不覆盖，异键共存）。
  `tianyi.sectionMoods` 的值只认 fork/92 的 10 个 preset 键，未知值警告 + 跳过。
- **glyphFx 的语义分层**：用户手写 overrides > `glyphFx`（接管该行 enter/exit）>
  `sectionMoods`（版面/配色 + 入出场基线）> planner 随机。拆字不新增渲染机制——
  它调度的是上游 `J.glyphs` 连通域分解部件（池在 fork/94，使用时仍按注册表逐键
  校验，上游改名/移除会自动剔除并降级）。简笔字部件多、拆字效果好；连笔手写体
  （ty_mashan/ty_liujian 等）分解出的部件少，配合时效果偏整字飞行，属正常。
- **ty_* 字体的简繁覆盖**：SC 系（思源/站酷/马/柳/志/龙）简体全覆盖，繁体缺字
  走回退链（PingFang/思源等）；`ty_wenkai` 为繁体字形（LXGW WenKai TC）。繁体
  歌词建议主用 ty_wenkai/ty_songti/ty_heiti，其余按需。`gf` 规格改动需实测
  css2 API（attachFamily 失败会静默回退系统字体，不报错——验收时用
  `document.fonts.check` 确认）。
- demo 构建（`demo/index.html`）是简体中文版整包，字体仍取自 Google Fonts
  （离线打开时回退系统字体，见上游说明）。

— 天依 fork v0.1.0 · MIT（遵循上游 JIZURA 许可证）
