// Shared formatting for the /control panel.
//
// PDT calendar: state/log/session files are date-stamped by the agent's
// working day, which follows America/Los_Angeles — so "today"/"yesterday"
// must be computed in PDT regardless of the viewer's timezone, or the
// groups and log-today check drift near midnight.

const PDT_FMT = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Los_Angeles',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

// Timestamp -> "YYYY-MM-DD" in the runtime's PDT calendar.
export function pdtDate(ms) {
  return PDT_FMT.format(new Date(ms))
}

// Today's "YYYY-MM-DD" in the runtime's PDT calendar.
export function pdtToday() {
  return PDT_FMT.format(new Date())
}

export function relTime(ts) {
  if (!ts) return 'unknown'
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000))
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

export function sizeFmt(n) {
  if (n == null) return '—'
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} kB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}
