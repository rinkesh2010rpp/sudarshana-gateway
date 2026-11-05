import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import netlifyIdentity, { ensureIdentity } from '../identity.js'
import StatusStrip from '../components/StatusStrip.jsx'
import SessionsPanel from '../components/SessionsPanel.jsx'
import TranscriptView from '../components/TranscriptView.jsx'
import LogView from '../components/LogView.jsx'
import { sizeFmt } from '../components/format.js'

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

const timeFmt = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'medium',
})

export default function Control() {
  const [user, setUser] = useState(() => netlifyIdentity.currentUser())
  const [sessions, setSessions] = useState(null)
  const [logs, setLogs] = useState(null)
  const [loadedAt, setLoadedAt] = useState(null) // when the strip data was fetched
  const [phase, setPhase] = useState('idle') // idle|loading|ready|unavailable|error
  const [error, setError] = useState(null)
  const [view, setView] = useState(null) // {kind:'session'|'log', id} or null
  const [detail, setDetail] = useState(null) // {loading, data, error}
  const [stateData, setStateData] = useState(null) // /api/control/state payload
  const [stateBusy, setStateBusy] = useState(false)
  const [stateErr, setStateErr] = useState(null)
  const [actions, setActions] = useState(null) // action-file list
  const [actionsBusy, setActionsBusy] = useState(false)
  const [actionsErr, setActionsErr] = useState(null)
  const [activeAction, setActiveAction] = useState(null) // {id, loading, data, error}

  useEffect(() => {
    ensureIdentity()
    const onLogin = () => setUser(netlifyIdentity.currentUser())
    const onLogout = () => {
      setUser(null)
      setSessions(null)
      setLogs(null)
      setLoadedAt(null)
      setPhase('idle')
      setError(null)
      setView(null)
      setDetail(null)
      setStateData(null)
      setStateBusy(false)
      setStateErr(null)
      setActions(null)
      setActionsBusy(false)
      setActionsErr(null)
      setActiveAction(null)
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
      setLoadedAt(new Date())
      setPhase('ready')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setSessions(null)
      setLogs(null)
      setPhase('unavailable')
    }
  }

  useEffect(() => {
    if (user) {
      load()
      loadState() // state.md powers the status strip's "Current state" card
    }
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

  async function loadState() {
    setStateBusy(true)
    setStateErr(null)
    try {
      const d = await authFetch('/api/control/state')
      setStateData(d)
    } catch (err) {
      setStateErr(err instanceof Error ? err.message : String(err))
    } finally {
      setStateBusy(false)
    }
  }

  // Refresh the strip AND the state card together.
  function refreshAll() {
    load()
    loadState()
  }

  async function loadActions() {
    setActionsBusy(true)
    setActionsErr(null)
    try {
      const d = await authFetch('/api/control/actions')
      setActions(Array.isArray(d?.actions) ? d.actions : [])
    } catch (err) {
      setActionsErr(err instanceof Error ? err.message : String(err))
    } finally {
      setActionsBusy(false)
    }
  }

  async function openAction(id) {
    setActiveAction({ id, loading: true, data: null, error: null })
    try {
      const d = await authFetch(`/api/control/actions/${encodeURIComponent(id)}`)
      setActiveAction({ id, loading: false, data: d, error: null })
    } catch (err) {
      setActiveAction({
        id,
        loading: false,
        data: null,
        error: err instanceof Error ? err.message : String(err),
      })
    }
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
          <StatusStrip
            sessions={sessions}
            logs={logs}
            stateMd={stateData?.files?.state_md}
            loadedAt={loadedAt}
            onRefresh={refreshAll}
          />

          <h2>Conversation sessions</h2>
          <SessionsPanel sessions={sessions} onOpen={openSession} apiFetch={authFetch} />

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

          <h2>State</h2>
          {stateData === null && !stateBusy && (
            <button onClick={loadState}>Load state</button>
          )}
          {stateBusy && <p>Loading…</p>}
          {stateErr && (
            <p className="status-error">Couldn&apos;t load state: {stateErr}</p>
          )}
          {stateData && (
            <section>
              {Array.isArray(stateData.missing) &&
                stateData.missing.length > 0 && (
                  <p className="status-error">
                    Missing files: {stateData.missing.join(', ')}
                  </p>
                )}
              {['state_md', 'decisions_md', 'roadmap_md'].map(
                (k) =>
                  stateData.files?.[k] != null && (
                    <section key={k}>
                      <h3>{k}</h3>
                      <pre className="control-pre">{stateData.files[k]}</pre>
                    </section>
                  )
              )}
            </section>
          )}

          <h2>Actions</h2>
          {actions === null && !actionsBusy && (
            <button onClick={loadActions}>Load actions</button>
          )}
          {actionsBusy && <p>Loading…</p>}
          {actionsErr && (
            <p className="status-error">
              Couldn&apos;t load actions: {actionsErr}
            </p>
          )}
          {actions !== null && actions.length === 0 && (
            <p>No action files found.</p>
          )}
          {actions !== null && actions.length > 0 && (
            <ul className="control-list">
              {actions.map((a) => (
                <li key={a.id}>
                  <button onClick={() => openAction(a.id)}>
                    <strong>{a.id}</strong> — {sizeFmt(a.size)} ·{' '}
                    {a.modified ? timeFmt.format(new Date(a.modified)) : '—'}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {activeAction && (
            <section>
              {activeAction.loading && <p>Loading…</p>}
              {activeAction.error && (
                <p className="status-error">
                  Couldn&apos;t load: {activeAction.error}
                </p>
              )}
              {activeAction.data && (
                <section>
                  <h3>{activeAction.data.id}</h3>
                  <pre className="control-pre">
                    {String(activeAction.data.content ?? '')}
                  </pre>
                </section>
              )}
            </section>
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
                    <TranscriptView
                      sessionId={detail.data.id}
                      initial={detail.data}
                      apiFetch={authFetch}
                    />
                  </section>
                ) : (
                  <LogView
                    date={detail.data.date}
                    logDates={logs.map((l) => String(l.id).replace(/\.md$/, ''))}
                    initial={detail.data}
                    onOpenLog={openLog}
                  />
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