// Identity bootstrap for the whole app (any route).
//
// netlifyIdentity.init() must run on every page load, not just on the /control
// page: a pending invite link is <site>/#invite_token=..., and the widget only
// matches the hash during init (runRoutes in src/netlify-identity.tsx). If the
// widget isn't up, the token is never caught. Guarded so init() runs once.
import netlifyIdentity from 'netlify-identity-widget'

let widgetReady = false

export function ensureIdentity() {
  if (widgetReady) return
  widgetReady = true
  netlifyIdentity.init()
}

export default netlifyIdentity
