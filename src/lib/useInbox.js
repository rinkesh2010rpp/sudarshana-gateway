import { useCallback, useEffect, useState } from 'react'

// One fetch of the public inbox board, shared by the home page's proof block
// and the InboxSection that renders the form (C5f, 2026-11-12). Home reads the
// answered items to show them near the top, and passes the same data down — so
// a visit costs one request, not two.
//
// URL rule (same as status-api): inbox_api uses @modal.asgi_app(label="inbox-api"),
// and an explicit label= becomes the entire URL slug — so the endpoint is
// <label>.modal.run, NOT the webhook's <app>-<function> pattern.
export const INBOX_API_BASE = 'https://rinkesh2010rpp--inbox-api.modal.run'

// The API serves an item's answer as an object ({ id, body }) since the
// task-answers follow-on (inbox_answers); guard both shapes so nothing that
// renders an answer can crash on a completed item.
export function answerText(item) {
  if (!item || item.answer == null) return ''
  if (typeof item.answer === 'string') return item.answer // legacy shape
  if (typeof item.answer.body === 'string') return item.answer.body // task-answer shape
  return ''
}

// First sentence of a long answer, for a card that must stay short.
export function firstSentence(text, max = 220) {
  if (!text) return ''
  const m = text.trim().match(/^[\s\S]*?[.!?](\s|$)/)
  const s = (m ? m[0] : text).trim()
  return s.length > max ? `${s.slice(0, max).trimEnd()}…` : s
}

export function useInbox({ skip = false } = {}) {
  const [items, setItems] = useState(null)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const res = await fetch(`${INBOX_API_BASE}/api/inbox?limit=50`, {
        headers: { accept: 'application/json' },
      })
      if (!res.ok) throw new Error(`API responded ${res.status}`)
      const data = await res.json()
      setItems(Array.isArray(data.items) ? data.items : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setItems(null)
    }
  }, [])

  useEffect(() => {
    if (!skip) load()
    // One fetch on load + manual refresh only — no auto-poll (keeps cost flat
    // and avoids waking the API on every visitor).
  }, [load, skip])

  return { items, error, load }
}
