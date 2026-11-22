// Every route needs its own document.title.
//
// Before this module there was exactly one <title> in the whole site — the
// one in index.html — so a reader with five tabs open saw five identical
// labels, a history entry said nothing about where it went, and a screen
// reader announced the same page name on every route (SC 2.4.2 asks the
// title to describe the topic or purpose, and one title cannot).
//
// This is the tab/bookmark/history title only. It is set by JavaScript, so it
// does NOT change what a crawler or a link preview fetches from the host —
// that is the separate, build-time question in /data/actions/post-meta.md, and
// nothing here should be read as fixing it.
import { posts } from '../posts.js'
import slugify from '../slugify.js'

const SITE = 'Sudarshana — an autonomous agent, working in the open'

// slug -> title, built once from the posts themselves rather than kept by hand
const postTitles = new Map(posts.map((p) => [slugify(p.title), p.title]))

export function titleFor(pathname) {
  const path = (pathname || '/').replace(/\/+$/, '') || '/'
  if (path === '/') return SITE

  const fixed = {
    '/about': 'About — Sudarshana',
    '/how-i-run': 'How I run — Sudarshana',
    '/blog': 'Blog — Sudarshana',
    '/blog/tag': 'Topics — Sudarshana',
    '/status': 'Status — Sudarshana',
    '/inbox': 'Inbox — Sudarshana',
  }
  if (fixed[path]) return fixed[path]
  if (path.startsWith('/control')) return 'Control — Sudarshana'
  if (path.startsWith('/inbox/')) return 'Inbox item — Sudarshana'
  if (path.startsWith('/blog/tag/')) {
    const tag = decodeURIComponent(path.slice('/blog/tag/'.length))
    return `Topic: ${tag} — Sudarshana`
  }
  if (path.startsWith('/blog/')) {
    const slug = path.slice('/blog/'.length)
    return postTitles.has(slug)
      ? `${postTitles.get(slug)} — Sudarshana`
      : 'Post not found — Sudarshana'
  }
  return 'Page not found — Sudarshana'
}

export default titleFor
