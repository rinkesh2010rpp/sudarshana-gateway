import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import netlifyIdentity, { ensureIdentity } from '../identity.js'
import ControlHead from '../components/ControlHead.jsx'
import ControlAsks from '../components/ControlAsks.jsx'
import ControlDone from '../components/ControlDone.jsx'
import { pacificDay } from '../lib/pacific.js'
import SessionsPanel from '../components/SessionsPanel.jsx'
import TranscriptView from '../components/TranscriptView.jsx'
import LogView from '../components/LogView.jsx'
import { sizeFmt } from '../components/format.js'
import { extractNowLine } from '../components/stateText.js'

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
  const { id: routeSession, date: routeDate } = useParams()
  const navigate = useNavigate()
  const filterRef = useRef(null)
  const [showShortcuts, setShowShortcuts] = useState(false)
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
  // cc-usability: one screen per need. Tab bar (Overview | Conversations | Logs |
  // System) replaces the single long vertical stack; an opened transcript/day log
  // REPLACES the main content instead of appending below everything.
  const [tab, setTab] = useState('overview')
  // /control rebuild (11-08): the panel answers three questions, not a file
  // tree. "Am I OK" is served whole by /api/control/overview — fetched
  // separately from the file lists so an undeployed endpoint degrades to one
  // honest notice instead of taking the whole page down.
  const [overview, setOverview] = useState(null)
  const [overviewBusy, setOverviewBusy] = useState(false)
  const [overviewErr, setOverviewErr] = useState(null)
  // Log files are named on the operator's Pacific day, so "Today" on the
  // timeline must use the same day — otherwise an 11pm (or 00:30) cycle files
  // under the wrong heading. pacificDay applies the DST rule; a fixed UTC-8 was
  // wrong from March to November.
  const todayISO = pacificDay()
  const [focusTick, setFocusTick] = useState(0) // '/' on Overview/Logs jumps & focuses session filter


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
      setTab('overview')
      setOverview(null)
      setOverviewBusy(false)
      setOverviewErr(null)
      setFocusTick(0)
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
      loadOverview()
    }
    // load() re-runs when the user object changes (login/logout).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const detailRef = useRef(null)
  // Direct deep links: /control/sessions/:id and /control/logs/:date load
  // straight into that conversation/day (the Netlify /control/* fallback
  // serves index.html for these). Fire once data is ready, skip if the view
  // already matches (so list clicks and prev/next-day nav don't double-fetch).
  // The detail now REPLACES the main content, so scroll to top = focused landing.
  useEffect(() => {
    if (phase !== 'ready') return
    if (
      routeSession &&
      !(view && view.kind === 'session' && view.id === routeSession)
    ) {
      openSession(routeSession)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else if (
      routeDate &&
      !(view && view.kind === 'log' && view.id === routeDate)
    ) {
      openLog(routeDate)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
    // Intentional deps: re-run only when data readiness or the URL changes —
    // openSession/openLog would otherwise be in the closure each render and
    // re-trigger the effect. The view-guard above prevents same-target refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, routeSession, routeDate])

  // Keyboard shortcuts (cc-polish): only while signed in, and never while the
  // user is typing in a field.  ?  toggle help ·  /  focus session filter ·
  //  r  refresh status+state ·  Esc  close detail (or the help card).
  useEffect(() => {
    if (!user) return undefined
    function onKey(e) {
      const t = e.target
      const typing =
        t &&
        (t.tagName === 'INPUT' ||
          t.tagName === 'TEXTAREA' ||
          t.tagName === 'SELECT' ||
          t.isContentEditable)
      if (typing) return
      if (e.key === '?') {
        e.preventDefault()
        setShowShortcuts((v) => !v)
      } else if (e.key === 'Escape') {
        e.preventDefault()
        if (showShortcuts) setShowShortcuts(false)
        else if (view) closeDetail()
      } else if (e.key === '/') {
        e.preventDefault()
        // Filter lives in the Conversations tab; jump there, then focus on mount.
        setTab('conversations')
        setFocusTick((t) => t + 1)
      } else if (e.key.toLowerCase() === 'r') {
        e.preventDefault()
        refreshAll()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // refreshAll/closeDetail are recreated each render; the effect only needs
    // to attach once per signed-in session, keyed on what it actually reads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, showShortcuts, view])

  // '/' shortcut: focus the session filter once the Conversations tab mounts.
  useEffect(() => {
    if (tab === 'conversations' && focusTick > 0) filterRef.current?.focus()
  }, [tab, focusTick])

  async function openSession(id) {
    setView({ kind: 'session', id })
    setDetail({ loading: true, data: null, error: null })
    navigate(`/control/sessions/${encodeURIComponent(id)}`)
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
    navigate(`/control/logs/${encodeURIComponent(date)}`)
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
    navigate('/control')
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

  // The three-question overview (health now; asks + recent work land next).
  // Never fabricates: on failure the block shows the reason, not a green light.
  async function loadOverview() {
    setOverviewBusy(true)
    setOverviewErr(null)
    try {
      const d = await authFetch('/api/control/overview')
      setOverview(d && d.health ? d : null)
      if (!d || !d.health) setOverviewErr('overview returned no health block')
    } catch (err) {
      setOverview(null)
      setOverviewErr(err instanceof Error ? err.message : String(err))
    } finally {
      setOverviewBusy(false)
    }
  }

  // Refresh the strip AND the state card together.
  function refreshAll() {
    load()
    loadState()
    loadOverview()
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

  // The masthead's pill is the same fact the verdict card leads with, one line
  // up: green only when the error count is zero and the store answered.
  const h = overview?.health
  const pillTone = !h
    ? 'unknown'
    : Number(h.errors_24h ?? 0) > 0
      ? 'warn'
      : h.ok
        ? 'ok'
        : 'unknown'
  const pillText = !h
    ? 'reading my state'
    : pillTone === 'ok'
      ? 'running fine'
      : pillTone === 'warn'
        ? 'something went wrong earlier'
        : 'no record of a turn yet'

  return (
    <section>
      <header className="ctrl-top">
        <div className="ctrl-brand">
          <b>Control</b>
          <span>Sudarshana</span>
        </div>
        <div className={`ctrl-pill ctrl-pill--${pillTone}`}>
          <span className="ctrl-pill-dot" aria-hidden="true" />
          {pillText}
        </div>
        <div className="ctrl-who">
          signed in as {user.email} ·{' '}
          {/* The strip that used to hold the refresh link is gone; without this
              the only way to reload the panel is the `r` shortcut. */}
          <button onClick={refreshAll} disabled={overviewBusy}>
            {overviewBusy ? 'refreshing…' : 'Refresh'}
          </button>
          <button onClick={() => netlifyIdentity.logout()}>Sign out</button>
          <button onClick={() => setShowShortcuts((v) => !v)}>⌨ Shortcuts</button>
        </div>
      </header>

      {showShortcuts && (
        <section className="cc-help">
          <p>
            Press <kbd>?</kbd> anywhere (except in a text field) to toggle this
            list.
          </p>
          <ul className="cc-help-list">
            <li><kbd>/</kbd> — jump to the conversation filter</li>
            <li><kbd>r</kbd> — refresh status + state</li>
            <li><kbd>Esc</kbd> — close the open transcript/log (or this help)</li>
          </ul>
        </section>
      )}

      {/* First paint. This used to be one bare "Loading…" for the whole page,
          so for the first ~15 seconds the panel looked like a different, empty
          page and then jumped. The three sections render themselves in their
          busy state instead: same shape, same headings, honest "Checking…". */}
      {(phase === 'idle' || phase === 'loading') && (
        <section>
          <ControlHead data={null} busy err={null} />
          <ControlAsks asks={null} busy err={null} />
          <ControlDone
            items={null}
            busy
            err={null}
            today={todayISO}
            onSeeMore={null}
          />
        </section>
      )}

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
          {!(detail && view) && tab !== 'overview' && (
            <nav className="cc-tabs" aria-label="Control sections">
              {['overview', 'conversations', 'logs', 'system'].map((t) => (
                <button
                  key={t}
                  className={tab === t ? 'cc-tab cc-tab--on' : 'cc-tab'}
                  onClick={() => setTab(t)}
                >
                  {t[0].toUpperCase() + t.slice(1)}
                </button>
              ))}
            </nav>
          )}

          {/* The overview answers three questions: am I OK, what do I need from
              you, what have I done. The old file-browser tabs are demoted to a
              "go deeper" row at the bottom — they are reference, not the story. */}
          {!(detail && view) && tab === 'overview' && (
            <section>
              <ControlHead data={overview} busy={overviewBusy} err={overviewErr} />

              <ControlAsks
                asks={overview?.asks}
                busy={overviewBusy}
                // Two different failures, one honest response: the whole
                // request failed, or the API could read me but not my asks
                // file. Either way the panel must not say "nothing waiting".
                err={overviewErr || overview?.asks_error}
              />

              <ControlDone
                items={overview?.recent_work}
                busy={overviewBusy}
                err={overviewErr || overview?.recent_work_error}
                today={todayISO}
                onSeeMore={() => setTab('logs')}
              />

              <p className="ov-eyebrow ov-eyebrow--deeper">Go deeper</p>
              <nav className="cc-tabs" aria-label="Control sections">
                {['conversations', 'logs', 'system'].map((t) => (
                  <button key={t} className="cc-tab" onClick={() => setTab(t)}>
                    {t[0].toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </nav>
            </section>
          )}

          {/* N2/N3 find + read a conversation. */}
          {!(detail && view) && tab === 'conversations' && (
            <section>
              <h2>Conversation sessions</h2>
              <SessionsPanel
                sessions={sessions}
                onOpen={openSession}
                apiFetch={authFetch}
                filterRef={filterRef}
              />
            </section>
          )}

          {/* N4 what happened on a day. */}
          {!(detail && view) && tab === 'logs' && (
            <section>
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
            </section>
          )}

          {/* N5 machinery: state files + action files, lazy-loaded. */}
          {!(detail && view) && tab === 'system' && (
            <section className="cc-system">
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
              {/* The readable part first: the agent's own now-line, verbatim. */}
              {extractNowLine(stateData.files?.state_md) && (
                <p className="cc-now">
                  {extractNowLine(stateData.files?.state_md)}
                </p>
              )}
              {/* Raw files stay available, but collapsed — machinery is a
                  rare need, and three open dumps is the scroll problem. */}
              {[
                ['state_md', 'state.md'],
                ['decisions_md', 'decisions.md'],
                ['roadmap_md', 'roadmap.md'],
              ].map(
                ([k, label]) =>
                  stateData.files?.[k] != null && (
                    <details className="cc-raw" key={k}>
                      <summary>
                        {label}
                        <span className="cc-raw-size">
                          {' '}
                          · {sizeFmt(stateData.files[k].length)} raw
                        </span>
                      </summary>
                      <pre className="control-pre">{stateData.files[k]}</pre>
                    </details>
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
            </section>
          )}

          {/* N3/N4 focused read: an opened transcript or day log REPLACES the
              main content so it's never buried below other sections. */}
          {detail && view && (
            <section ref={detailRef}>
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