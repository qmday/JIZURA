/* ============================================================
   天依 fork — 94: 中文字体扩展 + 拆字（部件级）部件池 —— 纯数据层
   (contract: FORK_GUIDE.md — no upstream file is modified)

   字体：往 J.FONTS 注册 ty_* 键即可全链路接入，因为上游机制是：
     · faceOf(key)：键没有语言映射（J.LANG_FACES[*].map）时回退键自身的
       family —— 对中文字体正是想要的行为（简繁歌词都用字体本尊渲染）；
     · fontsOfPlan/ensureFonts：按 gf 规格逐 family 懒挂 Google Fonts
       stylesheet —— 新键在计划用到之前零成本，用到时自动加载；
     · おまかせ随机（08b_omakase）与 project.fonts（resolveStyle）都直接
       认 J.FONTS 键 —— 新键自动进入随机池与用户字体选择。
   gf 规格全部经 fonts.googleapis.com/css2 实测（2026-11），权重轴如下。
   简繁覆盖：SC 系字体简体全覆盖；LXGW WenKai TC 为繁体字形（简体缺字
   走 fb 回退链）。ZCOOL/Ma/Liu/Zhi/Long 系为 SC 字形，繁体缺字同样回退。

   拆字：上游 02_fonts.js 已有完整的 GlyphCache 连通域分解（把字形 alpha
   蒙版拆成笔画/部件/点，逐件独立飞行、碎裂、下落），并已内置大量部件级
   演出（assemble/爆散/崩落/…，见 pools）。本 fork 不新增渲染机制，只做
   配置化调度：J.TY.GLYPHFX 暴露部件键池 + 概率，93_sections 按 seed 概率
   把行级 enter/exit 覆盖注入拆字部件（用户手写永远优先）。
   ============================================================ */
(() => {
'use strict';

if (!J.FONTS) { console.warn('JIZURA fork: 94_fonts needs 02_fonts; skipped'); return; }
if (!J.TY) J.TY = {};                 // 90 未载入时的最小兜底（94 不依赖其内容）

const SANS_FB  = '"PingFang SC","Microsoft YaHei","Noto Sans CJK SC",sans-serif';
const SERIF_FB = '"Noto Serif SC","Songti SC","Noto Serif CJK SC",serif';

const F = (label, family, weight, kind, fb, gf) =>
  ({ label, family: `"${family}"`, weight, kind, fb, gf });

const FONTS = {
  /* —— 重判力 / 标题 —— */
  ty_heiti:    F('思源黑体 Black', 'Noto Sans SC', 900, 'gothic',  SANS_FB,  'Noto+Sans+SC:wght@900'),
  ty_songti:   F('思源宋体 Black', 'Noto Serif SC', 900, 'mincho',  SERIF_FB, 'Noto+Serif+SC:wght@900'),
  ty_huangyou: F('站酷庆科黄油体', 'ZCOOL QingKe HuangYou', 400, 'display', SANS_FB, 'ZCOOL+QingKe+HuangYou'),
  ty_kuaile:   F('站酷快乐体',   'ZCOOL KuaiLe', 400, 'round',   SANS_FB,  'ZCOOL+KuaiLe'),
  ty_xiaowei:  F('站酷小薇体',   'ZCOOL XiaoWei', 400, 'mincho',  SERIF_FB, 'ZCOOL+XiaoWei'),
  /* —— 手写 / 笔刷 —— */
  ty_wenkai:   F('霞鹜文楷（繁）', 'LXGW WenKai TC', 400, 'hand',  SERIF_FB, 'LXGW+WenKai+TC:wght@300;400;700'),
  ty_mashan:   F('马善政毛笔楷书', 'Ma Shan Zheng', 400, 'brush',  SERIF_FB, 'Ma+Shan+Zheng'),
  ty_liujian:  F('柳建毛草',     'Liu Jian Mao Cao', 400, 'brush', SERIF_FB, 'Liu+Jian+Mao+Cao'),
  ty_zhimang:  F('志莽行书',     'Zhi Mang Xing', 400, 'brush',   SERIF_FB, 'Zhi+Mang+Xing'),
  ty_longcang: F('龙藏手写',     'Long Cang', 400, 'hand',       SERIF_FB, 'Long+Cang'),
};
for (const [k, f] of Object.entries(FONTS)) if (!J.FONTS[k]) J.FONTS[k] = f;   // never overwrite an existing/user key

/* 拆字（部件级）演出池：全部是上游已注册的 enter/exit 键（uses J.glyphs pieceFns）。
   使用时仍按注册表逐键校验（不存在/ special 自动剔除 → 未来上游改名也安全）。 */
J.TY.GLYPHFX = {
  enter: ['assemble', 'crumple', 'windBlown', 'strokeOrder', 'xePieceRain', 'xePieceVortex', 'xePieceStrata', 'xePiecePile'],
  exit:  ['explode', 'fall', 'drift', 'dissolve', 'xhPieceStrata', 'xhPieceThin', 'xhPieceSpin', 'xhPieceHeap', 'xhPieceParts'],
  /* 命中概率（每行独立、seed 确定）：some = 点缀，lots = 大面积 */
  prob: {
    some: { enter: 0.3, exit: 0.22 },
    lots: { enter: 0.6, exit: 0.5 },
  },
};
})();
