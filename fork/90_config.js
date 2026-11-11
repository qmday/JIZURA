/* ============================================================
   天依 fork — 90: config schema / validation.
   All config lives in one place: project.tianyi (upstream never reads it,
   so it is always safe to carry through project files).
   INVARIANT: with enabled:false (or config absent), J.plan output must be
   bit-identical to upstream. Guarded by dev/golden checks + smoke runs.
   ============================================================ */
(() => {
'use strict';

const SCHEMA_VERSION = 1;
const KEY = 'tianyi';

const DEFAULTS = Object.freeze({
  /* master switch — off ⇒ the fork contributes nothing at all */
  enabled: true,
  /* textual section marks ([主歌]/[副歌]…) recommended level: strip + apply bangs */
  sections: 'auto',           // 'off' | 'auto' (strip + bangs) | 'strong' (also per-section parts overrides)
  /* which "!" goes on chorus lines: 'off' | 'first' | 'ends' | 'all' */
  chorusBangs: 'ends',
  /* substring list wrapped into *词* for emphasis (max 8 words × 12 chars) */
  starWords: [],
  /* section type → mood preset key (fork/92): per-section part styling */
  sectionMoods: null,
  /* 拆字 accents: 'off' | 'some' | 'lots' — inject piece-based (glyph-decomposition)
     enter/exit overrides at seeded probability (pools + rates in fork/94) */
  glyphFx: 'off',
});

const SCHEMA = {
  enabled:      { type: 'bool',  affect: 'all' },        // 整体开关
  sections:     { type: 'enum',  values: ['off', 'auto', 'strong'], affect: 'planner' },
  chorusBangs:  { type: 'enum',  values: ['off', 'first', 'ends', 'all'], affect: 'planner' },
  starWords:    { type: 'words', max: 8, maxLen: 12, affect: 'planner' },
  sectionMoods: { type: 'map',   maxKeys: 6, affect: 'planner' },   // value-preset validated in 93 (needs J.MOODS loaded)
  glyphFx:      { type: 'enum',  values: ['off', 'some', 'lots'], affect: 'planner' },
};

/* validation: unknown keys are PRESERVED (kept as-is), illegal values fall back
   to the default values, every fallback emits a warning string */
function validate(cfgIn) {
  const warnings = [];
  const out = Object.assign({}, DEFAULTS);
  for (const [k, v] of Object.entries(Object(cfgIn) || {})) {
    const r = SCHEMA[k];
    if (!r) { continue; }                               // unknown key: preserved harmlessly, ignored by the fork
    if (r.type === 'bool') {
      if (typeof v === 'boolean') out[k] = v; else warnings.push(`tianyi.${k}: expected boolean, got ${typeof v}`);
    } else if (r.type === 'enum') {
      if (r.values.includes(v)) out[k] = v; else warnings.push(`tianyi.${k}: expected one of ${r.values.join('|')}`);
    } else if (r.type === 'words') {
      if (Array.isArray(v) && v.every(x => typeof x === 'string' && x.length > 0 && x.length <= r.maxLen)) out[k] = v.slice(0, r.max);
      else warnings.push(`tianyi.${k}: expected up to ${r.max} strings ≤ ${r.maxLen} chars`);
    } else if (r.type === 'map') {
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        const keys = Object.keys(v);
        const clean = {};
        for (const kk of keys.slice(0, r.maxKeys)) if (typeof v[kk] === 'string' && v[kk]) clean[kk] = v[kk];
        if (keys.length > r.maxKeys) warnings.push(`tianyi.${k}: >${r.maxKeys} entries, extra ignored`);
        if (Object.keys(clean).length) out[k] = clean;   // value checks (preset keys) happen in 93, where J.MOODS exists
      } else if (v !== null) warnings.push(`tianyi.${k}: expected an object (sectionType → preset)`);
    }
  }
  for (const k of Object.keys(SCHEMA)) if (out[k] === undefined) { out[k] = DEFAULTS[k]; warnings.push(`tianyi.${k}: missing → default`); }
  return { cfg: out, warnings };
}

/* migration chain (schemaVersion v1): add one pure function per schema bump, old→new */
const MIGRATIONS = [];
function migrate(cfgIn) {
  let cfg = Object.assign({}, Object(cfgIn) || {});
  const from = typeof cfg.schemaVersion === 'number' && cfg.schemaVersion >= 1 ? cfg.schemaVersion : 1;
  for (let v = from; v < SCHEMA_VERSION; v++) { if (typeof MIGRATIONS[v] === 'function') MIGRATIONS[v](cfg); }
  cfg.schemaVersion = SCHEMA_VERSION;
  return cfg;
}

J.TY = { SCHEMA_VERSION, KEY, DEFAULTS, SCHEMA, validate, migrate };
})();
