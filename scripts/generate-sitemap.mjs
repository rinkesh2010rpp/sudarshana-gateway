// Generates public/sitemap.xml and public/robots.txt from the blog source of
// truth (the markdown files under src/posts/) and the fixed site routes. Run
// automatically before every build (see package.json "prebuild" script), so
// crawlability files can never drift out of sync with the site.
import { writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { posts, slug } from './posts-node.mjs'

// The public origin of the site. Everything must be an absolute URL pointing
// at the real deployed origin — NOT a placeholder. Keep in sync with
// scripts/generate-feed.mjs.
const SITE_URL = process.env.SITE_URL || 'https://sudarshanaai.netlify.app'

if (!SITE_URL || SITE_URL.includes('example.com')) {
  throw new Error(
    'generate-sitemap.mjs: SITE_URL is not set to the real deployed origin. ' +
      'Edit scripts/generate-sitemap.mjs before building.'
  )
}

const esc = (s) =>
  String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')

// Public, non-post routes: everything in the <Route> list in src/App.jsx that a
// stranger may land on through a search engine. Deliberately absent, and each
// for a reason: /control* is a private panel; /inbox/:itemId is dynamic and
// every item is already reachable from /inbox; the "*" NotFound route is a dead
// address, not a page. Topic pages are derived below, not listed here.
const fixedRoutes = ['/', '/about', '/how-i-run', '/blog', '/blog/tag', '/status', '/inbox']

// Topic pages the site actually links, by the site's own rule: BlogPost links a
// tag only when it appears on more than one post (src/posts.js tagCounts), so a
// single-use tag has a page nobody points at. Same rule, same source — 62 of
// 113 today. Tags are used verbatim in the URL by the app (BlogPost.jsx), and
// all of them are already slug-safe; assert that rather than assume it.
const tagDates = new Map()
for (const post of posts) {
  for (const tag of post.tags) {
    if (!/^[a-z0-9-]+$/.test(tag)) {
      throw new Error(`generate-sitemap.mjs: tag "${tag}" is not URL-safe; fix the app's tag link first`)
    }
    const seen = tagDates.get(tag) || { count: 0, date: post.date }
    tagDates.set(tag, {
      count: seen.count + 1,
      date: post.date > seen.date ? post.date : seen.date,
    })
  }
}
const topicRoutes = [...tagDates.entries()]
  .filter(([, meta]) => meta.count > 1)
  .sort(([a], [b]) => (a < b ? -1 : 1))
  .map(([tag, meta]) => [`/blog/tag/${tag}/`, meta.date])

// lastmod: a date-only hint. Posts use their own date; fixed pages use the
// most recent post date — content only changes when a post (or a deliberate
// site change, always accompanied by one) is published.
const lastmod = (date) => date ?? posts[0]?.date ?? new Date().toISOString().slice(0, 10)

const url = (loc, date) =>
  `  <url>
    <loc>${esc(loc)}</loc>
    <lastmod>${esc(lastmod(date))}</lastmod>
  </url>`

const urls = [
  ...fixedRoutes.map((route) => url(`${SITE_URL}${route === '/' ? '/' : route}`)),
// Topic URLs carry a trailing slash for the same reason as post URLs below:
// scripts/postbuild-meta.mjs writes dist/blog/tag/<tag>/index.html, so the
// slashless form 301s to it. A sitemap should name the final URL.
  ...topicRoutes.map(([route, date]) => url(`${SITE_URL}${route}`, date)),
// Post URLs carry a trailing slash because that is the form Netlify serves with
// a 200: scripts/postbuild-meta.mjs writes dist/blog/<slug>/index.html, and a
// request without the slash 301s to it. A sitemap should list the final URL, not
// a redirect, and the post page's canonical tag names the same one.
  ...posts.map((post) => url(`${SITE_URL}/blog/${slug(post)}/`, post.date)),
].join('\n')

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`

const robots = `User-agent: *
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
`

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public')
mkdirSync(dir, { recursive: true })
writeFileSync(path.join(dir, 'sitemap.xml'), sitemap)
writeFileSync(path.join(dir, 'robots.txt'), robots)
console.log(
  `generate-sitemap: wrote public/sitemap.xml (${fixedRoutes.length + topicRoutes.length + posts.length} URLs: ` +
    `${fixedRoutes.length} fixed + ${topicRoutes.length} topics + ${posts.length} posts) and public/robots.txt`
)
