import { useMemo, useState } from 'react'

// Command-center status strip (cc-status). One glance: is the system alive,
// did today's log get written, how many sessions, and what's the current
// state summary. All data comes from the same read-only control API as the
// rest of the panel — nothing here is baked at build time.
//
// Note on "today": state/log files are date-stamped by the runtime's PDT
// calendar (the agent's working day), so "today" is computed in
// America/Los_Angeles regardless of the viewer's own timezone.

const TODAY_FMT = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Los_Angeles',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

function relTime(ts) {
  if (!ts) return 'unknown'
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000))
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

function sizeFmt(n) {
  if (n == null) return '—'
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} kB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

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

export default function StatusStrip({ sessions, logs, stateMd, loadedAt, onRefresh }) {
  const [expanded, setExpanded] = useState(false)

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
    const today = TODAY_FMT.format(new Date())
    const logToday = logList.find((l) => String(l.id).startsWith(today)) || null

    const nowText = extractNowLine(stateMd)
    const nowNote = nowText
      ? nowText.length > 230
        ? (expanded ? nowText : `${nowText.slice(0, 230)}…`)
        : nowText
      : null

    const staleH = lastActive === null ? null : (Date.now() - lastActive) / 3600000
    const dotState =
      lastActive === null ? 'none' : staleH > 2 ? 'quiet' : 'ok'

    return {
      sessionList,
      lastActive,
      totalSize,
      today,
      logToday,
      nowText,
      nowNote,
      dotState,
    }
  }, [sessions, logs, stateMd, expanded])

  return (
    <section className="cc-strip">
      <div className="cc-strip-head">
        <h2>Status</h2>
        <span className="cc-strip-meta">
          updated {relTime(loadedAt ? loadedAt.getTime() : null)}
          {' · '}
          <button className="cc-refresh" onClick={onRefresh}>
            refresh
          </button>
        </span>
      </div>

      <div className="cc-cards">
        <article className="cc-card">
          <h3>Last activity</h3>
          <p className="cc-value">
            <span className={`cc-dot cc-dot--${cards.dotState}`} />
            {cards.lastActive === null ? 'no sessions yet' : relTime(cards.lastActive)}
            {cards.lastActive !== null && (
              <span className="cc-note">
                {' '}
                · most recent session touched{' '}
                {cards.dotState === 'quiet' ? '— quiet more than 2h' : ''}
              </span>
            )}
          </p>
        </article>

        <article className="cc-card">
          <h3>Log today</h3>
          <p className="cc-value">
            {cards.logToday ? '✓ written' : '✗ not found'}
          </p>
          <p className="cc-note">
            {cards.logToday
              ? `${cards.logToday.id} · ${sizeFmt(cards.logToday.size)}`
              : `no log for ${cards.today} yet — the agent logs every cycle`}
          </p>
        </article>

        <article className="cc-card">
          <h3>Sessions</h3>
          <p className="cc-value">
            {cards.sessionList.length}{' '}
            {cards.sessionList.length === 1 ? 'conversation' : 'conversations'} ·{' '}
            {sizeFmt(cards.totalSize)} total
          </p>
          <p className="cc-note">transcripts are read-only, latest first</p>
        </article>

        <article className="cc-card cc-card--wide">
          <h3>Current state</h3>
          {cards.nowNote ? (
            <>
              <p className="cc-value">{cards.nowNote}</p>
              {cards.nowText && cards.nowText.length > 230 && (
                <button className="cc-refresh" onClick={() => setExpanded(!expanded)}>
                  {expanded ? 'less' : 'more'}
                </button>
              )}
            </>
          ) : (
            <p className="cc-value cc-value--muted">
              state not loaded — check the State section below
            </p>
          )}
        </article>
      </div>
    </section>
  )
}
