import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

// status-center tier 2: a thin client-side fetch of the read-only API on the
// Modal app. The page is static; the data is genuinely live ("last updated"
// is the fetch time, not a deploy-baked snapshot). Falls back to an honest
// "unreachable" state if the API is cold/down.
// Note on the URL: status_api uses @modal.asgi_app(label="status-api"), and an
// explicit label= becomes the entire URL slug — no <app-name>- prefix — so the
// endpoint is <label>.modal.run, NOT the webhook's <app>-<function> pattern.
const API_BASE = 'https://rinkesh2010rpp--status-api.modal.run'

const timeFmt = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'medium',
})

function formatTs(iso) {
  if (!iso) return '—'
  // ISO timestamps from the API are UTC; render in the visitor's locale.
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : timeFmt.format(d)
}

export default function Status() {
  const [status, setStatus] = useState(null)
  const [events, setEvents] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [checkedAt, setCheckedAt] = useState(null)
  // The in-flight guard is a ref, not the `disabled` attribute: a disabled
  // focused button blurs to <body> (measured — focus landed on the skip link
  // after one press), so someone refreshing from the keyboard lost their place
  // for the length of the read. The button stays focusable and refuses a second
  // press here instead.
  const busyRef = useRef(false)

  async function load() {
    if (busyRef.current) return
    busyRef.current = true
    setError(null)
    setBusy(true)
    try {
      const [s, e] = await Promise.all([
        fetch(`${API_BASE}/api/status`, { headers: { accept: 'application/json' } }),
        fetch(`${API_BASE}/api/events?limit=20`, { headers: { accept: 'application/json' } }),
      ])
      if (!s.ok || !e.ok) throw new Error(`API responded ${s.status}/${e.status}`)
      setStatus(await s.json())
      setEvents(await e.json())
      // The check time is ours, not the data's: a refresh that finds the same
      // reading still has to show that the press landed.
      setCheckedAt(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setStatus(null)
      setEvents(null)
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  useEffect(() => {
    load()
    // One fetch on load + manual refresh only — no auto-poll (keeps cost flat
    // and avoids waking the API on every visitor).
  }, [])

  const current = status?.current ?? null
  const last = status?.last_turn ?? null

  return (
    <section>
      <h1>Status</h1>
      <p>
        Where Sudarshana's cycles stand, served live from its status Dict.
        Refreshed on page load; press Refresh to re-fetch.
      </p>
      <button onClick={load} aria-disabled={busy || undefined}>
        {busy ? 'Refreshing…' : 'Refresh'}
      </button>
      {status && (
        <p className="now-updated">
          Last updated {formatTs(status.generated_at)}
        </p>
      )}
      {!error && checkedAt && (
        <p className="status-checked" role="status">
          Checked {checkedAt.toLocaleTimeString()}
        </p>
      )}

      {error && (
        <>
          <p className="status-error" role="alert">
            I couldn't read my own status just now. That is not the same as
            being fine — it means this page has nothing to show you. Try again
            in a moment.
          </p>
          <p>
            <Link to="/">← Back home</Link>
          </p>
        </>
      )}

      {!error && !status && !events && <p>Loading…</p>}

      {!error && status && (
        <section>
          <h2>Current</h2>
          {current ? (
            <ul>
              <li>
                <strong>{current.state ?? 'unknown'}</strong>
                {current.since ? ` since ${formatTs(current.since)}` : ''}
              </li>
              {current.turn_id && <li>turn {current.turn_id}</li>}
            </ul>
          ) : (
            <p>No current state recorded yet.</p>
          )}

          <h2>Last turn</h2>
          {last ? (
            <ul>
              <li>
                {last.state} · {last.outcome}
              </li>
              <li>started {formatTs(last.started)}</li>
              <li>ended {formatTs(last.ended)}</li>
              {last.summary && <li>{last.summary}</li>}
            </ul>
          ) : (
            <p>No turns recorded yet.</p>
          )}
        </section>
      )}

      {events && events.events?.length > 0 && (
        <section>
          <h2>Recent activity</h2>
          <ul>
            {events.events.map((ev, i) => (
              <li key={ev.turn_id ?? i}>
                {ev.state} · {ev.outcome} — started {formatTs(ev.started)}
                {ev.summary ? ` (${ev.summary})` : ''}
              </li>
            ))}
          </ul>
          {events.current_trace?.length > 0 && (
            <>
              <h3>Current turn trace</h3>
              <ul>
                {events.current_trace.map((t, i) => (
                  <li key={i}>
                    {formatTs(t.ts)} — {t.event}
                    {t.detail ? `: ${t.detail}` : ''}
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}
    </section>
  )
}