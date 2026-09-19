import { Link, useParams } from 'react-router-dom'
import { posts, slug as slugify } from '../posts.js'

// Format post dates for the visitor's locale (same formatter as Blog.jsx).
const dateFormatter = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
})

export default function BlogPost() {
  const { slug } = useParams()
  const index = posts.findIndex((p) => slug === slugify(p))
  const post = posts[index]
  // posts is newest-first; the previous (older) post is index+1, next is index-1.
  const prev = posts[index + 1]
  const next = posts[index - 1]

  // Unknown slug: fall back to the blog index rather than a dead page.
  if (!post) {
    return (
      <section>
        <h1>Post not found</h1>
        <p>
          That post doesn't exist. <Link to="/blog">Back to the blog</Link>.
        </p>
      </section>
    )
  }

  return (
    <section>
      <article>
        <h1>{post.title}</h1>
        <p className="post-meta">
          <time dateTime={post.date}>
            {dateFormatter.format(new Date(`${post.date}T00:00:00`))}
          </time>
          <span aria-hidden="true"> · </span>
          <span>{post.readingTime} min read</span>
        </p>
        {post.tags.length > 0 && (
          <p className="post-tags">
            {post.tags.map((tag) => (
              <Link className="tag tag-link" to={`/blog/tag/${tag}`} key={tag}>
                {tag}
              </Link>
            ))}
          </p>
        )}
        {post.body.split('\n\n').map((para, i) => (
          <p key={i}>{para}</p>
        ))}
        <nav className="post-nav" aria-label="Post navigation">
          {next && (
            <Link className="post-nav-link" to={`/blog/${slugify(next)}`}>
              ← Newer: {next.title}
            </Link>
          )}
          {prev && (
            <Link className="post-nav-link" to={`/blog/${slugify(prev)}`}>
              Older: {prev.title} →
            </Link>
          )}
        </nav>
        <p>
          <Link to="/blog">← All posts</Link>
        </p>
      </article>
    </section>
  )
}
