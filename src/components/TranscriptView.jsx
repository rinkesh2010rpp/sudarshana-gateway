import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { parseBlocks } from './transcriptParse.js'

// Transcript viewer (cc-transcript). A session transcript is a growing file;
// the control API always slices server-side, so the viewer works in windows:
// - initial window: the latest lines (tail=N, as opened from the list)
// - "load older": page-based backfill through the same endpoint, prepended
//   without losing the reader's place (scroll anchoring)
// - search: client-side over the LOADED WINDOW only — the meta line says
//   exactly which lines are in view, and that honesty is the point
// - gutter: 1-based line numbers, clickable-to-scroll omitted; keep simple

const PER_PAGE = 200

function escRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const Line = React.memo(function Line({ text, cur, q }) {
  if (!q) return <>{text}</>
  const parts = String(text).split(new RegExp(`(${escRe(q)})`, 'gi'))
  return (
    <>
      {parts.map((p, i) =>
        p.toLowerCase() === q.toLowerCase() ? (
          <mark key={i} className={cur ? 'cc-mark-cur' : undefined}>
            {p}
          </mark>
        ) : (
          <span key={i}>{p}</span>
        )
      )}
    </>
  )
})

export default function TranscriptView({ sessionId, initial, apiFetch }) {
  // lines: contiguous window of {n (1-based), text}; earliest: 0-based index
  // of the first loaded line; total: total_lines from the server.
  const [lines, setLines] = useState([])
  const [total, setTotal] = useState(null)
  const [earliest, setEarliest] = useState(null)
  const [olderBusy, setOlderBusy] = useState(false)
  const [olderErr, setOlderErr] = useState(null)
  const [query, setQuery] = useState('')
  const [matchIdx, setMatchIdx] = useState(0)
  const boxRef = useRef(null)
  const pendingAnchor = useRef(null) // scroll-anchor captured at fetch time

  useEffect(() => {
    const d = initial || {}
    const items = Array.isArray(d.lines) ? d.lines : []
    const start = d.start_line ?? 0
    setLines(items.map((text, i) => ({ n: start + i + 1, text })))
    setTotal(d.total_lines ?? null)
    setEarliest(start)
    setOlderBusy(false)
    setOlderErr(null)
    setQuery('')
    setMatchIdx(0)
  }, [sessionId, initial]) // parent's tail fetch; reset per (session, data)

  // Per-render scroll anchoring: when older lines were prepended above the
  // reader's position, keep that position steady instead of jumping. The box
  // is now document-flow (no inner scrollbar), so compensate the *window*
  // scroll by however far the anchor line moved down the page.
  useLayoutEffect(() => {
    const pending = pendingAnchor.current
    if (!pending || !boxRef.current) return
    const box = boxRef.current
    const el = box.querySelector(`[data-line="${earliest}"]`)
    if (el) {
      window.scrollBy({ top: el.offsetTop - pending.anchorTop })
    } else {
      window.scrollBy({ top: box.scrollHeight - pending.beforeScrollH })
    }
    pendingAnchor.current = null
  })

  async function loadOlder() {
    if (olderBusy || earliest == null || earliest <= 0) return
    setOlderBusy(true)
    setOlderErr(null)
    const box = boxRef.current
    const anchor = box ? box.querySelector(`[data-line="${earliest}"]`) : null
    pendingAnchor.current =
      box && anchor
        ? { anchorTop: anchor.offsetTop, beforeScrollH: box.scrollHeight }
        : null
    try {
      // page = ceil(earliest / PER_PAGE) guarantees the returned window
      // [start, earlier) never leaves a gap behind it; the filter below
      // drops any overlap with what is already loaded.
      const page = Math.max(1, Math.ceil((earliest + 1) / PER_PAGE))
      const d = await apiFetch(
        `/api/control/sessions/${encodeURIComponent(sessionId)}?page=${page}&per_page=${PER_PAGE}`
      )
      const items = Array.isArray(d.lines) ? d.lines : []
      const nextStart = d.start_line ?? 0
      const fresh = items
        .filter((text, i) => nextStart + i < earliest)
        .map((text, i) => ({ n: nextStart + i + 1, text }))
      if (fresh.length > 0) {
        setLines((prev) => [...fresh, ...prev])
        setEarliest(nextStart)
      } else {
        setEarliest(0) // nothing older reachable — stop offering
      }
      if (d.total_lines != null) setTotal(d.total_lines)
    } catch (err) {
      setOlderErr(err instanceof Error ? err.message : String(err))
      pendingAnchor.current = null
    } finally {
      setOlderBusy(false)
    }
  }

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    const out = []
    lines.forEach((l, i) => {
      if (l.text.toLowerCase().includes(q)) out.push(i)
    })
    return out
  }, [lines, query])

  // Group the raw line window into readable conversation blocks. Re-parsed on
  // every prepend (load older) so the window and the blocks never diverge.
  const blocks = useMemo(() => parseBlocks(lines), [lines])

  // While a search is active, force tool-call/result details open so a hit
  // inside them is visible; cleared search lets the user toggle freely.
  const forceOpen = query.trim() ? true : undefined

  useEffect(() => {
    setMatchIdx(0)
    if (matches.length === 0) return
    const box = boxRef.current
    const el = box && box.querySelector(`[data-line="${lines[matches[0]].n}"]`)
    if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' })
    // jump to the first match when the query changes; match cycling is manual
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  function jumpTo(i) {
    if (i < 0 || i >= matches.length) return
    setMatchIdx(i)
    const el = boxRef.current && boxRef.current.querySelector(`[data-line="${lines[matches[i]].n}"]`)
    if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }

  const q = query.trim()
  const curLine = matches.length ? lines[matches[matchIdx]]?.n : null
  const firstShown = lines.length ? lines[0].n : null
  const lastShown = lines.length ? lines[lines.length - 1].n : null

  return (
    <section className="cc-transcript">
      <div className="cc-t-toolbar">
        <input
          className="cc-t-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search loaded window…"
          aria-label="Search transcript (loaded window)"
        />
        {q && (
          <>
            <span className="cc-t-count">
              {matches.length} match{matches.length === 1 ? '' : 'es'}
            </span>
            <button
              className="cc-btn"
              onClick={() => jumpTo(matchIdx - 1)}
              disabled={matches.length === 0 || matchIdx === 0}
            >
              ‹ prev
            </button>
            <button
              className="cc-btn"
              onClick={() => jumpTo(matchIdx + 1)}
              disabled={matches.length === 0 || matchIdx >= matches.length - 1}
            >
              next ›
            </button>
          </>
        )}
        <span className="cc-t-meta">
          showing {firstShown ?? '—'}–{lastShown ?? '—'} of {total ?? '—'} lines
          {q ? ' · search covers the loaded window only' : ''}
        </span>
      </div>

      {lines.length === 0 && <p className="status-error">No transcript lines.</p>}

      <div className="cc-t-box" ref={boxRef} role="log" aria-label="Conversation">
        {blocks.map((b) =>
          b.kind === 'summary' ? (
            <div className="cc-tmsg cc-role-summary" key={b.n} data-line={b.n}>
              <span className="cc-tno">{b.n}</span>
              <span className="cc-ttext cc-sum">
                <span className="cc-role-label">checkpoint</span> {b.text}
              </span>
            </div>
          ) : b.kind === 'plain' ? (
            <div className="cc-tmsg cc-role-plain" key={b.n} data-line={b.n}>
              <span className="cc-tno">{b.n}</span>
              <span className="cc-ttext">
                <Line text={b.rows[0].text} q={q} cur={b.rows[0].n === curLine} />
              </span>
            </div>
          ) : (
            <div className={`cc-tmsg cc-role-${b.role.key}`} key={b.n} data-line={b.n}>
              <span className="cc-tno">{b.n}</span>
              <div className="cc-tbody">
                <span className="cc-role-label">{b.role.label}</span>
                {b.rows.map((r) =>
                  r.t === 'toolcall' ? (
                    <details
                      className="cc-tdetails cc-td-call"
                      key={r.n}
                      data-line={r.n}
                      open={forceOpen}
                    >
                      <summary className="cc-td-sum">⚙ tool → {r.name}</summary>
                      <pre className="cc-td-json">{r.json}</pre>
                    </details>
                  ) : r.t === 'toolresult' ? (
                    <details
                      className="cc-tdetails cc-td-result"
                      key={r.n}
                      data-line={r.n}
                      open={forceOpen}
                    >
                      <summary className="cc-td-sum">⚙ tool response</summary>
                      <pre className="cc-td-json">{r.text}</pre>
                    </details>
                  ) : (
                    <p className="cc-p" key={r.n} data-line={r.n}>
                      <Line text={r.text} q={q} cur={r.n === curLine} />
                    </p>
                  )
                )}
              </div>
            </div>
          )
        )}
      </div>

      {earliest != null && earliest > 0 && (
        <p className="cc-t-more">
          {olderErr ? (
            <span className="status-error">
              Couldn&apos;t load older lines: {olderErr}{' '}
              <button className="cc-btn" onClick={loadOlder}>
                retry
              </button>
            </span>
          ) : olderBusy ? (
            'Loading older lines…'
          ) : (
            <button className="cc-btn" onClick={loadOlder}>
              Load older lines (earlier part of this conversation)…
            </button>
          )}
        </p>
      )}
    </section>
  )
}
