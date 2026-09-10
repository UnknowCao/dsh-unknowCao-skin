/**
 * dsh-unknowcao-skin host half — 蔚来 · 地平线 / Blue Sky Coming.
 *
 * The skin itself lives entirely in client.js. This half exists because of how
 * the browser half is discovered: client-modules walks the mounted rows, reads
 * the package.json each row's specifier resolves to, and serves
 * `exports["./client"]` only for packages whose row is actually mounted. One
 * row therefore buys both faces — host process and browser — and removing the
 * row removes both.
 *
 * What this half deliberately does NOT do:
 *
 *   · It publishes no service. The skin has no host-side state to own: which
 *     palette is showing is the product's own theme preference, and the layer
 *     on top of it is process-local to the page.
 *   · It registers no tool and no route. A model-callable `skin_set` would
 *     exist only to write a preference this plugin does not store, and a route
 *     would expose a decision the user already owns in Appearance.
 *   · It declares no inject, so the row activates on the first pass instead of
 *     waiting on a service it would not use.
 *
 * Net effect: one log line so the row's activation is visible in the server
 * log, and nothing that can fail at runtime.
 *
 * @module dsh-unknowcao-skin
 */

export const name = 'dsh-unknowcao-skin'

/**
 * Activate the plugin. Cordis unloads it with the profile; there is nothing to
 * unwind because nothing outside this function was ever touched.
 *
 * @param {import('@deepseek-ai/cordis').Context} ctx - host context.
 */
export function apply(ctx) {
  ctx.logger?.info?.('dsh-unknowcao-skin: skin mounted (tokens + ramps + sky light + brand)')
}
