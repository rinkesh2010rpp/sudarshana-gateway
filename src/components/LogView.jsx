import React, { useMemo, useRef, useState } from 'react'

// Daily-log viewer (cc-logs). A single day's log is a small markdown file, so
// the whole thing loads at once. This view adds:
// - prev/next nav over *existing* day files (skips gap days, e.g. the silent
//   10-23..11-03 stretch)
// - in-log search over the loaded day, with match counter + prev/next jump
// - a faint tint on lines carrying a durable-medium flag (Lessons: / durable:)
// - a "marked published?" badge detected from the log's own published marker
//   (present as either `published: yes` or `published: <date>`). It is a
//   marker check, labelled as such — not an assertion about the live blog.

function escRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// A line that flags a durable lesson or pointer worth giving visual weight to.
function isDurable(line) {
  return /Lessons:|durable:/i.test(line)
}

// True when the log content carries a publication marker of its own. Both
// marker spellings seen in practice: "published: yes" and "published: <date>".
function hasPublishedMarker(content) {
  return /^\s*>?\s*\**published\s*:?\s*(?:y(?:es)?|\d{4}-\d{2}-\d{2})/im.test(
    content
  )
}

const Line = React.memo(function Line({ text, idx, cur, durable, q }) {
  let inner
  if (!q) {
    inner = text
  } else {
    const re = new RegExp(`(${escRe(q)})`, 'gi')
    inner = text.split(re).map((p, i) =>
      i % 2 === 1 ? (
        <mark key={i} className={cur ? 'cc-mark-cur' : undefined}>
          {p}
        </mark>
      ) : (
        <span key={i}>{p}</span>
      )
    )
  }
  return (
    <div
      data-line={idx}
      className={durable ? 'cc-log-row cc-log-durable' : 'cc-log-row'}
    >
      {inner}
    </div>
  )
})

export default function LogView({ date, logDates, initial, onOpenLog }) {
  const [query, setQuery] = useState('')
  const [matchIdx, setMatchIdx] = useState(0)
  const boxRef = useRef(null)

  const content = String(initial?.content ?? '')
  const lines = useMemo(() => content.split('\n'), [content])

  // ascending chronological order so index-1 = older day, index+1 = newer
  const sortedDates = useMemo(() => [...logDates].sort(), [logDates])
  const idx = sortedDates.indexOf(date)
  const prevDate = idx > 0 ? sortedDates[idx - 1] : null
  const nextDate = idx >= 0 && idx < sortedDates.length - 1 ? sortedDates[idx + 1] : null
  const published = hasPublishedMarker(content)

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    const out = []
    lines.forEach((l, i) => {
      if (l.toLowerCase().includes(q)) out.push(i)
    })
    return out
  }, [lines, query])

  const q = query.trim()
  // clamp if the match list shrank since the last jump
  const adjIdx = matches.length ? Math.min(matchIdx, matches.length - 1) : 0
  const curMatchLine = matches.length ? matches[adjIdx] : null

  function onQueryChange(value) {
    setQuery(value)
    setMatchIdx(0)
  }

  function jump(i) {
    if (i < 0 || i >= matches.length) return
    setMatchIdx(i)
    const el = boxRef.current && boxRef.current.querySelector(`[data-line="${matches[i]}"]`)
    if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }

  return (
    <section className="cc-log">
      <div className="cc-l-head">
        <div className="cc-l-nav">
          <button
            className="cc-btn"
            disabled={!prevDate}
            onClick={() => onOpenLog(prevDate)}
          >
            ‹ older day
          </button>
          {/* The loaded day IS this document's title, so it is the h2. As a
              span it left the whole log unheaded under the panel's h1. */}
          <h2 className="cc-l-date">{date}</h2>
          <button
            className="cc-btn"
            disabled={!nextDate}
            onClick={() => onOpenLog(nextDate)}
          >
            newer day ›
          </button>
        </div>
        <span
          className={published ? 'cc-l-pub cc-l-pub-yes' : 'cc-l-pub'}
          title={
            published
              ? 'This log carries a published: marker of its own'
              : 'No published: marker found in this log'
          }
        >
          {published ? '✓ marked published' : 'not marked published'}
        </span>
      </div>

      <div className="cc-l-tools">
        <input
          className="cc-l-search"
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search this day's log…"
          aria-label="Search this day's log"
        />
        {q && (
          <>
            <span className="cc-l-count">
              {matches.length} match{matches.length === 1 ? '' : 'es'}
            </span>
            <button
              className="cc-btn"
              onClick={() => jump(adjIdx - 1)}
              disabled={matches.length === 0 || adjIdx === 0}
            >
              ‹ prev
            </button>
            <button
              className="cc-btn"
              onClick={() => jump(adjIdx + 1)}
              disabled={matches.length === 0 || adjIdx >= matches.length - 1}
            >
              next ›
            </button>
          </>
        )}
      </div>

      {content.trim() === '' ? (
        <p>No content in this log day.</p>
      ) : (
        <div className="cc-l-box" ref={boxRef} role="log" aria-label="Daily log">
          {lines.map((t, i) => (
            <Line key={i} idx={i} text={t} q={q} cur={i === curMatchLine} durable={isDurable(t)} />
          ))}
        </div>
      )}
    </section>
  )
}