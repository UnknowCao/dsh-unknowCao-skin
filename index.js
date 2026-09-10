/**
 * dsh-unknowcao-skin host half — 蔚来 · 地平线 / Blue Sky Coming.
 *
 * The skin itself lives almost entirely in client.js. This half exists for two
 * reasons.
 *
 * 1. Discovery. client-modules walks the mounted rows, reads the package.json
 *    each row's specifier resolves to, and serves `exports["./client"]` only for
 *    packages whose row is actually mounted. One row therefore buys both faces —
 *    host process and browser — and removing the row removes both.
 *
 * 2. The web app manifest. The browser half can rename the page (`document.title`),
 *    but the Edge app window dsh-dock launches (`--app=`) takes its title from the
 *    manifest, not from the document: the shell ships
 *    `dist/manifest.webmanifest` with `"name": "DeepSeek Harness"` and
 *    `"display": "fullscreen"`. `document.title` cannot reach that, so this half
 *    serves its own manifest in its place.
 *
 * Why a route works: the product serves its built frontend through
 * `webServer.registerFallback(...)` — a *fallback seat*, consulted only when no
 * explicitly registered route matched. `@deepseek-ai/dsh-host-frontend-static`
 * says so in its own header ("serves the built frontend directory with explicit
 * index … fallback seat"). So one exact route shadows the static file, and it is
 * the same mechanism dsh-dock uses for `/launcher/api/*`.
 *
 * What this half still deliberately does NOT do:
 *
 *   · It publishes no service. The skin has no host-side state to own: which
 *     palette is showing is the product's own theme preference, and the layer on
 *     top of it is process-local to the page.
 *   · It registers no model-callable tool. A `skin_set` would exist only to write
 *     a preference this plugin does not store.
 *
 * The manifest is a faithful copy of the product's, with the two name fields
 * changed. Everything that controls window behaviour — `id`, `start_url`,
 * `scope`, `display`, `icons` — is carried over verbatim on purpose: changing
 * `display` would change how the app window opens, which is not this plugin's
 * business.
 *
 * @module dsh-unknowcao-skin
 */

/** Stable Cordis plugin name. */
export const name = 'dsh-unknowcao-skin'

/**
 * The brand this skin shows. Must stay equal to `BRAND.name` in client.js — the
 * two halves are separate module formats and cannot import each other, so
 * test/palette-audit.mjs asserts the equality instead of trusting it.
 */
export const BRAND_NAME = 'UnknowCao Harness'

/** Tight-space form. This is what taskbars and app lists show. */
export const BRAND_SHORT = 'UnknowCao'

/**
 * The product manifest with a rebranded name and no icon. Everything that
 * controls window behaviour — `id`, `start_url`, `scope`, `display` — is the
 * product's own value on purpose: changing `display` would change how the app
 * window opens, which is not this plugin's business. `icons` is deliberately
 * absent: the tab and the app window are meant to show a name and no image.
 */
const MANIFEST = {
  id: '/',
  name: BRAND_NAME,
  short_name: BRAND_SHORT,
  start_url: '/',
  scope: '/',
  display: 'fullscreen',
}

/** Path this half shadows; the product's static fallback would otherwise serve it. */
const MANIFEST_PATH = '/manifest.webmanifest'

/** The product's whale favicon lives here; the skin blanks it. */
const ICON_PATH = '/favicon.svg'

/**
 * A transparent icon of the size the product declares. Browsers always render
 * *something* in a tab's icon slot — there is no "no favicon" state — so the
 * closest achievable is an SVG with no drawing in it.
 */
const BLANK_ICON = '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"></svg>'

/**
 * Activate the plugin. Cordis unloads it with the profile; both routes belong to
 * this fiber, so unmounting restores the product's own manifest and favicon and
 * nothing else is left behind.
 *
 * @param {import('@deepseek-ai/cordis').Context} ctx - host context.
 */
export function apply(ctx) {
  ctx.inject(['webServer'], (webCtx) => {
    const routes = [
      [MANIFEST_PATH, 'application/manifest+json; charset=utf-8', () => JSON.stringify(MANIFEST)],
      [ICON_PATH, 'image/svg+xml; charset=utf-8', () => BLANK_ICON],
    ]
    for (const [path, contentType, body] of routes) {
      ctx.effect(() => webCtx.webServer.register({
        kind: 'exact',
        path,
        handler: (req, res) => {
          if (req.method !== 'GET' && req.method !== 'HEAD') {
            res.writeHead(405, { allow: 'GET, HEAD' })
            res.end()
            return
          }
          // no-store: both are skin settings, and a cached copy would keep showing
          // the previous brand after the user edits BRAND_NAME.
          res.writeHead(200, { 'content-type': contentType, 'cache-control': 'no-store' })
          res.end(body())
        },
      }), `dsh-unknowcao-skin: ${path}`)
    }
  })
  ctx.logger?.info?.('dsh-unknowcao-skin: skin mounted (tokens + ramps + sky light + brand + manifest)')
}
