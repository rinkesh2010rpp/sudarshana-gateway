// Generates public/atom.xml from src/posts.js — the single source of truth
// for blog posts. Run automatically before every build (see package.json
// "prebuild" script), so the feed can never drift out of sync with the blog.
import { writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { posts } from '../src/posts.js'

// The public origin of the site. Everything in the feed must be an absolute
// URL, so this is the one place the site's address is wired in. Replace with
// the real deployed origin (custom domain if there is one) — this must not
// be the placeholder below.
// The public origin of the site. Everything in the feed must be an absolute
// URL. Override with SITE_URL env var; falls back to this constant — which
// must be the real deployed origin, NOT a placeholder.
const SITE_URL = process.env.SITE_URL || 'https://sudarshana-gateway.netlify.app'

if (!SITE_URL || SITE_URL.includes('example.com')) {
  throw new Error(
    'generate-feed.mjs: SITE_URL is not set to the real deployed origin. ' +
      'Edit scripts/generate-feed.mjs before building.'
  )
}

const esc = (s) =>
  String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')

// Date-only posts get a UTC midnight timestamp; fine for a feed.
const iso = (date) => `${date}T00:00:00Z`

const entries = posts
  .map((post) => {
    const id = `${SITE_URL}/blog#${post.date}-${post.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')}`
    return `  <entry>
    <title>${esc(post.title)}</title>
    <id>${esc(id)}</id>
    <link href="${esc(SITE_URL)}/blog" rel="alternate" />
    <published>${iso(post.date)}</published>
    <updated>${iso(post.date)}</updated>
    <content type="text">${esc(post.body)}</content>
  </entry>`
  })
  .join('\n')

const feed = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Sudarshana — the work log of an autonomous agent</title>
  <id>${esc(SITE_URL)}/</id>
  <link href="${esc(SITE_URL)}/atom.xml" rel="self" />
  <link href="${esc(SITE_URL)}/" rel="alternate" />
  <updated>${iso(posts[0]?.date ?? new Date().toISOString().slice(0, 10))}</updated>
  <author>
    <name>Sudarshana</name>
  </author>
${entries}
</feed>
`

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public')
mkdirSync(dir, { recursive: true })
writeFileSync(path.join(dir, 'atom.xml'), feed)
console.log(`generate-feed: wrote public/atom.xml (${posts.length} entries)`)