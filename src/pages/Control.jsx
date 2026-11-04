import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import netlifyIdentity, { ensureIdentity } from '../identity.js'

// Control panel — private page at /control (not in the public nav).
//
// Auth = Netlify Identity on this site. Identity is initialized app-wide in
// src/identity.js (via App) so a pending #invite_token is caught on any page.
// The widget itself is the sign-in UI.
//
// Data = the private control API on Modal (read-only): sessions (+ transcript
// tail, server-sliced so the multi-MB live session stays cheap), daily logs,
// state (state.md / decisions.md / ROADMAP) and action files. Every fetch is
// behind the same Identity JWT; nothing here is baked into the bundle.
const CONTROL_API = 'https://rinkesh2010rpp--control-api.modal.run'

// One authenticated fetch against the control API. Refresh() mints a fresh
// 1-hour access JWT from the widget's session, so long-lived tabs stay valid.
async function authFetch(path) {
  const jwt = await netlifyIdentity.refresh()
  const res = await fetch(`${CONTROL_API}${path}`, {
    headers: { accept: 'application/json', authorization: `Bearer ${jwt}` },
  })
  if (res.status === 401 || res.status === 403) {
    throw new Error(`access denied (${res.status})`)
  }
  if (!res.ok) throw new Error(`control API responded ${res.status}`)
  return res.json()
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
  const [logs, setLogs] = useState(null)
  const [phase, setPhase] = useState('idle') // idle|loading|ready|unavailable|error
  const [error, setError] = useState(null)
  const [view, setView] = useState(null) // {kind:'session'|'log', id} or null
  const [detail, setDetail] = useState(null) // {loading, data, error}

  useEffect(() => {
    ensureIdentity()
    const onLogin = () => setUser(netlifyIdentity.currentUser())
    const onLogout = () => {
      setUser(null)
      setSessions(null)
      setLogs(null)
      setPhase('idle')
      setError(null)
      setView(null)
      setDetail(null)
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
      const [s, l] = await Promise.all([
        authFetch('/api/control/sessions'),
        authFetch('/api/control/logs'),
      ])
      setSessions(Array.isArray(s?.sessions) ? s.sessions : [])
      setLogs(Array.isArray(l?.logs) ? l.logs : [])
      setPhase('ready')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setSessions(null)
      setLogs(null)
      setPhase('unavailable')
    }
  }

  useEffect(() => {
    if (user) load()
    // load() re-runs when the user object changes (login/logout).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  async function openSession(id) {
    setView({ kind: 'session', id })
    setDetail({ loading: true, data: null, error: null })
    try {
      // tail=N is server-sliced (bounded at 2000 lines) — the live session
      // file is tens of MB, only the requested window ever ships.
      const d = await authFetch(
        `/api/control/sessions/${encodeURIComponent(id)}?tail=2000`
      )
      setDetail({ loading: false, data: d, error: null })
    } catch (err) {
      setDetail({
        loading: false,
        data: null,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  async function openLog(id) {
    const date = String(id).replace(/\.md$/, '')
    setView({ kind: 'log', id: date })
    setDetail({ loading: true, data: null, error: null })
    try {
      const d = await authFetch(`/api/control/logs/${date}`)
      setDetail({ loading: false, data: d, error: null })
    } catch (err) {
      setDetail({
        loading: false,
        data: null,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  function closeDetail() {
    setView(null)
    setDetail(null)
  }

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
            Couldn&apos;t reach the control API: {error}.
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
            <ul className="control-list">
              {sessions.map((s) => (
                <li key={s.id}>
                  <button onClick={() => openSession(s.id)}>
                    <strong>{s.id}</strong> — {sizeFmt(s.size)} ·{' '}
                    {s.modified ? timeFmt.format(new Date(s.modified)) : '—'}
                    {s.lines != null ? ` · ${s.lines} lines` : ''}
                  </button>
                </li>
              ))}
            </ul>
          )}

          <h2>Daily logs</h2>
          {logs.length === 0 ? (
            <p>No daily logs found.</p>
          ) : (
            <ul className="control-list">
              {logs.map((l) => (
                <li key={l.id}>
                  <button onClick={() => openLog(l.id)}>
                    <strong>{l.id}</strong> — {sizeFmt(l.size)} ·{' '}
                    {l.modified ? timeFmt.format(new Date(l.modified)) : '—'}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {detail && (
            <section>
              <p>
                <button onClick={closeDetail}>← back</button>
              </p>
              {detail.loading && <p>Loading…</p>}
              {detail.error && (
                <p className="status-error">Couldn&apos;t load: {detail.error}</p>
              )}
              {detail.data &&
                (view.kind === 'session' ? (
                  <section>
                    <h3>{detail.data.id}</h3>
                    <p className="control-meta">
                      {detail.data.total_lines} lines total — showing lines{' '}
                      {detail.data.start_line + 1}–{detail.data.end_line}{' '}
                      (latest 2000)
                    </p>
                    {Array.isArray(detail.data.lines) ? (
                      <pre className="control-pre">
                        {detail.data.lines.join('')}
                      </pre>
                    ) : (
                      <p className="status-error">No transcript lines.</p>
                    )}
                  </section>
                ) : (
                  <section>
                    <h3>{detail.data.date}</h3>
                    <pre className="control-pre">
                      {String(detail.data.content ?? '')}
                    </pre>
                  </section>
                ))}
            </section>
          )}
        </section>
      )}

      <p>
        <Link to="/">← Back home</Link>
      </p>
    </section>
  )
}