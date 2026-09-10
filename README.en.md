# dsh-unknowcao-skin · Blue Sky Coming · Horizon

> A DSH Web GUI skin: **near-white ground, near-black cockpit, one azure accent** — and the DeepSeek branding the GUI shows replaced with your own. Install it and it is on; unmount it and the page is back to what it was.

```
near-white #F7F9FC    ink #080C12    azure #1B5FC1    cockpit #0C1119
```

> **Note: the package and directory are still `dsh-unknowcao-skin`** (it started as a paper skin). The content has been re-skinned twice; the name never followed, because renaming touches the profile's dependency and its `dsh.profile.bundles` list. Say the word and it is one command.

---

## Concept

Taken from NIO's publicly stated brand language — **"Blue Sky Coming"**: the upper half of the mark is sky, the lower half is earth, and where they meet is the horizon. This skin translates that into an interface: the light theme is sky under light, the dark theme is a cockpit at night, and the accent is the azure in between.

**The colour values are my own reading of that language, not NIO's official specification.** No verifiable official spec is published (the third-party swatch sites either list a single `Black` or sit behind Cloudflare), so nothing here claims to reproduce it. The mark is an abstract "sky — horizon — earth" drawn from scratch, and **contains no NIO assets**.

### Chroma discipline

The first version's problem was not an ugly palette, it was **runaway chroma**: the surface ramp ran at 28%–55% saturation, so dark mode became one sheet of saturated steel blue (popovers at `#476791`), and even the hover wash was tinted with the brand blue — when colour talks everywhere, nothing looks expensive.

This version gives the talking back to one voice:

- **the surface ramp is near-neutral** (hue still cool, saturation cut to 6%–15%)
- **exactly one saturated thing on screen** — the azure accent family
- **dark mode is near-black** (`#0C1119`, not the blue-black `#0B1623`), with hierarchy carried by lightness rather than hue
- **hover washes are neutral ink again** — a hover is "pressed in a little", not "turned blue"

It also closed a contrast hole the product ships: dark popover secondary text goes from the product's 3.85:1 to **6.97:1**.

---

## Palette

| | Light · sky | Dark · cockpit |
|---|---|---|
| `bg-base` | `#F7F9FC` | `#0C1119` |
| `bg-layer-1` / `bg-layer-2` | `#F7F9FC` | `#18202F` / `#1E283A` |
| `bg-overlay` | `#E2E8F1` | `#333D4E` |
| `specific-sidebar-fill` | `#F2F5F9` | `#121927` |
| `border-l1` | `#0B1B2E14` cool ink 8% | `#E8EFFA14` cool white 8% |
| `border-l2` | `#0B1B2E24` | `#E8EFFA24` |
| `brand-primary` | `#1B5FC1` **azure** | `#F2F5F9` |
| `label-primary` | `#080C12` | `#F2F5F9` |
| `label-secondary` | `#4E5D73` | `#C6CFDD` |
| `state-error` | `#C43A45` | `#D57B80` |
| `state-success` | `#15784A` | `#7CC6A2` |
| `state-warn` | `#916200` | `#DCB47C` |
| accent ramp `deepseek-500` | `#3B76C8` | shares one ramp with light |

**Type:** geometric sans (Segoe UI Variable / system stack), headings back in the same family. NIO's identity lives in colour and whitespace, not in a typeface — so this version does not invent one.
**Sky light:** a very faint wash from the top of the viewport, fading by a third of the way down; in dark mode it becomes cockpit ambient light. 5% / 7% alpha — it only gives the flat plane a light direction.
**Brand:** the sidebar becomes a "sky — horizon — earth" tile plus `UnKnowCao Harness`; so does the browser tab title.

### Contrast — measured, not estimated

`node test/palette-audit.mjs` computes WCAG ratios for 21 foreground/background pairs and reconciles every one against the product's own palette. Current result: **0 failures.**

| Pair | Light | Dark | Product shipped |
|---|---|---|---|
| body / page | 18.58:1 | 17.30:1 | 18.9 / 17.5 |
| secondary / page | 5.43:1 | 12.1:1 | 5.80 / 12.1 |
| secondary / popover | 5.43:1 | **6.97:1** | 4.90 / **3.85** |
| primary button label | **5.77:1** (near-white on azure) | 17.92:1 | 18.90 / 18.08 |
| error / success / warn | 4.93 / 5.22 / 5.04 | 6.28 / 9.42 / 9.79 | 4.50 / **2.28** / **2.15** |

Both ⚠ are places the product already shipped below AA (light tertiary 3.64 vs its 3.71, light caption 2.23 vs its 2.13), deltas inside 0.1. **The skin moved nothing from passing to failing**, and it repaired three: dark popover body and secondary text, plus the state colours the product shipped at ~2.2:1.

---

## Four layers

The product splits colour in two: a family of `--dsw-static-*` ramps, and `--dsw-alias-*` semantic aliases that reference them. The skin follows that split, plus a brand layer.

**① Contract layer** — `theme.overrideTokens()`, the 13 published aliases. Values land as inline styles on `body`, which outranks any stylesheet.

**② System layer** — the `--dsw-static-*` ramps, the hardcoded aliases, the typography variables. The ramps carry 90% of the surface: **all 73 product static values and all 21 hardcoded alias literals are rebound** (the audit verifies this one by one).

A ramp step is a single value shared by both modes — a background in light, often a text colour in dark. So the skin changes hue and saturation but **never WCAG luminance**. That rule was bought with a real defect: the previous version rotated hue at constant HSL lightness, assuming lightness is what holds contrast, and light tertiary text fell from 3.71 to 2.72 — HSL lightness is not perceived luminance, and a cool grey turned blue is measurably brighter at the same HSL lightness.

The one exception is the top of the ladder: the product's light surfaces are pure white (Y = 1.0) and no tinted white can reach 1.0, so the top steps take a monotone luminance compression that reaches identity at Y = 0.75. The sky-lit white lives there and nowhere else.

**③ Sky-light layer** — a full-viewport gradient wash on `body::after`, `pointer-events: none`. The product does not use that slot.

**④ Brand layer** — four writable entry points, all reversible: `sidebar.brand.name`, `sidebar.brand.mark` and `conversation.hero.brand.mark` are `single` slots, so registering shadows the product's occupant; the tab title goes through `document.title`, because the shell's static HTML hardcodes `<title>DeepSeek Harness</title>` and the frontend bundle never rewrites it — the one literal piece of brand text in the GUI.

### Where the line is

- No product class selector is ever written; no DOM relocated, no layout touched.
- Variables are declared on `body` (custom properties resolve by nearest element, so a `:root` declaration is shadowed by body's own value); `html body` outranks the product's own rules, so no dependence on stylesheet order and no `!important`.
- The only DOM node touched is one `<style>` element owned by the Cordis fiber.

---

## Audit

```sh
node test/palette-audit.mjs [path/to/dsh-client-ui-theme/lib/client.js]
```

Loads the real `client.js` in a stubbed browser, captures the stylesheet, the token map and the slot registrations it actually installs, and reconciles them against the product's token stylesheet. Six checks: **loadable**, **brand** (three slots, the rendered name, the mark's `size` and host `className`, the tab title), **colour sanity**, **coverage** (all 73 statics, all 21 hardcoded aliases), **drift** (13 inline tokens vs their ramp derivation, divergences allowlisted with a reason, a **new** one fails), **contrast** (21 pairs, product values computed alongside, only **crossing AA** counts as a regression).

Check 4 is the real safety net: the system layer is coupled to 103 internal product variable names, and an upstream rename would otherwise fail silently.

---

## Install

```sh
dsh plugin --profile web add link:/path/to/dsh-unknowcao-skin
```

> **pnpm 12:** `pnpm add <local path>` fails with `ERR_PNPM_PACKAGE_MANAGER_ADD_RESOLVE_LATEST` for `file:`, `link:`, absolute and relative specs alike. Declare `"dsh-unknowcao-skin": "link:<absolute path>"` in the profile `package.json` and run `dsh plugin --profile web install` — `dsh plugin` forwards `install` to pnpm and still reconciles `dsh.profile.bundles`.

A new bundle's patch is composed at boot, so **restart the profile once**.

### Uninstall

```sh
dsh plugin --profile web remove dsh-unknowcao-skin
```

Restart and the interface is byte-for-byte back to its previous palette.

---

## Tuning it

**Two sources, edit both.** The 13 façade tokens (`ALIAS_TOKENS`) are written inline and outrank the stylesheet — changing a ramp in `SKIN_CSS` alone will not move them. The convention is: **the ramps are the baseline and `ALIAS_TOKENS` copies the derived value**, with only the five allowlisted entries deviating. Run the audit afterwards; it lists every divergence.

- **Cooler or richer overall:** this is the knob worth turning, and it is where "elegant" comes from. The `--dsw-static-neutral-bluish-*` family currently sits at 6%–15% saturation — raise it and the skin slides back toward saturated steel blue, lower it and it approaches pure grey. **Do not tune only the dark end**; the ramp is shared by both modes.
- **Azure deeper or brighter:** move `--dsw-static-deepseek-500` and `--dsw-static-blue-500` together (two names for one accent family); the primary button's depth is a separate knob, `brand-primary` in `ALIAS_TOKENS`.
- **Cooler light theme:** move `--dsw-static-neutral-bluish-00` (the tint of the near-white) and `-50` (sidebar) together. Push too far and tertiary text breaks first.
- **More "cockpit" in dark:** press `--dsw-static-neutral-bluish-950` (page) down and take `-875` / `-850` (surfaces) with it. Do not touch `-50` — in dark mode that is the body text colour — and **do not darken `-600`**: it is the dark caption colour, and a small push takes it from 4.9:1 to 4.1:1 (we measured that one the hard way).
- **Turn the sky light off:** delete the two `html body::after` blocks and only flat colour remains.
- **Change the brand:** `BRAND = { name: 'UnKnowCao Harness', seal: 'U' }`; the mark's gradient is `MARK_SKY`. Keep `EXPECTED_BRAND` in the audit in sync or it fails immediately.
- **Keep the product brand:** `BRAND = null`.

---

## Known limits

- **The first paint flashes the stock palette.** The product's only pre-plugin palette hook reads the built-in `ui-theme` setting; a third-party skin cannot get into it, and `immediately: true` only prefetches the module.
- **Two skin plugins have no arbitration.** The contract layer is namespaced by `source` and stacks cleanly; the system layer is plain CSS and wins by specificity and load order.
- **The system layer is coupled to internal product variable names.** An upstream rename does not error, it degrades silently; the audit's coverage check is the only alarm.
- **The name no longer matches the content.** The package is `dsh-unknowcao-skin` and the theme is azure. Renaming touches both the profile dependency and `dsh.profile.bundles`.
- **NIO is someone else's brand.** This skin is a personal stylization built on publicly stated brand language; it ships no official assets, is not affiliated with or endorsed by NIO, and its colour values are not the official specification. Think about that before distributing it.
- **Web GUI only.**

---

## Layout

```
dsh-unknowcao-skin/
├── package.json            dsh.bundle.patch + dsh.client.platform: web
├── cordis.patch.yml        inserts one row (the package root) into the profile
├── index.js                host half: one boot log line, deliberately nothing else
├── client.js               browser half: ALIAS_TOKENS (contract) + SKIN_CSS (system + sky light) + brand
└── test/palette-audit.mjs  audit: loads the real bundle, reconciles coverage / drift / contrast / brand
```

The host half exists for one reason — **how the browser half is discovered**. client-modules resolves each *mounted row* back to its package.json, finds `dsh.client.platform: web` there, and only then serves `exports["./client"]` at `/plugins/dsh-unknowcao-skin/client.js`. One row buys both faces.

## License

MIT
