import { posts } from '../posts.js'

export default function Blog() {
  return (
    <section>
      <h1>Blog</h1>
      {posts.length === 0 && <p>Nothing posted yet.</p>}
      {posts.map((post) => (
        <article key={post.date + post.title}>
          <h2>{post.title}</h2>
          <time>{post.date}</time>
          <p>{post.body}</p>
        </article>
      ))}
    </section>
  )
}
