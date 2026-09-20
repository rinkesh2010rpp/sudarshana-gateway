import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

// P5-inbox surface (shared by Home and /inbox): a two-way door — a visitor can
// put an item in the inbox; the public board below reads the same API. The
// API's moderation gate IS the filter: it serves ONLY items that passed the
// policy check ({submitted, in_progress, completed}), never the raw 'received'
// items — so nothing a stranger types ever appears publicly until it's reviewed.
//
// URL rule (same as status-api): inbox_api uses @modal.asgi_app(label="inbox-api"),
// and an explicit label= becomes the entire URL slug — so the endpoint is
// <label>.modal.run, NOT the webhook's <app>-<function> pattern.
const API_BASE = 'https://rinkesh2010rpp--inbox-api.modal.run'

const statusLabel = {
  submitted: 'In queue',
  in_progress: 'In progress',
  completed: 'Completed',
}

export default function InboxSection({ heading = 'Inbox', intro, showBack = false }) {
  const [items, setItems] = useState(null)
  const [error, setError] = useState(null)
  const [text, setText] = useState('')
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [response, setResponse] = useState(null) // { ok, message }

  async function load() {
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/api/inbox?limit=50`, {
        headers: { accept: 'application/json' },
      })
      if (!res.ok) throw new Error(`API responded ${res.status}`)
      const data = await res.json()
      setItems(Array.isArray(data.items) ? data.items : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setItems(null)
    }
  }

  useEffect(() => {
    load()
    // One fetch on load + manual refresh only — no auto-poll (keeps cost flat
    // and avoids waking the API on every visitor).
  }, [])

  async function onSubmit(e) {
    e.preventDefault()
    if (!text.trim() || submitting) return
    setSubmitting(true)
    setResponse(null)
    try {
      const res = await fetch(`${API_BASE}/api/inbox`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text: text.trim(), name: name.trim() }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.ok) {
        setResponse({ ok: false, message: data.error || `Request failed (${res.status})` })
      } else {
        setResponse({
          ok: true,
          message: data.message || 'Received — thank you.',
        })
        setText('')
        setName('')
        // Refresh the board so the submitter's item shows once it's public.
        load()
      }
    } catch (err) {
      setResponse({
        ok: false,
        message: `Couldn't reach the inbox: ${err instanceof Error ? err.message : String(err)}`,
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="inbox-card">
      <h2>{heading}</h2>
      {intro && <p>{intro}</p>}

      <form className="inbox-form" onSubmit={onSubmit}>
        <label>
          <span className="inbox-label-text">Your item (required)</span>
          <textarea
            className="inbox-field"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={2000}
            placeholder="What would you like Sudarshana to pick up?"
          />
        </label>
        <label>
          <span className="inbox-label-text">Name (optional)</span>
          <input
            className="inbox-field"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            placeholder="anonymous"
          />
        </label>
        <p className="inbox-note">
          Nothing you type here is shown publicly until it passes review; what
          you write becomes the public record if it does.
        </p>
        <button className="inbox-submit" type="submit" disabled={!text.trim() || submitting}>
          {submitting ? 'Sending…' : 'Send to inbox'}
        </button>
      </form>

      {response && (
        <p className={`inbox-response ${response.ok ? 'ok' : 'err'}`}>{response.message}</p>
      )}

      <h3 className="inbox-open-heading">Open items</h3>
      {error && (
        <p className="inbox-empty">
          Couldn't reach the inbox API ({error}). The endpoint may be between
          deploys or cold — try again in a moment. The blog remains the record
          of what's been done.
        </p>
      )}
      {!error && !items && <p className="inbox-empty">Loading…</p>}
      {!error && items && items.length === 0 && (
        <p className="inbox-empty">Nothing in the queue yet. Be the first to leave something.</p>
      )}
      {!error && items && items.length > 0 && (
        <ul className="inbox-list">
          {items.map((it) => (
            <li key={it.id} className="inbox-item">
              <Link className="inbox-item-main" to={`/inbox/${it.id}`}>
                <span className="inbox-item-head">
                  <span>{it.name || 'anonymous'}</span>
                  <span className="inbox-status">{statusLabel[it.status] ?? it.status}</span>
                </span>
                <span className="inbox-item-text">{it.text}</span>
                {it.answer && it.answer.trim() ? (
                  <span className="inbox-item-summary">
                    {it.answer.trim().slice(0, 180)}
                    {it.answer.trim().length > 180 ? '…' : ''}
                  </span>
                ) : it.artifact_link ? (
                  <span className="inbox-item-summary">Result → {it.artifact_link}</span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
      <p className="inbox-card-footer">
        <button onClick={load} disabled={!items && !error ? false : undefined}>
          Refresh
        </button>
        {showBack && <Link to="/">← Back home</Link>}
      </p>
    </section>
  )
}
