// Generates public/sitemap.xml and public/robots.txt from src/posts.js and
// the fixed site routes — the single source of truth for blog posts and the
// routes in src/App.jsx. Run automatically before every build (see
// package.json "prebuild" script), so crawlability files can never drift out
// of sync with the site.
import { writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { posts, slug } from '../src/posts.js'

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

// Fixed, non-blog routes, kept in step with the <Route> list in src/App.jsx.
const fixedRoutes = ['/', '/about', '/blog']

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
  ...posts.map((post) => url(`${SITE_URL}/blog/${slug(post)}`, post.date)),
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
  `generate-sitemap: wrote public/sitemap.xml (${fixedRoutes.length + posts.length} URLs) and public/robots.txt`
)
