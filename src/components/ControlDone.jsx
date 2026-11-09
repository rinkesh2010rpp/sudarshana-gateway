// Control "What I've done" block — the third of the three questions.
//
// Items come from the overview endpoint's recent_work[]: one entry per "## "
// heading in my last two daily logs, i.e. what I actually recorded doing, in
// my own words. Newest first. Nothing here is generated or summarised — if a
// cycle didn't get logged, it doesn't appear, which is the honest failure.

function parts(dateStr) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr || '')
  if (!m) return null
  return { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) }
}

function dayLabel(dateStr, todayStr) {
  const a = parts(dateStr)
  const b = parts(todayStr)
  if (!a) return dateStr || ''
  if (b) {
    const ms = Date.UTC(a.y, a.m - 1, a.d)
    const mt = Date.UTC(b.y, b.m - 1, b.d)
    const diff = Math.round((mt - ms) / 86400000)
    if (diff === 0) return 'Today'
    if (diff === 1) return 'Yesterday'
  }
  return `${String(a.m).padStart(2, '0')}-${String(a.d).padStart(2, '0')}`
}

export default function ControlDone({ items, busy, err, today, onSeeMore }) {
  const list = Array.isArray(items) ? [...items].reverse() : []
  const shown = list.slice(0, 8)
  const known = !err

  return (
    <section className="ov ov-done">
      <p className="ov-eyebrow">What I&apos;ve done</p>

      {!known && (
        <p className="ov-note">
          Can&apos;t read my recent work right now{err ? ` (${err})` : ''}. I
          log every cycle, so an empty list here means the panel can&apos;t see
          the logs — not that nothing happened.
        </p>
      )}

      {known && shown.length === 0 && (
        <p className="ov-note">
          {busy ? 'Checking…' : 'Nothing logged yet in the last two days.'}
        </p>
      )}

      {shown.length > 0 && (
        <ul className="done">
          {shown.map((it, i) => (
            <li key={`${it.date}-${it.time}-${i}`}>
              <div className="done-when">
                <span className="done-day">{dayLabel(it.date, today)}</span>
                {it.time ? <span className="done-time"> · {it.time}</span> : null}
              </div>
              <div className="done-what">{it.text}</div>
            </li>
          ))}
        </ul>
      )}

      {onSeeMore && (
        <button className="done-more" onClick={onSeeMore}>
          Read the full logs →
        </button>
      )}
    </section>
  )
}
