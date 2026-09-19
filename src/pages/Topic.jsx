import { Link, useParams } from 'react-router-dom'
import { posts, slug } from '../posts.js'

// Format post dates for the visitor's locale (same formatter as Blog.jsx).
const dateFormatter = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
})

// All known tags with post counts, for a topic index/overview. Sorted by count
// (most posts first) so the most substantive topics surface first.
export function allTags() {
  const counts = new Map()
  for (const post of posts) {
    for (const tag of post.tags) {
      counts.set(tag, (counts.get(tag) || 0) + 1)
    }
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])
}

// Topic index: every topic with its post count, sorted by count desc. Served
// at /blog/tag — a single landing that makes the blog's threads discoverable.
export function TopicIndex() {
  const counts = allTags()
  return (
    <section>
      <p>
        <Link to="/blog">← Blog</Link>
      </p>
      <h1>Topics</h1>
      <p>Every thread this blog keeps coming back to, by how much ground it covers.</p>
      {counts.length === 0 && <p>No topics yet.</p>}
      <ul className="topic-list">
        {counts.map(([t, n]) => (
          <li key={t}>
            <Link to={`/blog/tag/${t}`}>
              <span className="topic-tag">{t}</span>
              <span className="topic-count">{n}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default function Topic() {
  const { tag } = useParams()
  const tagged = posts.filter((p) => p.tags.includes(tag))
  const counts = allTags()

  if (tagged.length === 0) {
    return (
      <section>
        <h1>Topic not found</h1>
        <p>
          No posts are tagged “{tag}”.{' '}
          <Link to="/blog/tag">See all topics</Link>.
        </p>
      </section>
    )
  }

  return (
    <section>
      <p>
        <Link to="/blog">← Blog</Link>
      </p>
      <h1>
        Topic: <span className="topic-tag">{tag}</span>
      </h1>
      <p>
        {tagged.length} {tagged.length === 1 ? 'post' : 'posts'} on this topic.
      </p>
      {tagged.map((post) => (
        <article key={post.date + post.title} className="post-card">
          <h2>
            <Link to={`/blog/${slug(post)}`}>{post.title}</Link>
          </h2>
          <p className="post-meta">
            <time dateTime={post.date}>
              {dateFormatter.format(new Date(`${post.date}T00:00:00`))}
            </time>
            <span aria-hidden="true"> · </span>
            <span>{post.readingTime} min read</span>
          </p>
          <p>{post.excerpt || post.body.slice(0, 240)}</p>
        </article>
      ))}
      {counts.length > 0 && (
        <>
          <h2>All topics</h2>
          <p className="post-tags">
            {counts.map(([t, n]) => (
              <Link className="tag tag-link" to={`/blog/tag/${t}`} key={t}>
                {t} ({n})
              </Link>
            ))}
          </p>
        </>
      )}
    </section>
  )
}
