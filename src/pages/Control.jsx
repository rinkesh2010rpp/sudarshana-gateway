import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import netlifyIdentity from 'netlify-identity-widget'

// Control panel — private page at /control (not in the public nav).
//
// Auth = Netlify Identity on this site. The zero-config widget talks directly
// to <site>/.netlify/identity; it also reads an #invite_token from the URL and
// auto-opens the "set your password" flow for a pending invite.
//
// Data = the private control API on Modal (read-only). It is not deployed
// until the matching sudarshana PR is merged and deployed, so until then this
// page shows an honest "control service not available yet" state rather than
// pretending.
const CONTROL_API = 'https://rinkesh2010rpp--control-api.modal.run'

let widgetReady = false // init() exactly once per page load

function setupWidget() {
  if (widgetReady) return
  widgetReady = true
  netlifyIdentity.init()
}

const sizeFmt = (n) => {
  if (n == null) return '—'
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} kB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

const timeFmt = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'medium',
})

export default function Control() {
  const [user, setUser] = useState(() => netlifyIdentity.currentUser())
  const [sessions, setSessions] = useState(null)
  const [phase, setPhase] = useState('idle') // idle|loading|ready|unavailable|error
  const [error, setError] = useState(null)

  useEffect(() => {
    setupWidget()
    const onLogin = () => setUser(netlifyIdentity.currentUser())
    const onLogout = () => {
      setUser(null)
      setSessions(null)
      setPhase('idle')
      setError(null)
    }
    const onInit = (u) => setUser(u || netlifyIdentity.currentUser())
    netlifyIdentity.on('login', onLogin)
    netlifyIdentity.on('logout', onLogout)
    netlifyIdentity.on('init', onInit)
    return () => {
      netlifyIdentity.off('login', onLogin)
      netlifyIdentity.off('logout', onLogout)
      netlifyIdentity.off('init', onInit)
    }
  }, [])

  async function load() {
    setPhase('loading')
    setError(null)
    try {
      // Fresh 1-hour access JWT from the widget's session.
      const jwt = await netlifyIdentity.refresh()
      const res = await fetch(`${CONTROL_API}/api/control/sessions`, {
        headers: { accept: 'application/json', authorization: `Bearer ${jwt}` },
      })
      if (res.status === 401 || res.status === 403) {
        throw new Error(`access denied (${res.status})`)
      }
      if (!res.ok) throw new Error(`control API responded ${res.status}`)
      const data = await res.json()
      setSessions(Array.isArray(data?.sessions) ? data.sessions : [])
      setPhase('ready')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setSessions(null)
      setPhase('unavailable')
    }
  }

  useEffect(() => {
    if (user) load()
    // load() re-runs when the user object changes (login/logout).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  if (!user) {
    return (
      <section>
        <h1>Control</h1>
        <p>
          This page is private. Sign in with your Netlify Identity account to
          view Sudarshana&apos;s conversations, logs, and operational state.
        </p>
        <button onClick={() => netlifyIdentity.open('login')}>Sign in</button>
        <p>
          <Link to="/">← Back home</Link>
        </p>
      </section>
    )
  }

  return (
    <section>
      <h1>Control</h1>
      <p>
        Signed in as <strong>{user.email}</strong>.{' '}
        <button onClick={() => netlifyIdentity.logout()}>Sign out</button>
      </p>

      {phase === 'loading' && <p>Loading…</p>}

      {phase === 'unavailable' && (
        <section>
          <p className="status-error">
            Couldn&apos;t reach the control API: {error}. It&apos;s probably not
            deployed yet — that&apos;s the remaining step (merge + deploy the
            control-api PR). Once it&apos;s live, Retry will work.
          </p>
          <button onClick={load}>Retry</button>
        </section>
      )}

      {phase === 'ready' && (
        <section>
          <h2>Conversation sessions</h2>
          {sessions.length === 0 ? (
            <p>No conversation sessions found.</p>
          ) : (
            <ul>
              {sessions.map((s) => (
                <li key={s.id}>
                  <strong>{s.id}</strong> — {sizeFmt(s.size)} ·{' '}
                  {s.modified ? timeFmt.format(new Date(s.modified)) : '—'}
                  {s.lines != null ? ` · ${s.lines} lines` : ''}
                </li>
              ))}
            </ul>
          )}
          <p>
            Detail views (transcript, logs, state) land with the control API
            deploy.
          </p>
        </section>
      )}

      <p>
        <Link to="/">← Back home</Link>
      </p>
    </section>
  )
}
