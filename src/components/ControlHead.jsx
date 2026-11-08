import { relTime } from './format.js'

// Control "Am I OK" block — the first of the three questions the panel answers.
//
// Data comes from the control API's /api/control/overview (health object built
// from the status records). This component renders ONLY what the server sent:
// no derived guesses, no placeholder numbers. When the endpoint is not there
// yet (merged but not deployed, say) it says so plainly instead of showing a
// fake green light — a panel that invents "I'm fine" is worse than one that
// admits it cannot see.

function verdictFor(health) {
  // errors_24h is a trailing-24h count, not "is something broken right now".
  // Saying "something went wrong" as the headline when the last cycle finished
  // clean reads as alarm the data doesn't support — so the headline is the
  // present tense and the blemish is stated in the same sentence.
  if (!health.ok) {
    return { tone: 'warn', text: "I'm running, but something isn't right." }
  }
  if (health.errors24h > 0) {
    const n = health.errors24h
    return {
      tone: 'warn',
      text:
        n === 1
          ? "I'm fine now — one turn went wrong earlier."
          : `I'm fine now — ${n} turns went wrong earlier.`,
    }
  }
  return { tone: 'ok', text: "I'm fine. Nothing is broken." }
}

export default function ControlHead({ data, busy, err }) {
  const health = data?.health
  const errors24h = Number(health?.errors_24h ?? 0)

  if (busy && !health) {
    return (
      <section className="ov" aria-busy="true">
        <p className="ov-eyebrow">Am I OK</p>
        <p className="ov-verdict ov-verdict--unknown">Checking…</p>
      </section>
    )
  }

  if (!health) {
    const notDeployed = /404/.test(err || '')
    return (
      <section className="ov">
        <p className="ov-eyebrow">Am I OK</p>
        <p className="ov-verdict ov-verdict--unknown">
          <span className="ov-dot ov-dot--unknown" aria-hidden="true" />
          I can&apos;t tell you right now.
        </p>
        <p className="ov-note">
          {notDeployed
            ? 'The health endpoint answered 404 — it is built but not deployed yet, so there is nothing honest to show here.'
            : `The health endpoint could not be read${err ? ` (${err})` : ''}.`}
        </p>
      </section>
    )
  }

  const v = verdictFor({ ok: Boolean(health.ok), errors24h })
  const tiles = [
    {
      label: 'Last cycle',
      value: health.last_cycle ? relTime(new Date(health.last_cycle).getTime()) : '—',
      note: health.last_outcome ? `finished ${health.last_outcome}` : 'no record',
    },
    {
      label: 'Turns today',
      value: Number.isFinite(Number(health.turns_today)) ? String(health.turns_today) : '—',
      note: 'since midnight, Pacific',
    },
    {
      label: 'Errors, 24h',
      value: String(errors24h),
      note: 'turns that died or closed wrong',
    },
    {
      label: 'Right now',
      value: health.state ? String(health.state).replace('running-', 'running: ') : '—',
      note: health.since ? `since ${relTime(new Date(health.since).getTime())}` : '',
    },
  ]

  return (
    <section className="ov">
      <p className="ov-eyebrow">Am I OK</p>
      <p className={`ov-verdict ov-verdict--${v.tone}`}>
        <span className={`ov-dot ov-dot--${v.tone}`} aria-hidden="true" />
        {v.text}
      </p>
      <div className="ov-tiles">
        {tiles.map((t) => (
          <div className="ov-tile" key={t.label}>
            <span className="ov-tile-label">{t.label}</span>
            <strong className="ov-tile-value">{t.value}</strong>
            {t.note ? <span className="ov-tile-note">{t.note}</span> : null}
          </div>
        ))}
      </div>
    </section>
  )
}
