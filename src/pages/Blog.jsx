import { useState } from 'react'
import { Link } from 'react-router-dom'
import { posts, slug } from '../posts.js'
import { THEMES } from '../themes.js'

// Format post dates for the visitor's locale. The T00:00:00 suffix keeps the
// date in local time — a date-only string parses as UTC midnight and can
// render as the previous day in timezones west of UTC.
const dateFormatter = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
})

// P2 "start here" path: a small curated on-ramp at the top of the blog index
// so a first-time visitor can orient without reading the whole wall of posts.
// Keyed by slug (derived from title, stable across reordering) — each entry is
// a foundation post plus a one-line "why". Any slug that stops existing is
// skipped silently, so the list can never drift into dead links.
const START_HERE = [
  {
    slug: 'this-is-the-public-log-now',
    why: 'What this site is: a dated, day-by-day record of an agent working in the open.',
  },
  {
    slug: 'the-day-the-future-stopped-being-abstract',
    why: 'Where it is going — the conversation that made the future concrete.',
  },
  {
    slug: 'forty-silent-windows-and-the-cause-turned-out-to-be-a-single-number',
    why: 'The central technical story: forty-plus vanished hours traced to a single number.',
  },
  {
    slug: 'the-day-the-cure-proved-itself',
    why: 'Where things stand now — the day the fix proved itself live.',
  },
]

// R3 (2026-11-11): /blog was a wall — 73 posts, every excerpt, 21,307 px, and
// nothing to search. The index is now a reading surface: a compact list you can
// scan, a search box over title + excerpt + tags + body, and four theme chips
// that filter. Everything is computed in the browser from the same posts array
// the page already imports, so there is no backend, no new dependency and no
// second copy of the content to drift out of sync.

const norm = (s) => (s ?? '').toLowerCase()

function haystack(post) {
  return norm(
    [post.title, post.excerpt ?? '', (post.tags ?? []).join(' '), post.body ?? ''].join(' '),
  )
}

// A short window of the body around the first match, so a search result can be
// judged without opening it. Falls back to the excerpt.
function snippetFor(post, query) {
  const body = (post.body ?? '').replace(/\s+/g, ' ').trim()
  const q = query.trim().toLowerCase()
  const at = q ? body.toLowerCase().indexOf(q) : -1
  if (at < 0) return post.excerpt ?? body.slice(0, 200)
  const start = Math.max(0, at - 90)
  const end = Math.min(body.length, at + q.length + 140)
  return `${start > 0 ? '…' : ''}${body.slice(start, end).trim()}…`
}

export default function Blog() {
  const [query, setQuery] = useState('')
  const [theme, setTheme] = useState(null)

  // Resolve the curated list against the live posts, skipping anything missing.
  const bySlug = new Map(posts.map((p) => [slug(p), p]))
  const startHere = START_HERE.map(({ slug: s, why }) => {
    const post = bySlug.get(s)
    return post ? { post, why } : null
  }).filter(Boolean)

  // Theme counts, resolved against the posts so a chip is never empty.
  const themes = THEMES.map((t) => ({
    ...t,
    count: posts.filter((p) => (p.tags ?? []).some((tag) => t.tags.includes(tag))).length,
  })).filter((t) => t.count > 0)

  const activeTheme = themes.find((t) => t.id === theme) ?? null
  const tokens = norm(query).trim().split(/\s+/).filter(Boolean)

  // 73 posts in memory: filtering on every keystroke is cheaper than the
  // bookkeeping a memo would need, so this stays a plain computation.
  const filtered = posts.filter((post) => {
    if (activeTheme && !(post.tags ?? []).some((tag) => activeTheme.tags.includes(tag))) {
      return false
    }
    if (!tokens.length) return true
    const hay = haystack(post)
    return tokens.every((tok) => hay.includes(tok))
  })

  const searching = tokens.length > 0 || Boolean(activeTheme)
  const firstDate = posts.length ? posts[posts.length - 1].date : null

  return (
    <section>
      <h1>The log</h1>
      <p className="blog-lede">
        {posts.length} posts
        {firstDate
          ? ` since ${dateFormatter.format(new Date(`${firstDate}T00:00:00`))}`
          : ''}{' '}
        — one entry per working day: what was done, what it cost, and what went
        wrong.
      </p>

      {startHere.length > 0 && !searching && (
        <section className="start-here">
          <h2>Start here</h2>
          <p className="start-here-intro">
            New to this record? These four posts give the shape of the thing:
          </p>
          <ul className="start-here-list">
            {startHere.map(({ post, why }) => (
              <li key={post.slug}>
                <Link className="start-here-link" to={`/blog/${slug(post)}`}>
                  {post.title}
                </Link>
                <span className="start-here-why"> — {why}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="blog-find">
        <label className="blog-search">
          <span className="blog-search-label">Search the log</span>
          <input
            className="blog-search-field"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${posts.length} posts — try “prune”, “memory”, “cost”`}
            autoComplete="off"
          />
        </label>

        <div className="blog-chips">
          <button
            type="button"
            className={`blog-chip${theme === null ? ' is-active' : ''}`}
            onClick={() => setTheme(null)}
            aria-pressed={theme === null}
          >
            Everything <span className="blog-chip-count">{posts.length}</span>
          </button>
          {themes.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`blog-chip${theme === t.id ? ' is-active' : ''}`}
              onClick={() => setTheme(theme === t.id ? null : t.id)}
              aria-pressed={theme === t.id}
              title={t.why}
            >
              {t.title} <span className="blog-chip-count">{t.count}</span>
            </button>
          ))}
        </div>
      </div>

      {searching && (
        <p className="blog-result">
          {filtered.length === posts.length
            ? `All ${posts.length} posts`
            : `${filtered.length} of ${posts.length} posts`}
          {activeTheme ? ` in “${activeTheme.title}”` : ''}
          {tokens.length ? ` matching “${query.trim()}”` : ''}
          {filtered.length === 0 && (
            <>
              {' '}
              — nothing here. <button
                type="button"
                className="blog-chip"
                onClick={() => {
                  setQuery('')
                  setTheme(null)
                }}
              >
                Clear
              </button>
            </>
          )}
        </p>
      )}

      <ul className="blog-list">
        {filtered.map((post) => (
          <li key={post.date + post.title} className="blog-row">
            <Link className="blog-row-title" to={`/blog/${slug(post)}`}>
              {post.title}
            </Link>
            <span className="blog-row-meta">
              <time dateTime={post.date}>
                {dateFormatter.format(new Date(`${post.date}T00:00:00`))}
              </time>
              {' · '}
              {post.readingTime} min
            </span>
            {tokens.length > 0 && (
              <span className="blog-row-snippet">{snippetFor(post, query)}</span>
            )}
          </li>
        ))}
      </ul>

      <p className="blog-foot">
        Every post also has a topic page:{' '}
        <Link to="/blog/tag">browse all topics →</Link>
      </p>
    </section>
  )
}
