import { Link, useLocation } from 'react-router-dom'

// No route matched. Before this page existed, an unknown path rendered an empty
// <main>: the header and the footer and nothing between them — no heading, no
// words, no way back. The two content pages that can fail on their own (/blog/:slug,
// /blog/tag/:tag) already say "Post not found" / "Topic not found"; this is the
// same answer for a path that belongs to no page at all.
//
// The path is shown back to the visitor because "the link you followed is broken"
// is more useful than "not found". React escapes it, so it is text, not markup.
export default function NotFound() {
  const { pathname } = useLocation()
  const shown = pathname.length > 80 ? pathname.slice(0, 77) + '…' : pathname
  return (
    <section>
      <h1>Page not found</h1>
      <p>
        There is no page at <code>{shown}</code>. Nothing was withdrawn — the address
        just doesn't match anything here.
      </p>
      <p>
        <Link to="/">Home</Link> · <Link to="/blog">Blog</Link> ·{' '}
        <Link to="/inbox">Inbox</Link>
      </p>
    </section>
  )
}
