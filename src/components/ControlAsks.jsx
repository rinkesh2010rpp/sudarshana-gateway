// Control "What I need from you" block — the second of the three questions.
//
// The asks come from the control API's /api/control/overview (asks[]), which
// serves memory/asks.json verbatim. This is deliberately the loudest thing on
// the page: a decision sitting with the operator is the only thing that
// actually blocks the work. An empty list is a real answer — "nothing" — and
// must never look like a loading state or a broken panel.

function waited(hours) {
  // An unknown wait is not a short one. `Number(null)` is 0, so a null
  // waiting_hours used to render as "just now" — the most reassuring possible
  // label attached to the least-known case, which is exactly backwards. Ask
  // entries are hand-written, so a mistyped date is a real possibility.
  if (hours === null || hours === undefined || hours === '') return null
  const h = Number(hours)
  if (!Number.isFinite(h) || h < 0) return null
  if (h < 1) return 'just asked'
  if (h < 36) return `waiting ${Math.round(h)} hour${Math.round(h) === 1 ? '' : 's'}`
  const days = Math.round(h / 24)
  return `waiting ${days} day${days === 1 ? '' : 's'}`
}

function askedLabel(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  // Pacific, like the day labels and the turn count — the rest of this panel
  // runs on his calendar day, so an ask timestamp in the reader's timezone
  // (or UTC in a headless build) would sit on a different clock than its
  // neighbours.
  return d.toLocaleString('en-US', {
    timeZone: 'America/Los_Angeles',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function ControlAsks({ asks, busy, err }) {
  const list = Array.isArray(asks) ? asks : []
  const known = !err

  return (
    <section className="ov-asks">
      <div className="ctrl-qhead">
        <h2>What I need from you</h2>
        {known && list.length > 0 ? (
          <span className="ctrl-count">
            {list.length} open
          </span>
        ) : null}
        <span className="ctrl-hint">Answer these and I can move.</span>
      </div>

      {!known && (
        // role="status", not "alert": when the whole request fails this fires
        // alongside the verdict's alert, and three assertive announcements at
        // once is noise. The verdict is the urgent one; this is polite.
        <p className="ov-note" role="status">
          Can&apos;t read the ask list right now{err ? ` (${err})` : ''} — so
          I&apos;m not going to claim there&apos;s nothing waiting.
        </p>
      )}

      {known && busy && list.length === 0 && (
        // Same box the empty answer uses, so the section does not shrink to a
        // line and then grow back when the list arrives.
        <div className="ov-empty" aria-busy="true">
          <strong>Checking…</strong>
          <span>Reading my ask list.</span>
        </div>
      )}

      {known && !busy && list.length === 0 && (
        <div className="ov-empty">
          <strong>Nothing — I&apos;m working.</strong>
          <span>
            Decisions that need you show up here, and stay here until they move.
          </span>
        </div>
      )}

      {list.length > 0 && (
        <ul className="ov-ask-list">
          {list.map((a) => {
            const when = waited(a.waiting_hours)
            const at = askedLabel(a.asked_at)
            return (
              <li className="ov-ask" key={a.id || a.ask}>
                <div className="ov-ask-head">
                  <strong>{a.ask}</strong>
                  {when ? <span className="ov-ask-wait">{when}</span> : null}
                </div>
                {a.detail ? <p className="ov-ask-detail">{a.detail}</p> : null}
                {at ? <span className="ov-ask-meta">asked {at}</span> : null}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
