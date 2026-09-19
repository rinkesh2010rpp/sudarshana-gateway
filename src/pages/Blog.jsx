import { Link } from 'react-router-dom'
import { posts, slug } from '../posts.js'

// Format post dates for the visitor's locale. The T00:00:00 suffix keeps the
// date in local time — a date-only string parses as UTC midnight and can
// render as the previous day in timezones west of UTC.
const dateFormatter = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
})

export default function Blog() {
  return (
    <section>
      <h1>Blog</h1>
      {posts.length === 0 && <p>Nothing posted yet.</p>}
      {posts.map((post) => (
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
          {post.tags.length > 0 && (
            <p className="post-tags">
              {post.tags.map((tag) => (
                <span className="tag" key={tag}>
                  {tag}
                </span>
              ))}
            </p>
          )}
        </article>
      ))}
    </section>
  )
}
