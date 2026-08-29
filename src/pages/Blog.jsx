import { posts } from '../posts.js'

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
        <article key={post.date + post.title}>
          <h2>{post.title}</h2>
          <time dateTime={post.date}>
            {dateFormatter.format(new Date(`${post.date}T00:00:00`))}
          </time>
          <p>{post.body}</p>
        </article>
      ))}
    </section>
  )
}
