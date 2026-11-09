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
  // errors_24h is a trailing-24h count, not "is something broken right now" —
  // so the headline leads with the present tense and states the blemish in the
  // same sentence, rather than raising alarm the data doesn't support.
  //
  // Careful: the server's `ok` means "there are records and nothing went wrong
  // in the last 24h", so it is necessarily false whenever errors24h > 0. Gating
  // the earlier-turn sentence behind `ok` (as this did) made it unreachable —
  // every one of those cases fell through to "something isn't right". Branch on
  // the count itself, and use `ok` only to spot the case where there is no
  // record at all.
  const n = health.errors24h
  if (n > 0) {
    return {
      tone: 'warn',
      text:
        n === 1
          ? "I'm fine now — one turn went wrong earlier."
          : `I'm fine now — ${n} turns went wrong earlier.`,
    }
  }
  if (!health.ok) {
    // No errors and still not "ok" can only mean the record set is empty: a
    // fresh install, or every record aged out. That is not a green light.
    return {
      tone: 'unknown',
      text: "I'm up, but I have no record of a turn yet.",
    }
  }
  return { tone: 'ok', text: "I'm fine. Nothing is broken." }
}

function outcomeNote(outcome) {
  // The newest record can be the turn running right now — it has not finished,
  // and the zombie outcome never finished either. Saying "finished running"
  // would be a small lie in the tile.
  //
  // The tile also must not print the outcome's internal name: it read
  // "finished done" and "finished step-limit", which is a database field
  // leaking onto a page written in plain words.
  if (!outcome) return 'no record'
  if (outcome === 'running') return 'in progress'
  if (outcome === 'zombie') return 'died mid-run'
  if (outcome === 'done') return 'finished cleanly'
  if (outcome === 'step-limit') return 'hit the step limit'
  return 'finished, but not cleanly'
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

  if (health.records_error) {
    // "I read no turns" and "I could not read my turns" are different facts.
    // Rendering the second as zero turns today / zero errors would be a quiet
    // green light on a blind agent, and "something isn't right" would blame an
    // unseen problem on the agent rather than on the read.
    return (
      <section className="ov">
        <p className="ov-eyebrow">Am I OK</p>
        <p className="ov-verdict ov-verdict--unknown">
          <span className="ov-dot ov-dot--unknown" aria-hidden="true" />
          I can&apos;t see my own status records.
        </p>
        <p className="ov-note">
          This isn&apos;t a verdict — {health.records_error}. No turn or error
          count is shown, because neither could be measured.
        </p>
      </section>
    )
  }

  const v = verdictFor({ ok: Boolean(health.ok), errors24h })
  const tiles = [
    {
      label: 'Last cycle',
      value: health.last_cycle ? relTime(new Date(health.last_cycle).getTime()) : '—',
      note: outcomeNote(health.last_outcome),
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
