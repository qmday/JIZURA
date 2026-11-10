# 天依 fork — JIZURA 洛天依二开版（v0.1.0）

这是 [852wa/JIZURA](https://github.com/852wa/JIZURA)（MIT，浏览器字符 PV 引擎）的
洛天依主题二开版。核心文件 0 修改；所有新能力在 `fork/` 目录，删掉即完全回退上游。

## 在线使用

- **在线打开（GitHub Pages）**：https://qmday.github.io/JIZURA/ （日文首页）
- **简体中文版**：https://qmday.github.io/JIZURA/zh-hans/
- 其他语言：`en/`・`zh-hant/`・`ko/`・`id/`・`vi/`
- 本地：`git clone https://github.com/qmday/JIZURA.git` 后直接双击 `zh-hans/index.html`
  （需联网加载字体仓库；MP4 导出在浏览器内完成，不上传）

## 这个 fork 加了什么

| 能力 | 说明 |
|---|---|
| 🎨 风格包 `天依蓝调` / `天依夜航` | 天依蓝 `#66CCFF` × 应援灰 × 湖水光晕；夜航版加霓虹/弹幕感。风格网格最右侧 |
| 😊 10 套情绪模版 | 甜系治愈 / 蓝调深情 / 星空电子 / 热血燃 / 青春校园 / 黑化 / 国风水墨 / 空灵幻想 / 偶像应援 / 深夜电台（おまかせ可抽） |
| 🧩 结构记法 | 歌词里写 `[主歌]` `[副歌]` `[Bridge]` 等标记：标记行自动剥离、副歌落決めCut `!`、强模式下桥段收束 |
| 🤖 AI 语义推荐（用户侧） | `node tools/tyx_recommend.js auto 歌词.txt` 离线预测段落/情绪；或接你自己的 AI JSON 做交叉验证。带依据、人工确认后才用 |

配置都在工程文件的 `tianyi` 字段里（总开关 `enabled:false` 时与上游行为逐位一致）。

## 快速上手

1. 打开页面 → 风格网格选 **天依蓝调 / 天依夜航**；
2. 贴歌词（可带结构标记与 LRC 时间戳），按 `R` 换设计 / `D` 重抽 / `L` 锁行；
3. 合意的段落用行级覆盖微调，导出 MP4。

进阶（工程文件/配置/CI 门禁/给 LLM 的提示词模板/上游同步方法）：
**[`docs/FORK_GUIDE.md`](FORK_GUIDE.md)**。

## 与上游的关系

- 分支策略：`main` 与上游同步保持干净，二开发布在 `tianyi` 分支（页面也由它服务）；
- 同步：`git fetch upstream && git merge upstream/main` → 跑 `.github/workflows/guard.yml` 绿灯；
- 上游方针（无 AI、无联网）通过“AI 作为用户侧工具”满足，不往 renderer 里塞。

## 许可证

MIT（同上游 JIZURA）。洛天依名称/形象相关使用请遵循 Vsinger（上海禾念）二次创作条例。
