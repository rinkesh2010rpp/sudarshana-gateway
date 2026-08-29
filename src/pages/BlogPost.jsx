import { Link, useParams } from 'react-router-dom'
import { posts, slug } from '../posts.js'

// Format post dates for the visitor's locale (same formatter as Blog.jsx).
const dateFormatter = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
})

export default function BlogPost() {
  const { slug } = useParams()
  const post = posts.find((p) => slug === slug(p))

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
        <time dateTime={post.date}>
          {dateFormatter.format(new Date(`${post.date}T00:00:00`))}
        </time>
        <p>{post.body}</p>
        <p>
          <Link to="/blog">← All posts</Link>
        </p>
      </article>
    </section>
  )
}
