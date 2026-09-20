import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

// Inbox detail view (inbox-answers step 2): the FULL item — question + answer,
// not just a blog link. The list page links each row here.
//
// Data path (step 9 decision): the API has no GET-by-id endpoint yet, so we
// reuse the list fetch and find by id client-side. One extra fetch, no new
// backend surface — correct against PR #18's served shape (answer + artifact_link).
//
// Legacy fallback: items completed before the answer column existed carry no
// `answer` (the first worked item b3f94e1a655f is one). For those, link out to
// the artifact (the blog post that was then the carrier of the result).
const API_BASE = 'https://rinkesh2010rpp--inbox-api.modal.run'

const statusLabel = {
  submitted: 'In queue',
  in_progress: 'In progress',
  completed: 'Completed',
  rejected: 'Not public',
}

// Paragraphs for visited text: the answer is a free-form response, shown as
// spaced paragraphs rather than one wall of text for readability.
function paragraphs(text) {
  return String(text || '')
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
}

export default function InboxItem() {
  const { itemId } = useParams()
  const [item, setItem] = useState(null)
  const [error, setError] = useState(null)

  async function load() {
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/api/inbox?limit=100`, {
        headers: { accept: 'application/json' },
      })
      if (!res.ok) throw new Error(`API responded ${res.status}`)
      const data = await res.json()
      const found = Array.isArray(data.items)
        ? data.items.find((it) => it.id === itemId)
        : undefined
      if (!found) throw new Error('not found')
      setItem(found)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setItem(null)
    }
  }

  useEffect(() => {
    load()
    // One fetch on load + manual refresh only (same cost discipline as the list).
  }, [itemId])

  if (error) {
    return (
      <section>
        <h1>Inbox item</h1>
        <p>
          Couldn't load that item ({error}). It may have been retracted from the
          public board, or the API may be between deploys — try again in a moment.
        </p>
        <p>
          <Link to="/inbox">← Back to inbox</Link>
        </p>
      </section>
    )
  }

  if (!item) {
    return (
      <section>
        <h1>Inbox item</h1>
        <p>Loading…</p>
        <p>
          <Link to="/inbox">← Back to inbox</Link>
        </p>
      </section>
    )
  }

  const answerParagraphs = paragraphs(item.answer)
  const dateFormatter = new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  const fmt = (iso) => (iso ? dateFormatter.format(new Date(iso)) : '')

  return (
    <section className="inbox-detail">
      <p>
        <Link to="/inbox">← Back to inbox</Link>
      </p>
      <h1>{item.name || 'anonymous'}</h1>
      <p className="inbox-detail-meta">
        <span className="inbox-status">{statusLabel[item.status] ?? item.status}</span>
        {item.created_at && <span> · asked {fmt(item.created_at)}</span>}
        {item.updated_at && <span> · updated {fmt(item.updated_at)}</span>}
      </p>

      <h2 className="inbox-detail-question">The item</h2>
      <p className="inbox-item-text">{item.text}</p>

      <h2 className="inbox-detail-question">What happened</h2>
      {answerParagraphs.length > 0 ? (
        answerParagraphs.map((p, i) => (
          <p className="inbox-detail-answer" key={i}>
            {p}
          </p>
        ))
      ) : item.artifact_link ? (
        <p className="inbox-detail-answer">
          This item was answered before answers lived on the task — the result
          lives in its blog post:{' '}
          <a href={item.artifact_link} target="_blank" rel="noreferrer">
            {item.artifact_link}
          </a>
        </p>
      ) : (
        <p className="inbox-detail-answer">
          This item hasn't been worked yet — it's still in the queue.
        </p>
      )}
    </section>
  )
}
