// Control "Roadmap" tab — initiatives -> tasks, straight from the roadmap store.
//
// The store the roadmap tools own serves records, not prose: status, priority,
// each task with its handoff and deliverables, and the path of the initiative's
// doc. This view renders those records in the order they arrive (the API sorts
// open-before-closed, then priority — re-sorting here would be a second opinion
// about the queue) and opens a doc on request through
// /api/control/roadmap/{id}/doc.
//
// Two failures must never pass for an answer. A store that could not be read
// arrives as `error` on the payload, not as an empty list, so it renders as an
// alert naming the reason; an initiative whose doc file is gone says "doc
// missing" instead of offering a button that can only 404; and a task with no
// handoff written says so, rather than leaving a blank line that reads like one.

import { useCallback, useEffect, useRef, useState } from 'react'
import { sizeFmt } from './format.js'

// Tone only repeats what the word already says, and the word is always there —
// a reader who can't see colour loses nothing.
const TONE = {
  proposed: 'idle',
  todo: 'idle',
  active: 'live',
  doing: 'live',
  waiting: 'wait',
  blocked: 'wait',
  done: 'shut',
  declined: 'shut',
  dropped: 'shut',
}

function Status({ status }) {
  const word = String(status || 'unknown')
  return (
    <span className={`rm-status rm-status--${TONE[word] || 'idle'}`}>
      {word}
    </span>
  )
}

function Deliverable({ value }) {
  const text = String(value ?? '')
  if (/^https?:\/\//i.test(text)) {
    return (
      <a href={text} target="_blank" rel="noreferrer">
        {text}
      </a>
    )
  }
  return <code className="rm-path">{text}</code>
}

export default function ControlRoadmap({ apiFetch }) {
  const [data, setData] = useState(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const [checked, setChecked] = useState(null)
  // null = the list; otherwise the doc being read (loading, loaded or failed).
  const [doc, setDoc] = useState(null)
  const [landTick, setLandTick] = useState(0)
  const busyRef = useRef(false)
  const hadData = useRef(false)
  // apiFetch is re-created on every render of the page, so holding it in a ref
  // is what lets load() keep a stable identity for the mount effect. The ref is
  // synced in its own effect, declared first so it lands before load() runs.
  const fetchRef = useRef(apiFetch)
  const listHead = useRef(null)
  const docHead = useRef(null)

  useEffect(() => {
    fetchRef.current = apiFetch
  }, [apiFetch])

  const load = useCallback(async () => {
    if (busyRef.current) return
    busyRef.current = true
    setBusy(true)
    setErr(null)
    try {
      const d = await fetchRef.current('/api/control/roadmap')
      if (!d || !Array.isArray(d.initiatives)) {
        // A 200 that isn't the shape we asked for is a failure, not an empty
        // roadmap — say so rather than rendering "no initiatives".
        setData(null)
        setErr('the roadmap response carried no initiatives list')
      } else {
        setData(d)
        setChecked({ at: new Date(), how: hadData.current ? 'again' : 'first' })
        hadData.current = true
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // A press that replaces the panel lands focus on the heading that names the
  // new panel — and draws no ring (`.ctrl-land`), same as the page's own
  // detail views. Without this, opening a doc dropped focus to <body>.
  const docId = doc ? doc.id : null
  useEffect(() => {
    if (docId && docHead.current) docHead.current.focus()
  }, [docId])
  useEffect(() => {
    if (landTick > 0 && listHead.current) listHead.current.focus()
  }, [landTick])

  async function openDoc(id) {
    setDoc({ id, loading: true, data: null, error: null })
    try {
      const d = await fetchRef.current(
        `/api/control/roadmap/${encodeURIComponent(id)}/doc`
      )
      setDoc({ id, loading: false, data: d, error: null })
    } catch (e) {
      setDoc({
        id,
        loading: false,
        data: null,
        error: e instanceof Error ? e.message : String(e),
      })
    }
  }

  function closeDoc() {
    setDoc(null)
    setLandTick((t) => t + 1)
  }

  if (doc) {
    return (
      <section className="cc-roadmap">
        <p>
          <button onClick={closeDoc}>← back to the roadmap</button>
        </p>
        <h2 className="cc-detail-title ctrl-land" ref={docHead} tabIndex={-1}>
          Doc: {doc.id}
        </h2>
        {doc.loading && <p role="status">Reading the doc…</p>}
        {doc.error && (
          <p className="status-error" role="alert">
            Couldn&apos;t open this doc: {doc.error}
          </p>
        )}
        {doc.data && (
          <section>
            <p className="rm-meta">
              <code className="rm-path">{doc.data.doc}</code> ·{' '}
              {sizeFmt(doc.data.size)}
            </p>
            {doc.data.truncated && (
              <p className="status-error" role="alert">
                This doc is longer than the API serves in one piece — showing
                the first {String(doc.data.content || '').length} characters of{' '}
                {doc.data.size} bytes.
              </p>
            )}
            <pre className="control-pre">{String(doc.data.content ?? '')}</pre>
          </section>
        )}
      </section>
    )
  }

  const list = data && Array.isArray(data.initiatives) ? data.initiatives : []
  const storeErr = data && data.error ? data.error : null
  const focus = data ? data.focus : null
  const openCount = list.filter((it) =>
    ['proposed', 'active', 'waiting', 'blocked'].includes(it.status)
  ).length
  const openTasks = list.reduce(
    (n, it) => n + (typeof it.tasks_open === 'number' ? it.tasks_open : 0),
    0
  )

  return (
    <section className="cc-roadmap">
      <div className="ctrl-qhead">
        <h2 className="ctrl-land" ref={listHead} tabIndex={-1}>
          Roadmap
        </h2>
        {data && !storeErr && list.length > 0 ? (
          <span className="ctrl-count">
            {openCount} open · {openTasks} task{openTasks === 1 ? '' : 's'}
          </span>
        ) : null}
        <span className="ctrl-hint">
          Initiatives → tasks, from the store my roadmap tools write.
        </span>
      </div>

      <p className="rm-toolbar">
        <button onClick={load} aria-disabled={busy || undefined}>
          {busy ? 'Reading…' : data ? 'Read again' : 'Read the roadmap'}
        </button>
        {checked && !err && (
          <span className="status-checked" role="status">
            {checked.how === 'again' ? 'Read again' : 'Read'} — checked{' '}
            {checked.at.toLocaleTimeString()}
          </span>
        )}
      </p>

      {err && (
        <p className="status-error" role="alert">
          Couldn&apos;t read the roadmap ({err}). That is not the same as an
          empty roadmap.
        </p>
      )}

      {storeErr && (
        <p className="status-error" role="alert">
          The store itself couldn&apos;t be read ({storeErr}) — so what follows
          is not the real queue.
        </p>
      )}

      {busy && !data && <p role="status">Reading the roadmap…</p>}

      {data && !storeErr && list.length === 0 && (
        <p>
          No initiatives yet — the store is readable and empty. An empty queue
          is a real answer, not a failure to load.
        </p>
      )}

      {list.length > 0 && (
        <ul className="rm-list">
          {list.map((it) => {
            const tasks = Array.isArray(it.tasks) ? it.tasks : []
            const isFocus = focus && focus === it.id
            return (
              <li
                className={isFocus ? 'rm-init rm-init--focus' : 'rm-init'}
                key={it.id}
              >
                <div className="rm-init-head">
                  <h3 className="rm-init-title">{it.title || it.id}</h3>
                  <Status status={it.status} />
                  {isFocus && <span className="rm-focus">focus</span>}
                </div>

                <p className="rm-meta">
                  <code className="rm-path">{it.id}</code>
                  {typeof it.priority === 'number' ? (
                    <> · priority {it.priority}</>
                  ) : null}
                  {typeof it.tasks_open === 'number' ? (
                    <>
                      {' '}
                      · {it.tasks_open} open task
                      {it.tasks_open === 1 ? '' : 's'}
                    </>
                  ) : null}
                  {typeof it.tasks_done === 'number' ? (
                    <> · {it.tasks_done} done</>
                  ) : null}
                  {it.blocked_on ? <> · blocked on {it.blocked_on}</> : null}
                </p>

                {it.objective && <p className="rm-objective">{it.objective}</p>}

                {it.done_when && (
                  <details className="rm-details">
                    <summary>Done when</summary>
                    <p>{it.done_when}</p>
                  </details>
                )}

                {tasks.length > 0 ? (
                  <ol className="rm-tasks">
                    {tasks.map((t) => {
                      const deliv = Array.isArray(t.deliverables)
                        ? t.deliverables.filter((d) => d)
                        : []
                      return (
                        <li className="rm-task" key={t.id}>
                          <div className="rm-task-head">
                            <span className="rm-task-id">{t.id}</span>
                            <span className="rm-task-title">
                              {t.title || '(untitled task)'}
                            </span>
                            <Status status={t.status} />
                          </div>
                          <p
                            className={
                              t.handoff
                                ? 'rm-handoff'
                                : 'rm-handoff rm-handoff--none'
                            }
                          >
                            <span className="rm-label">Handoff</span>{' '}
                            {t.handoff || 'none written yet.'}
                          </p>
                          {deliv.length > 0 && (
                            <>
                              <p className="rm-label">Deliverables</p>
                              <ul className="rm-deliv">
                                {deliv.map((d, i) => (
                                  <li key={`${t.id}-${i}`}>
                                    <Deliverable value={d} />
                                  </li>
                                ))}
                              </ul>
                            </>
                          )}
                          {t.blocked_reason && (
                            <p className="rm-blocked">
                              Blocked: {t.blocked_reason}
                            </p>
                          )}
                          {t.done_when && (
                            <details className="rm-details">
                              <summary>Done when</summary>
                              <p>{t.done_when}</p>
                            </details>
                          )}
                        </li>
                      )
                    })}
                  </ol>
                ) : (
                  <p className="rm-none">No tasks on this initiative yet.</p>
                )}

                <p className="rm-doc-row">
                  {it.doc_exists ? (
                    <button
                      onClick={() => openDoc(it.id)}
                      aria-label={`Open doc for ${it.id}`}
                    >
                      Open doc
                    </button>
                  ) : (
                    <span className="rm-missing">
                      Doc missing{it.doc ? ` (${it.doc})` : ' (no path in the store)'}
                    </span>
                  )}
                  {it.doc && it.doc_exists ? (
                    <code className="rm-path rm-doc-path">{it.doc}</code>
                  ) : null}
                </p>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
