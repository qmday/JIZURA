# dev/www — 浏览器 QA 工具页

此目录的 bundle 产物（`*.js` 大文件）不进仓库，按需生成：

```bash
# 隔离测试包（core + 全部件包）→ t_tianyi.js / t_tianyi.html
python3 dev/build_test.py tianyi --all-packs

# 整包（本地重命名拷贝为 jizura.js 即可驱动 ty_sheet.html）
python3 tools/fork_build.py --dev
cp index.html dev/www/_full.html   # 或直接用页面浏览器打开仓库根 index.html
```

| 页面 | 驱动的 bundle | 用途 |
|---|---|---|
| `test.html` | `jizura.js` | 上游原版冒烟页 |
| `ty_sheet.html` | `jizura.js`（整包） | 多格联画表：決めCut / 标记剥离 / off=original 对比 |
| `ty_fonts_glyphs.html` | `t_tianyi.js`（测试包） | ty_* 字体真加载 + glyphFx 拆字渲染 + off=original 逐位断言；结果写入 `document.title`（GREEN/PROBLEMS）与 `window.__QA` |

无头验收流程与验收清单见 `docs/PROGRESS.md`「无头 Chrome 验收」。
