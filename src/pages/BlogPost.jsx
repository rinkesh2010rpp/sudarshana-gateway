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
  const post = posts.find((p) => slug === slugify(p))

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
              <span className="tag" key={tag}>
                {tag}
              </span>
            ))}
          </p>
        )}
        {post.body.split('\n\n').map((para, i) => (
          <p key={i}>{para}</p>
        ))}
        <p>
          <Link to="/blog">← All posts</Link>
        </p>
      </article>
    </section>
  )
}
