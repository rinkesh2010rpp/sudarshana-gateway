// Control "What I need from you" block — the second of the three questions.
//
// The asks come from the control API's /api/control/overview (asks[]), which
// serves memory/asks.json verbatim. This is deliberately the loudest thing on
// the page: a decision sitting with the operator is the only thing that
// actually blocks the work. An empty list is a real answer — "nothing" — and
// must never look like a loading state or a broken panel.

function waited(hours) {
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
  return d.toLocaleString(undefined, {
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
    <section className="ov ov-asks">
      <p className="ov-eyebrow">What I need from you</p>

      {!known && (
        <p className="ov-note">
          Can&apos;t read the ask list right now{err ? ` (${err})` : ''} — so
          I&apos;m not going to claim there&apos;s nothing waiting.
        </p>
      )}

      {known && busy && list.length === 0 && (
        <p className="ov-note">Checking…</p>
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
