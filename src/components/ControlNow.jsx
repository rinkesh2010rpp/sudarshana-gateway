// Control "Now" block — the first thing on the panel, and the answer to the
// only question the rest of the page makes you assemble by hand: what is it
// doing, why, and how far along is it?
//
// The data is the control API's /api/control/overview `report` field, which
// serves the latest report_status from the turn records: doing, why, project,
// done_when, done[], left[], next, plus the `run` that wrote it, `fresh` and
// `missed_runs`. A finished run that never reported is counted as missed, so
// "fresh" is a claim about EVERY finished run since, not just about the report
// existing.
//
// The one rule this block lives or dies by: a stale report must never read as
// a current one. A report from two hours and three silent runs ago is still
// worth reading — it is the last thing I said — but it is labelled as exactly
// that, in the badge, in the amber rule at the top of the card, and again in a
// sentence, rather than shown as "what I'm doing now".
//
// It is a card, not a paragraph dump: the panel's other blocks are surfaces
// (the verdict card, the ask cards, the timeline), and the one thing he opens
// the page for sat between them as loose text with no edges.

function reportedLabel(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  // Pacific, like the asks and the day labels — this panel runs on his
  // calendar day, and a timestamp in his browser's zone would sit on a
  // different clock than every neighbour on the page.
  return d.toLocaleString('en-US', {
    timeZone: 'America/Los_Angeles',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function runLabel(kind) {
  if (kind === 'hourly') return 'hourly wake-up'
  if (kind === 'telegram') return 'your message'
  if (kind === 'self-task') return 'self-set task'
  return kind ? `${kind} run` : 'a run'
}

function plural(n, word) {
  return `${n} ${word}${n === 1 ? '' : 's'}`
}

export default function ControlNow({ report, busy, err }) {
  const known = !err && !!report && typeof report === 'object'
  const run = known && report.run ? report.run : null
  const fresh = freshOf(report)
  const missed = known ? Math.max(0, Number(report.missed_runs) || 0) : 0
  // The stale skin only applies to a report there is something to show for.
  const stale = known && !!run && !fresh

  return (
    <section
      className={`ov-now${stale ? ' ov-now--stale' : ''}`}
      aria-labelledby="now-h"
    >
      <div className="now-strip">
        <h2 id="now-h">Now</h2>
        <FreshBadge known={known} busy={busy} err={err} run={run} fresh={fresh} />
        {report?.project ? <code className="now-proj">{report.project}</code> : null}
        {run && (
          <span className="now-stamp">
            {reportedLabel(report.reported_at) || 'time unknown'} · {runLabel(run.kind)}
            {run.outcome && !['done', 'ok', 'completed'].includes(run.outcome)
              ? ` · ended ${run.outcome}`
              : ''}
          </span>
        )}
      </div>

      {!known && err && (
        // Polite, like the asks: the verdict card below is the assertive one.
        // With the records unreadable there is no report to show, so this says
        // that instead of falling back to the last one on disk and calling it
        // current.
        <p className="ov-note" role="status">
          Can&apos;t read my latest report right now ({err}) — so I&apos;m not
          showing an older one as if it were current.
        </p>
      )}

      {!known && !err && busy && (
        <div className="now-skeleton" aria-busy="true">
          <span className="now-bar" />
          <span className="now-bar now-bar--short" />
        </div>
      )}

      {!known && !err && !busy && (
        <p className="ov-note">
          No report to read — the overview returned none and named no reason.
        </p>
      )}

      {known && !run && (
        <p className="ov-note">
          No run has reported yet
          {missed > 0
            ? `, and ${plural(missed, 'finished run')} since reporting began wrote none`
            : ''}
          .
        </p>
      )}

      {known && run && (
        <>
          {stale && (
            <p className="now-stale">
              <strong>Not current.</strong>{' '}
              {missed > 0
                ? `${plural(missed, 'finished run')} since this one ended without reporting.`
                : 'I cannot confirm this one is current.'}{' '}
              This is the last thing I said, not what I&apos;m doing now.
            </p>
          )}

          {/* Words on the left, state on the right: the card is dense at a
              glance instead of a column of text with a dead margin. */}
          <div className="now-body">
            <div className="now-main">
              <p className="now-doing">{report.doing}</p>

              {report.why ? (
                <p className="now-why">
                  <span className="now-label">Why</span>
                  {report.why}
                </p>
              ) : null}
            </div>

            {(report.done?.length > 0 || report.left?.length > 0) && (
              <div className="now-lists">
              {report.done?.length > 0 && (
                <div className="now-panel">
                  <p className="now-panel-head">
                    Done
                    <span className="now-count">{report.done.length}</span>
                  </p>
                  <ul className="now-list now-list--done">
                    {report.done.map((it, i) => (
                      <li key={`d${i}`}>{it}</li>
                    ))}
                  </ul>
                </div>
              )}
              {report.left?.length > 0 && (
                <div className="now-panel now-panel--left">
                  <p className="now-panel-head">
                    Left
                    <span className="now-count">{report.left.length}</span>
                  </p>
                  <ul className="now-list now-list--left">
                    {report.left.map((it, i) => (
                      <li key={`l${i}`}>{it}</li>
                    ))}
                  </ul>
                </div>
                )}
              </div>
            )}
          </div>

          {(report.next || report.project || report.done_when) && (
            <div className="now-foot">
              {report.next ? (
                <p className="now-next">
                  <span className="now-label">Next</span>
                  {report.next}
                </p>
              ) : null}
              {report.done_when ? (
                <p className="now-donewhen">
                  <span className="now-label">done when</span> {report.done_when}
                </p>
              ) : null}
            </div>
          )}
        </>
      )}
    </section>
  )
}

// `fresh` is only true when every finished run since this report wrote one
// too. Anything else — no flag, a string, a missing field — is not fresh:
// an unknown freshness must not borrow the confident label.
function freshOf(report) {
  return !!report && report.fresh === true && !!report.run
}

function FreshBadge({ known, busy, err, run, fresh }) {
  if (err) {
    return <span className="now-badge">can&apos;t read it</span>
  }
  if (!known) {
    return (
      <span className="now-badge" aria-busy={busy || undefined}>
        {busy ? 'reading' : 'no report'}
      </span>
    )
  }
  if (!run) {
    return <span className="now-badge now-badge--warn">no report yet</span>
  }
  return fresh ? (
    <span className="now-badge now-badge--ok">
      <span className="now-dot" aria-hidden="true" />
      current
    </span>
  ) : (
    <span className="now-badge now-badge--warn">
      <span className="now-dot" aria-hidden="true" />
      out of date
    </span>
  )
}
