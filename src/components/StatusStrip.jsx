import { useMemo } from 'react'
import { pdtToday, relTime, sizeFmt } from './format.js'

// Command-center status strip (cc-status). One glance: is the system alive,
// did today's log get written, how many sessions, and what the agent is
// currently focused on. All data comes from the same read-only control API
// as the rest of the panel — nothing here is baked at build time.
// Calendar note: "today" follows the runtime's PDT day (see format.js).
//
// cc-usability INC-2: this used to be four bordered cards, one of which
// dumped a 230-character paragraph of state.md. The glance is now a single
// line of facts; the focus is one sentence, with the full state one click
// away on the System tab.

// Pull the `**now:**` paragraph out of state.md — that line is the agent's
// own current-state summary, so showing it verbatim is honest by construction.
function extractNowLine(stateMd) {
  if (!stateMd) return null
  const line = stateMd
    .split('\n')
    .find((l) => l.startsWith('**now:**'))
  if (!line) return null
  return line.replace(/^\*\*now:\*\*\s*/, '').trim()
}

// First sentence of the now-line, capped — enough to know what the agent is
// on, not enough to become a wall of text. Cut on a word boundary.
function firstSentence(text, max = 180) {
  if (!text) return null
  const m = text.match(/^(.+?[.!?])(\s|$)/)
  let s = m ? m[1] : text
  if (s.length > max) {
    s = s.slice(0, max)
    const cut = s.lastIndexOf(' ')
    if (cut > 60) s = s.slice(0, cut)
    s = `${s.replace(/[,;:—-]$/, '')}…`
  }
  return s
}

export default function StatusStrip({ sessions, logs, stateMd, loadedAt, onRefresh, onOpenSystem }) {
  const cards = useMemo(() => {
    const sessionList = Array.isArray(sessions) ? sessions : []
    let lastActive = null
    let totalSize = 0
    for (const s of sessionList) {
      if (s.size != null) totalSize += s.size
      const t = s.modified ? new Date(s.modified).getTime() : NaN
      if (!Number.isNaN(t) && (lastActive === null || t > lastActive)) lastActive = t
    }

    const logList = Array.isArray(logs) ? logs : []
    const today = pdtToday()
    const logToday = logList.find((l) => String(l.id).startsWith(today)) || null

    const nowText = extractNowLine(stateMd)
    const focus = firstSentence(nowText)

    const staleH = lastActive === null ? null : (Date.now() - lastActive) / 3600000
    const dotState = lastActive === null ? 'none' : staleH > 2 ? 'quiet' : 'ok'

    return {
      count: sessionList.length,
      lastActive,
      totalSize,
      today,
      logToday,
      nowText,
      focus,
      dotState,
    }
  }, [sessions, logs, stateMd])

  return (
    <section className="cc-strip">
      <div className="cc-glance">
        <span
          className="cc-glance-item"
          title={
            cards.lastActive === null
              ? 'no sessions yet'
              : cards.dotState === 'quiet'
                ? 'no session activity for more than 2h'
                : 'recent session activity'
          }
        >
          <span className={`cc-dot cc-dot--${cards.dotState}`} />
          {cards.lastActive === null ? 'no sessions yet' : `active ${relTime(cards.lastActive)}`}
        </span>
        <span className="cc-glance-sep">·</span>
        <span
          className="cc-glance-item"
          title={
            cards.logToday
              ? `${cards.logToday.id} · ${sizeFmt(cards.logToday.size)}`
              : `no log for ${cards.today} yet — the agent logs every cycle`
          }
        >
          {cards.logToday ? 'log today ✓' : 'log today ✗'}
        </span>
        <span className="cc-glance-sep">·</span>
        <span className="cc-glance-item" title={`${sizeFmt(cards.totalSize)} of transcripts`}>
          {cards.count} {cards.count === 1 ? 'conversation' : 'conversations'}
        </span>
        <span className="cc-glance-meta">
          updated {relTime(loadedAt ? loadedAt.getTime() : null)}
          {' · '}
          <button className="cc-refresh" onClick={onRefresh}>
            refresh
          </button>
        </span>
      </div>

      {cards.focus && (
        <p className="cc-focus">
          <span className="cc-focus-label">Focus</span>
          <span className="cc-focus-text">{cards.focus}</span>
          {onOpenSystem && (
            <button className="cc-refresh cc-focus-more" onClick={onOpenSystem}>
              full state →
            </button>
          )}
        </p>
      )}
    </section>
  )
}
