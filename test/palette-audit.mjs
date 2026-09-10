/**
 * dsh-unknowcao-skin — palette audit.
 *
 * Loads the real client bundle in a stubbed browser (a fake `window.__ModuleLoader__`
 * and a fake `document`), captures the two things the skin actually produces — the
 * `SKIN_CSS` stylesheet and the `theme.overrideTokens` map — and then checks them
 * against the product's own token stylesheet.
 *
 * Why the stub instead of reading the source text: the client half is a
 * `__ModuleLoader__` bundle with no exports, so the only way to observe what it
 * installs is to run it. Running it also proves the bundle is loadable and that the
 * host contract (`id` = package name, factory returns a plugin) holds.
 *
 * Checks:
 *   1. loadable      — the bundle installs a <style> and registers a token layer
 *   2. colour sanity — every declared value parses (hex, with or without alpha)
 *   3. coverage      — every product static ramp and every hardcoded alias literal
 *                      is rebound (nothing is left at its cool blue-grey default)
 *   4. drift         — the 13 inline tokens vs what the ramps derive for the same
 *                      aliases (two sources of truth for one colour)
 *   5. contrast      — WCAG ratios for the text/surface pairs that matter,
 *                      light and dark
 *
 * Usage:
 *   node test/palette-audit.mjs [path/to/dsh-client-ui-theme/lib/client.js]
 *
 * The product side is optional: without it, checks 1, 2 and 4 still run and the rest
 * are reported as skipped.
 *
 * @module dsh-unknowcao-skin/test/palette-audit
 */

import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const PLUGIN = join(HERE, '..')

/** Default location of the product token stylesheet inside an installed profile. */
const DEFAULT_THEME = join(
  process.env.DSH_HOME ?? join(process.env.USERPROFILE ?? '', '.dsh'),
  'profiles/node_modules/@deepseek-ai/dsh-client-ui-theme/lib/client.js',
)

const results = []
const fail = (check, message) => results.push({ ok: false, check, message })
const pass = (check, message) => results.push({ ok: true, check, message })
const note = (check, message) => results.push({ ok: null, check, message })

/* ── 1. load the real bundle in a stubbed browser ─────────────────────────── */

/**
 * Execute the client bundle and capture what it installs.
 *
 * @returns the installed stylesheet text and the registered token map.
 */
async function loadBundle() {
  let definition
  const installed = []
  const registrations = []
  globalThis.window = { __ModuleLoader__: { load: (value) => { definition = value } } }
  // `document.title` is an accessor over the <title> element in a real browser, so a
  // write is only observable where the tab reads it if the stub models that element.
  // The product's AppFrame rewrites the property whenever the session title changes,
  // and the stub has to be able to play that write back to mean anything.
  const titleElement = { textContent: '' }
  globalThis.document = {
    head: { appendChild: (element) => { installed.push(element) } },
    createElement: () => ({ id: '', textContent: '', parentNode: null }),
  }
  Object.defineProperty(globalThis.document, 'title', {
    configurable: true,
    get: () => titleElement.textContent,
    set: (value) => { titleElement.textContent = String(value) },
  })
  // The bundle is side-effecting; importing it is the point.
  await import(pathToFileURL(join(PLUGIN, 'client.js')).href)
  if (definition === undefined) throw new Error('client.js never called window.__ModuleLoader__.load')
  if (definition.id !== 'dsh-unknowcao-skin') {
    throw new Error(`client bundle id is ${JSON.stringify(definition.id)}, expected the package name`)
  }
  // The kernel provides `react`. A shim is enough to observe what the brand layer
  // builds: createElement is inert until a renderer touches the element.
  const React = {
    createElement: (type, props, ...children) => ({ type, props: { ...(props ?? {}), children } }),
  }
  const plugin = definition.factory((name) => {
    if (name === 'react') return React
    throw new Error(`client bundle required unexpected module ${JSON.stringify(name)}`)
  })
  let tokens
  const effects = []
  const slots = {
    inject: (key, callback) => { callback(); return () => {} },
    register: (options, component) => { registrations.push({ key: options.name, component }); return () => {} },
  }
  plugin.apply({
    effect: (callback, label) => { effects.push({ label, dispose: callback() ?? (() => {}) }) },
    theme: { overrideTokens: (source, map) => { tokens = { source, map }; return () => {} } },
    slots,
  })
  const style = installed[0]
  if (style === undefined) throw new Error('client.js installed no stylesheet')
  return { css: style.textContent, styleId: style.id, tokens, effects, registrations, inject: plugin.inject, titleElement }
}

/* ── colour helpers ───────────────────────────────────────────────────────── */

const HEX = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i

/**
 * Parse `#rgb` / `#rgba` / `#rrggbb` / `#rrggbbaa` into channels plus alpha.
 *
 * @param {string} value - colour text.
 * @returns {{ r: number, g: number, b: number, a: number }} channels in 0-255 and alpha in 0-1.
 */
function parseColor(value) {
  const hex = value.trim()
  if (!HEX.test(hex)) throw new Error(`not a hex colour: ${JSON.stringify(value)}`)
  let body = hex.slice(1)
  if (body.length <= 4) body = [...body].map((c) => c + c).join('')
  const int = Number.parseInt(body.slice(0, 6), 16)
  return {
    r: (int >> 16) & 0xff,
    g: (int >> 8) & 0xff,
    b: int & 0xff,
    a: body.length === 8 ? Number.parseInt(body.slice(6, 8), 16) / 255 : 1,
  }
}

/** Composite a possibly translucent colour over an opaque backdrop. */
const over = (fg, bg) => ({
  r: fg.r * fg.a + bg.r * (1 - fg.a),
  g: fg.g * fg.a + bg.g * (1 - fg.a),
  b: fg.b * fg.a + bg.b * (1 - fg.a),
  a: 1,
})

/** WCAG 2.1 relative luminance. */
function luminance({ r, g, b }) {
  const channel = (v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

/** WCAG 2.1 contrast ratio between two opaque colours. */
function contrast(fgText, bgText) {
  const bg = parseColor(bgText)
  const fg = over(parseColor(fgText), bg)
  const [hi, lo] = [luminance(fg), luminance(bg)].sort((a, b) => b - a)
  return (hi + 0.05) / (lo + 0.05)
}

/* ── 2. parse the skin stylesheet ─────────────────────────────────────────── */

/**
 * Split a stylesheet's custom-property declarations into the two mode blocks.
 *
 * @param {string} css - stylesheet text.
 * @returns {{ light: Map<string,string>, dark: Map<string,string> }} declarations per mode.
 */
function parseSkinCss(css) {
  const block = (selector) => {
    const start = css.indexOf(`${selector} {`)
    if (start < 0) throw new Error(`stylesheet has no ${selector} block`)
    const end = css.indexOf('}', start)
    const body = css.slice(css.indexOf('{', start) + 1, end)
    const declarations = new Map()
    for (const match of body.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/gi)) {
      declarations.set(match[1], match[2].trim())
    }
    return declarations
  }
  return {
    light: block('html body'),
    dark: block('html body[data-ds-dark-theme]'),
  }
}

/* ── 3. parse the product token stylesheet ────────────────────────────────── */

/**
 * Extract the product's design-platform stylesheet from the compiled theme package.
 *
 * @param {string} path - the ui-theme client bundle.
 * @returns {{ light: Map<string,string>, dark: Map<string,string> }} product declarations per mode.
 */
function parseProductCss(path) {
  const source = readFileSync(path, 'utf8')
  const match = /var design_platform_css_default = "(.+?)";/s.exec(source)
  if (match === null) throw new Error('could not locate design_platform_css_default in the theme bundle')
  const css = match[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\')
  const light = new Map()
  const dark = new Map()
  for (const block of css.matchAll(/(body(?:\[data-ds-dark-theme\])?)\{([^}]*)\}/g)) {
    const target = block[1].includes('dark') ? dark : light
    for (const declaration of block[2].matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+)/gi)) {
      target.set(declaration[1], declaration[2].trim())
    }
  }
  if (light.size === 0) throw new Error('product stylesheet parsed to zero declarations')
  return { light, dark }
}

/* ── 4. resolve the effective palette ─────────────────────────────────────── */

/**
 * Resolve a mode's full token table: product defaults, the skin's stylesheet layer,
 * then the skin's inline token layer (which outranks everything, as inline styles do).
 *
 * @param {Map<string,string>} product - product declarations for this mode.
 * @param {Map<string,string>} skin - skin stylesheet declarations for this mode.
 * @param {Record<string,{light: string, dark: string}>} inline - theme-service tokens.
 * @param {'light'|'dark'} mode - which mode to resolve.
 * @returns {Map<string,string>} resolved literal colours.
 */
function resolvePalette(product, skin, inline, mode) {
  const merged = new Map([...product, ...skin])
  for (const [name, value] of Object.entries(inline)) merged.set(name, value[mode])
  const resolved = new Map()
  const lookup = (name, depth = 0) => {
    if (depth > 12) throw new Error(`var() chain too deep at ${name}`)
    if (resolved.has(name)) return resolved.get(name)
    const raw = merged.get(name)
    if (raw === undefined) return undefined
    const reference = /^var\(\s*(--[a-z0-9-]+)\s*\)$/i.exec(raw)
    const value = reference === null ? raw : lookup(reference[1], depth + 1)
    if (value !== undefined) resolved.set(name, value)
    return value
  }
  for (const name of merged.keys()) lookup(name)
  return resolved
}

/* ── 5. the checks ────────────────────────────────────────────────────────── */

const bundle = await loadBundle()

// ── loadable ──
pass('loadable', `bundle id ${JSON.stringify('dsh-unknowcao-skin')}, style element id ${JSON.stringify(bundle.styleId)}`)
if (bundle.tokens === undefined) fail('loadable', 'apply() never called theme.overrideTokens')
else pass('loadable', `token layer source ${JSON.stringify(bundle.tokens.source)} with ${Object.keys(bundle.tokens.map).length} tokens`)
if (bundle.effects.length < 2) fail('loadable', `expected 2 fiber effects, got ${bundle.effects.length}`)
else pass('loadable', `${bundle.effects.length} fiber-owned effects: ${bundle.effects.map((e) => e.label).join(' | ')}`)
const declaredServices = new Set(bundle.inject ?? [])
for (const service of ['theme', 'slots']) {
  if (declaredServices.has(service)) pass('loadable', `declares the ${service} hard dependency`)
  else fail('loadable', `uses ctx.${service} without declaring inject: ['${service}']`)
}

// ── brand slots ──
/** The brand this skin pins. Changing it must be a deliberate edit here too, not a drift. */
const EXPECTED_BRAND = 'UnknowCao Harness'
const BRAND_SLOTS = ['sidebar.brand.name', 'sidebar.brand.mark', 'conversation.hero.brand.mark']
{
  const registered = new Set(bundle.registrations.map((entry) => entry.key))
  const missing = BRAND_SLOTS.filter((key) => !registered.has(key))
  if (missing.length > 0) fail('brand', `slot(s) never registered: ${missing.join(' ')}`)
  else pass('brand', `occupies ${BRAND_SLOTS.join(' | ')}`)

  const nameSlot = bundle.registrations.find((entry) => entry.key === 'sidebar.brand.name')
  if (nameSlot === undefined) fail('brand', 'sidebar.brand.name registered no component')
  else {
    const tree = nameSlot.component()
    const text = String(tree?.props?.children ?? '')
    if (text === EXPECTED_BRAND) pass('brand', `sidebar brand name renders ${JSON.stringify(text)}`)
    else fail('brand', `sidebar brand name renders ${JSON.stringify(text)} — expected ${JSON.stringify(EXPECTED_BRAND)}`)
  }

  const markSlot = bundle.registrations.find((entry) => entry.key === 'sidebar.brand.mark')
  if (markSlot === undefined) fail('brand', 'sidebar.brand.mark registered no component')
  else {
    const square = markSlot.component({ size: 24 })
    if (square?.props?.style?.width === '24px') pass('brand', 'sidebar brand mark honours the requested size')
    else fail('brand', `sidebar brand mark width is ${JSON.stringify(square?.props?.style?.width)}, expected 24px`)
  }

  // The hero passes a host class that preserves the surrounding mark geometry.
  // Dropping it silently misaligns the blank-session headline.
  const heroSlot = bundle.registrations.find((entry) => entry.key === 'conversation.hero.brand.mark')
  if (heroSlot === undefined) fail('brand', 'conversation.hero.brand.mark registered no component')
  else {
    const hero = heroSlot.component({ size: 16, className: 'host-mark-geometry' })
    if (hero?.props?.className === 'host-mark-geometry') pass('brand', 'hero brand mark forwards the host className')
    else fail('brand', 'hero brand mark dropped the host className — headline geometry would shift')
  }

  // The shell ships <title>DeepSeek Harness</title> as static HTML, and the product's
  // AppFrame now rewrites <title> as well. A one-shot write therefore loses to the first
  // generated session title, so the tab has to be asserted twice: as written, and again
  // after the product's own write has been played back.
  const tabTitle = () => bundle.titleElement.textContent
  if (tabTitle() === EXPECTED_BRAND) pass('brand', `page title set to ${JSON.stringify(EXPECTED_BRAND)}`)
  else fail('brand', `page title is ${JSON.stringify(tabTitle())}, expected ${JSON.stringify(EXPECTED_BRAND)}`)

  globalThis.document.title = '分析浏览器标签为deepseek harness原因 — DeepSeek Harness'
  if (tabTitle() === EXPECTED_BRAND) pass('brand', `page title still ${JSON.stringify(EXPECTED_BRAND)} after the product rewrites it`)
  else fail('brand', `page title became ${JSON.stringify(tabTitle())} after the product rewrote it — the skin has to hold it, not write it once`)
}

// ── colour sanity ──
const css = parseSkinCss(bundle.css)
let badColours = 0
for (const mode of ['light', 'dark']) {
  for (const [name, value] of css[mode]) {
    if (!name.startsWith('--dsw-static') && !name.startsWith('--dsw-alias')) continue
    try {
      parseColor(value)
    } catch (error) {
      badColours += 1
      fail('colour sanity', `${mode} ${name}: ${error.message}`)
    }
  }
}
if (badColours === 0) pass('colour sanity', `every ramp and alias value parses as a hex colour`)

// ── product-side checks ──
const themePath = process.argv[2] ?? DEFAULT_THEME
if (!existsSync(themePath)) {
  note('coverage/drift/contrast', `product stylesheet not found at ${themePath} — product-side checks skipped`)
} else {
  const product = parseProductCss(themePath)
  // The `html body` block matches in BOTH modes — the dark block only adds deltas.
  // Forgetting that was a bug in the first version of this audit: it read the product's
  // untouched dark ramps and reported 11 phantom drifts.
  const skinFor = (mode) => (mode === 'dark' ? new Map([...css.light, ...css.dark]) : css.light)
  const declared = new Set([...bundle.css.matchAll(/(--[a-z0-9-]+)\s*:/gi)].map((m) => m[1]))

  // ── coverage ──
  const statics = [...new Set([...product.light.keys()].filter((n) => n.startsWith('--dsw-static')))]
  const literals = [...new Set(
    [...product.light.entries(), ...product.dark.entries()]
      .filter(([n, v]) => n.startsWith('--dsw-alias') && HEX.test(v.trim()))
      .map(([n]) => n),
  )]
  const missingStatics = statics.filter((n) => !declared.has(n))
  const missingLiterals = literals.filter((n) => !declared.has(n))
  if (missingStatics.length > 0) fail('coverage', `statics left cool: ${missingStatics.join(' ')}`)
  else pass('coverage', `all ${statics.length} product static ramp values rebound`)
  if (missingLiterals.length > 0) fail('coverage', `hardcoded aliases left cool: ${missingLiterals.join(' ')}`)
  else pass('coverage', `all ${literals.length} hardcoded alias literals rebound`)

  // ── drift: the 13 inline tokens vs what the ramps derive ──
  // Two layers describing one colour is inherent to this design, so drift is expected.
  // What must not happen is drift nobody chose: every entry below is a decision, and the
  // check fails the moment a NEW one appears.
  const INTENTIONAL = new Map([
    ['light --dsw-alias-brand-primary', '品牌蓝主按钮：产品在这里放高对比墨色，换成天蓝是这套皮肤唯一的强调色'],
    ['light --dsw-alias-state-warn-primary', '正文级赭：色阶 amber-500 必须留在阶梯上（要比 600 浅），当正文用太亮'],
    ['dark --dsw-alias-bg-overlay', '浮层只比页面抬一档：色阶 700 是浅色下当次要文字用的中间调，当深色浮层会跳成亮灰块'],
    ['dark --dsw-alias-state-success-primary', '色阶的绿是给浅色配的，在近黑底上太沉'],
    ['dark --dsw-alias-state-warn-primary', '色阶的赭是给浅色配的，在近黑底上太沉'],
  ])
  const applied = new Map(Object.entries(bundle.tokens.map))
  for (const mode of ['light', 'dark']) {
    const rampsOnly = resolvePalette(product[mode], skinFor(mode), {}, mode)
    const drifts = []
    for (const [name, pair] of applied) {
      const derived = rampsOnly.get(name)
      if (derived !== undefined && derived.toLowerCase() !== pair[mode].toLowerCase()) {
        drifts.push({ key: `${mode} ${name}`, detail: `${name} inline ${pair[mode]} vs ramp ${derived}` })
      }
    }
    const unexpected = drifts.filter((d) => !INTENTIONAL.has(d.key))
    const known = drifts.filter((d) => INTENTIONAL.has(d.key))
    if (unexpected.length > 0) {
      fail('drift', `${mode}: ${unexpected.length} UNEXPLAINED inline/ramp divergence\n      ${unexpected.map((d) => d.detail).join('\n      ')}`)
    } else {
      pass('drift', `${mode}: ${known.length} drift(s), all deliberate`)
    }
    for (const drift of known) note('drift', `${mode} ${drift.detail} — ${INTENTIONAL.get(drift.key)}`)
  }

  // ── contrast ──
  const TEXT = 4.5
  const ACCENT = 3
  const pairs = [
    ['label-primary', 'bg-base', TEXT, 'body text on the page'],
    ['label-primary', 'bg-layer-1', TEXT, 'text on a card'],
    ['label-primary', 'bg-layer-2', TEXT, 'text on a nested surface'],
    ['label-primary', 'bg-overlay', TEXT, 'text in a popover'],
    ['label-primary', 'specific-sidebar-fill', TEXT, 'text in the sidebar'],
    ['label-secondary', 'bg-base', TEXT, 'secondary text'],
    ['label-secondary', 'bg-overlay', TEXT, 'secondary text in a popover'],
    ['label-secondary', 'specific-sidebar-fill', TEXT, 'secondary text in the sidebar'],
    ['label-tertiary', 'bg-base', TEXT, 'tertiary text'],
    ['label-caption', 'bg-base', TEXT, 'caption text'],
    ['brand-primary', 'bg-base', ACCENT, 'accent / link colour'],
    ['label-primary-foreground', 'button-primary-fill', TEXT, 'primary button label'],
    ['label-primary', 'markdown-code-block', TEXT, 'code block text'],
    ['label-primary', 'specific-bubble', TEXT, 'user bubble text'],
    ['label-primary', 'bg-module-platform', TEXT, 'text on the module platform fill'],
    ['state-error-primary', 'bg-base', ACCENT, 'error accent'],
    ['state-success-primary', 'bg-base', ACCENT, 'success accent'],
    ['state-warn-primary', 'bg-base', ACCENT, 'warn accent'],
    ['state-error-primary', 'bg-base', TEXT, 'error text'],
    ['state-success-primary', 'bg-base', TEXT, 'success text'],
    ['state-warn-primary', 'bg-base', TEXT, 'warn text'],
  ]
  for (const mode of ['light', 'dark']) {
    const palette = resolvePalette(product[mode], skinFor(mode), bundle.tokens.map, mode)
    // The honest baseline for a skin is the palette it replaced: the design system
    // itself ships several text colours below AA (its warn accent is 2.15:1 on white),
    // so an absolute AA bar would fail the product, not the skin. What matters is
    // whether the skin made anything WORSE.
    const baseline = resolvePalette(product[mode], new Map(), {}, mode)
    for (const [fgName, bgName, threshold, label] of pairs) {
      const fgVar = `--dsw-alias-${fgName}`
      const bgVar = bgName.startsWith('specific-') ? `--dsw-${bgName}` : `--dsw-alias-${bgName}`
      const fg = palette.get(fgVar)
      const bg = palette.get(bgVar)
      if (fg === undefined || bg === undefined) {
        note('contrast', `${mode} ${label}: unresolved (${fgVar} / ${bgVar})`)
        continue
      }
      const ratio = contrast(fg, bg)
      const before = contrast(baseline.get(fgVar) ?? fg, baseline.get(bgVar) ?? bg)
      const delta = ratio - before
      const line = `${mode.padEnd(5)} ${ratio.toFixed(2)}:1 (was ${before.toFixed(2)}:1)  ${label}`
      // A ratio drop is only a defect when it crosses a bar the product itself cleared.
      // Going 18.90 -> 15.72 is a side effect of a cream backdrop, not a readability loss.
      if (ratio >= threshold) pass('contrast', line)
      else if (before >= threshold) fail('contrast', `${line}  ✗ regression: cleared AA ${threshold}:1 before (Δ${delta.toFixed(2)})`)
      else if (ratio < ACCENT && before >= ACCENT) fail('contrast', `${line}  ✗ dropped below the ${ACCENT}:1 floor (Δ${delta.toFixed(2)})`)
      else note('contrast', `${line}  ⚠ below ${threshold}:1 — inherited, product was ${before.toFixed(2)}:1 (Δ${delta >= 0 ? '+' : ''}${delta.toFixed(2)})`)
    }
  }
}

/* ── report ───────────────────────────────────────────────────────────────── */

const groups = new Map()
for (const result of results) {
  if (!groups.has(result.check)) groups.set(result.check, [])
  groups.get(result.check).push(result)
}
let failures = 0
let warnings = 0
for (const [check, entries] of groups) {
  const failed = entries.filter((e) => e.ok === false).length
  const warned = entries.filter((e) => e.ok === null).length
  failures += failed
  warnings += warned
  const badge = failed > 0 ? 'FAIL' : warned > 0 ? 'WARN' : 'ok  '
  console.log(`\n[${badge}] ${check}  (${entries.length - failed - warned} ok, ${warned} warn, ${failed} fail)`)
  for (const entry of entries) {
    console.log(`   ${entry.ok === true ? '✓' : entry.ok === null ? '⚠' : '✗'} ${entry.message}`)
  }
}
console.log(`\n${failures} failure(s), ${warnings} warning(s).`)
process.exitCode = failures > 0 ? 1 : 0
