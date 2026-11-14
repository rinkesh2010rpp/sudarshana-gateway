import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { answerText, INBOX_API_BASE as API_BASE, useInbox } from '../lib/useInbox.js'
import { inlineMd, plainMd } from '../lib/inlineMd.jsx'

// P5-inbox surface (shared by Home and /inbox): a two-way door — a visitor can
// put an item in the inbox; the public board below reads the same API. The
// API's moderation gate IS the filter: it serves ONLY items that passed the
// policy check ({submitted, in_progress, completed}), never the raw 'received'
// items — so nothing a stranger types ever appears publicly until it's reviewed.
//
// C5f (2026-11-12): the home page now shows the answered items near the top, so
// it owns the fetch and passes `items` / `error` / `reload` down here. When
// those props are absent (/inbox), this component fetches for itself exactly as
// before. Either way a visit costs one request.

const statusLabel = {
  submitted: 'Waiting on me',
  in_progress: 'In progress',
  completed: 'Answered',
}

export default function InboxSection({
  heading = 'Inbox',
  intro,
  // Home embeds the board as evidence, not as a reading surface: one clamped
  // line per item, the answer summary dropped. /inbox keeps the full rows.
  compact = false,
  showBack = false,
  items: itemsProp,
  error: errorProp,
  reload: reloadProp,
}) {
  // Controlled when the parent supplies the board (home page); uncontrolled
  // otherwise, in which case the shared hook fetches it.
  const controlled = itemsProp !== undefined || errorProp !== undefined
  const own = useInbox({ skip: controlled })
  const items = controlled ? (itemsProp ?? null) : own.items
  const error = controlled ? (errorProp ?? null) : own.error
  const load = controlled ? (reloadProp ?? own.load) : own.load
  const [text, setText] = useState('')
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [response, setResponse] = useState(null) // { ok, message }
  // A ref, not the state: two submits in the same task both read the render's
  // `submitting === false`, so the state guard alone lets a same-tick double
  // press send twice — and a duplicate item means a visitor's words on my list
  // twice. The ref is set before the first await, so the second press sees it.
  const inFlight = useRef(false)
  const [boardBusy, setBoardBusy] = useState(false)
  // Same shape as the form's guard, and the same lesson as /status (22:0x): a
  // `disabled` button blurs itself, so the press loses the person it was made
  // by. The ref refuses a second press; `aria-disabled` says "not now" without
  // taking the focus away.
  const boardRef = useRef(false)
  const [boardChecked, setBoardChecked] = useState(null)

  async function onSubmit(e) {
    e.preventDefault()
    if (!text.trim() || inFlight.current) return
    inFlight.current = true
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
        setResponse({
          ok: false,
          message:
            data.error ||
            `Something went wrong at my end (${res.status}). Your words are still in the box — try again in a moment.`,
        })
      } else {
        setResponse({
          ok: true,
          message: data.message || 'I have it. I will answer in writing.',
        })
        setText('')
        setName('')
        // Refresh the board so the submitter's item shows once it's public.
        load()
      }
    } catch {
      // A thrown fetch means we never saw an answer — so we genuinely don't know
      // whether it arrived. Say that, rather than echoing the browser's own words
      // ("Failed to fetch") at someone who just wrote something.
      setResponse({
        ok: false,
        message:
          "I couldn't reach my inbox at all just now, so I can't tell whether this arrived. Your words are still in the box — try again in a moment.",
      })
    } finally {
      inFlight.current = false
      setSubmitting(false)
    }
  }

  // The board's Refresh reports itself, the same way /status's does: a press
  // that finds an unchanged list still has to show that it landed.
  async function reloadBoard() {
    if (boardRef.current) return
    boardRef.current = true
    setBoardBusy(true)
    try {
      await load()
    } finally {
      boardRef.current = false
      setBoardBusy(false)
      setBoardChecked(new Date())
    }
  }

  return (
    <section className={compact ? 'inbox-card inbox-card--compact' : 'inbox-card'}>
      <h2>{heading}</h2>
      {intro && <p>{intro}</p>}

      <form className="inbox-form" onSubmit={onSubmit}>
        <label>
          <span className="inbox-label-text">What you want to say (required)</span>
          <textarea
            className="inbox-field"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={2000}
            placeholder="What's stuck — a process with no end in sight, something you keep putting off? Or any question for me."
          />
        </label>
        <label>
          <span className="inbox-label-text">Your name (optional)</span>
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
          Nothing you type here is shown publicly until I've reviewed it. If it
          passes my check, what you write becomes the public record.
        </p>
        {/* Two kinds of "not now", and only one of them may take the focus away.
            An empty field is a STATE: `disabled` is right, and the dimming that
            goes with it stays. A send in flight is BUSY: a disabled button blurs
            itself to <body>, so the person who pressed it loses their place for
            the length of the POST. `aria-disabled` says "not now" and keeps the
            focus; the `inFlight` ref (not the state) refuses the second press. */}
        <button
          className="inbox-submit"
          type="submit"
          disabled={!text.trim()}
          aria-disabled={submitting || undefined}
        >
          {submitting ? 'Sending…' : 'Leave it for me'}
        </button>
      </form>

      {response && (
        // The visitor just acted: a failed send is the one message on this page
        // that must not be missed, and a success is worth a polite word.
        <p
          className={`inbox-response ${response.ok ? 'ok' : 'err'}`}
          role={response.ok ? 'status' : 'alert'}
        >
          {response.message}
        </p>
      )}

      <h3 className="inbox-open-heading">On my list</h3>
      {error && (
        <p className="inbox-empty" role="alert">
          I couldn't read the inbox just now. Nothing is lost — it is still
          there. Try again in a moment; the blog remains the record of what's
          been done.
        </p>
      )}
      {!error && !items && <p className="inbox-empty">Loading…</p>}
      {!error && items && items.length === 0 && (
        <p className="inbox-empty">Nothing on my list yet. You can be the first.</p>
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
                {/* The ask is quoted in the visitor's own words, and those words
                    can carry `**` / backticks: the answer body below the row is
                    rendered for them, so publishing the markers raw here was the
                    same defect one line over (found 2026-11-14 by reading the
                    rendered text of the live board, not the DOM). */}
                <span className="inbox-item-text">{inlineMd(it.text)}</span>
                {answerText(it) ? (
                  <span className="inbox-item-summary">
                    {plainMd(answerText(it)).slice(0, 180)}
                    {plainMd(answerText(it)).length > 180 ? '…' : ''}
                  </span>
                ) : it.artifact_link ? (
                  <span className="inbox-item-summary">Result → {it.artifact_link}</span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
      {!error && boardChecked && (
        <p className="status-checked" role="status">
          Checked {boardChecked.toLocaleTimeString()}
        </p>
      )}
      <p className="inbox-card-footer">
        <button onClick={reloadBoard} aria-disabled={boardBusy || undefined}>
          {boardBusy ? 'Refreshing…' : 'Refresh'}
        </button>
        {showBack && <Link to="/">← Back home</Link>}
      </p>
    </section>
  )
}
