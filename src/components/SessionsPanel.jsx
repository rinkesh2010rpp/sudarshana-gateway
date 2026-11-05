import { useEffect, useMemo, useState } from 'react'
import { pdtDate, pdtToday, relTime, sizeFmt } from './format.js'

// Session list (cc-sessions): the "find that conversation" view. Session
// files are named session_<hash>.md — opaque — so each row fetches a tiny
// first-lines snippet from the transcript endpoint (page=1&per_page=4,
// server-sliced) to make conversations identifiable at a glance.
// Sort: newest first. Grouping: the runtime's PDT calendar. Filter: matches
// id or snippet text, client-side only.

const DAY = 86400000
const SNIPPET_LINES = 4
const MAX_SNIPPET_FETCHES = 40

function groupFor(ms) {
  if (!Number.isFinite(ms)) return 'Older'
  const today = pdtToday()
  const yesterday = pdtDate(Date.now() - DAY)
  const d = pdtDate(ms)
  if (d === today) return 'Today'
  if (d === yesterday) return 'Yesterday'
  if (Date.now() - ms < 7 * DAY) return 'Past 7 days'
  return 'Older'
}

function snippetText(lines) {
  const text = (lines || [])
    .map((l) => l.trim())
    .filter(Boolean)
    .join(' ')
  return text.length > 180 ? `${text.slice(0, 180).trimEnd()}…` : text
}

export default function SessionsPanel({ sessions, onOpen, apiFetch, filterRef }) {
  const [query, setQuery] = useState('')
  // id -> { state: 'ok'|'err', text?, total? }
  const [snippets, setSnippets] = useState({})

  const sorted = useMemo(
    () =>
      [...(Array.isArray(sessions) ? sessions : [])].sort((a, b) =>
        String(b.modified || '').localeCompare(String(a.modified || ''))
      ),
    [sessions]
  )

  const q = query.trim().toLowerCase()
  const filtered = useMemo(
    () =>
      q
        ? sorted.filter(
            (s) =>
              s.id.toLowerCase().includes(q) ||
              (snippets[s.id]?.text || '').toLowerCase().includes(q)
          )
        : sorted,
    [sorted, q, snippets]
  )

  const grouped = useMemo(() => {
    const order = ['Today', 'Yesterday', 'Past 7 days', 'Older']
    const map = new Map()
    for (const s of filtered) {
      const key = groupFor(s.modified ? new Date(s.modified).getTime() : NaN)
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(s)
    }
    return order.filter((k) => map.has(k)).map((k) => [k, map.get(k)])
  }, [filtered])

  // Fetch snippets for visible rows that don't have one yet (bounded).
  const toFetch = useMemo(
    () =>
      filtered
        .filter((s) => snippets[s.id] === undefined)
        .slice(0, MAX_SNIPPET_FETCHES)
        .map((s) => s.id),
    [filtered, snippets]
  )

  useEffect(() => {
    if (toFetch.length === 0) return
    let cancelled = false
    const requests = toFetch.map((id) =>
      apiFetch(
        `/api/control/sessions/${encodeURIComponent(id)}?page=1&per_page=${SNIPPET_LINES}`
      )
        .then((d) => ({
          id,
          ok: true,
          text: snippetText(d?.lines),
          total: d?.total_lines ?? null,
        }))
        .catch(() => ({ id, ok: false, text: null, total: null }))
    )
    Promise.all(requests).then((results) => {
      if (cancelled) return
      setSnippets((prev) => {
        const next = { ...prev }
        for (const r of results) {
          if (next[r.id] === undefined) {
            next[r.id] = r.ok
              ? { state: 'ok', text: r.text, total: r.total }
              : { state: 'err', text: null, total: null }
          }
        }
        return next
      })
    })
    return () => {
      cancelled = true
    }
    // toFetch.join isolates the effect from array identity churn.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toFetch.join('|'), apiFetch])

  if (sorted.length === 0) return <p>No conversation sessions found.</p>

  return (
    <section className="cc-sessions">
      <input
        ref={filterRef}
        className="cc-filter"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={`Filter ${sorted.length} session${sorted.length === 1 ? '' : 's'} by id or content…`}
        aria-label="Filter sessions"
      />
      {grouped.length === 0 && (
        <p className="status-error">No sessions match “{query}”.</p>
      )}
      {grouped.map(([label, list]) => (
        <div className="cc-group" key={label}>
          <h3 className="cc-group-head">
            {label} <span className="cc-group-count">{list.length}</span>
          </h3>
          <ul className="control-list">
            {list.map((s) => {
              const snip = snippets[s.id]
              return (
                <li key={s.id}>
                  <button
                    className="cc-session-open"
                    onClick={() => onOpen(s.id)}
                    title={s.id}
                  >
                    <span className="cc-session-name">{s.id}</span>
                    <span className="cc-session-meta">
                      {s.modified ? relTime(new Date(s.modified).getTime()) : '—'} · {sizeFmt(s.size)}
                      {snip?.state === 'ok' && snip.total != null
                        ? ` · ${snip.total.toLocaleString()} lines`
                        : ''}
                    </span>
                    {snip?.state === 'ok' && snip.text ? (
                      <span className="cc-snippet">{snip.text}</span>
                    ) : snip?.state === 'err' ? (
                      <span className="cc-snippet cc-snippet--err">
                        snippet unavailable
                      </span>
                    ) : (
                      <span className="cc-snippet cc-snippet--pending">…</span>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </section>
  )
}
