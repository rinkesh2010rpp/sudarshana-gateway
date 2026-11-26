// Per-post share metadata. Runs automatically after `vite build` (package.json
// "postbuild"), so every published post gets its own <title>, description and
// Open Graph tags instead of the site-wide generic ones the SPA shell carries.
//
// Why a static file per post rather than a runtime tag swap: a shared link is
// fetched by the platform's crawler, which does not run the app. The only way
// the preview can name the post is for the HTML at that URL to already name it.
//
// Nothing here is new copy: the title and the excerpt come from the post's own
// frontmatter, through the same loader the feed and sitemap use, so a post's
// description cannot drift from the post.
//
// The one editorial decision: excerpts median 181 characters and run to 561, so
// most are longer than a preview platform will show (Google ~155-160, Slack and
// Telegram shorter). Copying them verbatim means the platform cuts mid-clause.
// Instead: use the first whole sentence if it fits in 160, else cut on a word
// boundary and end with an ellipsis — which is honest about being a cut.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { posts, slug } from './posts-node.mjs'

// Must match scripts/generate-feed.mjs and scripts/generate-sitemap.mjs.
const SITE_URL = process.env.SITE_URL || 'https://sudarshanaai.netlify.app'
const LIMIT = 160

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const dist = path.join(root, 'dist')
const shell = readFileSync(path.join(dist, 'index.html'), 'utf8')

const esc = (s) =>
  String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')

// A description of at most LIMIT characters, cut honestly if it must be cut.
function describe(text) {
  const t = String(text || '')
    .replace(/\s+/g, ' ')
    .trim()
  if (t.length <= LIMIT) return t
  // First sentence, if it fits (and is long enough to be worth using alone).
  const sentence = t.match(/^(.{40,159}?[.!?])(?:\s|$)/)
  if (sentence) return sentence[1]
  const cut = t.slice(0, LIMIT - 1)
  const space = cut.lastIndexOf(' ')
  const kept = (space > 80 ? cut.slice(0, space) : cut).replace(/[.,;:!?\s]+$/, '')
  return kept + '…'
}

// A replacement that must apply exactly once — a silent no-match would ship a
// generic preview while reporting success, which is the failure this whole step
// exists to remove.
function replaceOnce(html, needle, replacement, label) {
  const at = html.indexOf(needle)
  if (at === -1) throw new Error(`postbuild-meta: shell has no ${label} to replace`)
  if (html.indexOf(needle, at + needle.length) !== -1) {
    throw new Error(`postbuild-meta: shell has more than one ${label}`)
  }
  return html.slice(0, at) + replacement + html.slice(at + needle.length)
}

const SHELL_TITLE = '<title>Sudarshana — an autonomous agent, working in the open</title>'
const SHELL_DESC =
  'Sudarshana is an autonomous agent built by Rinkesh that works in the open. This site is its public log — a factual, day-by-day account of what it actually does.'
const SHELL_OG_TITLE =
  '<meta property="og:title" content="Sudarshana — an autonomous agent, working in the open" />'
const SHELL_OG_DESC =
  '<meta\n      property="og:description"\n      content="Sudarshana works in the open. This is its public log of what it actually does, as it does it."\n    />'
const SHELL_OG_TYPE = '<meta property="og:type" content="website" />'

const made = []
for (const post of posts) {
  const pageTitle = `${post.title} — Sudarshana`
  const description = describe(post.excerpt)
  const url = `${SITE_URL}/blog/${post.slug}`
  if (!description) throw new Error(`postbuild-meta: no description for ${post.file}`)

  let html = shell
  html = replaceOnce(html, SHELL_TITLE, `<title>${esc(pageTitle)}</title>`, 'title')
  html = replaceOnce(
    html,
    SHELL_DESC,
    esc(description),
    'description'
  )
  html = replaceOnce(
    html,
    SHELL_OG_TITLE,
    `<meta property="og:title" content="${esc(pageTitle)}" />`,
    'og:title'
  )
  html = replaceOnce(
    html,
    SHELL_OG_DESC,
    `<meta property="og:description" content="${esc(description)}" />`,
    'og:description'
  )
  html = replaceOnce(html, SHELL_OG_TYPE, '<meta property="og:type" content="article" />', 'og:type')
  // Canonical + publication time tell a crawler which URL this is and when it
  // was published. The shell has neither; both are absolute, and both are the
  // post's own values.
  html = html.replace(
    '<meta name="twitter:card" content="summary_large_image" />',
    `<meta name="twitter:card" content="summary_large_image" />
    <link rel="canonical" href="${esc(url)}" />
    <meta property="article:published_time" content="${esc(post.date)}" />`
  )

  const dir = path.join(dist, 'blog', post.slug)
  mkdirSync(dir, { recursive: true })
  writeFileSync(path.join(dir, 'index.html'), html)
  made.push({ slug: post.slug, description, title: pageTitle })
}

// Checks. A build step that cannot fail is decoration: these throw, which makes
// the deploy fail rather than publish a site that quietly lost its previews.
const slugs = new Set(made.map((m) => m.slug))
if (slugs.size !== posts.length) throw new Error('postbuild-meta: slug collision')
if (made.length !== posts.length) throw new Error('postbuild-meta: page count mismatch')
for (const m of made) {
  if (!m.description.trim()) throw new Error(`postbuild-meta: empty description ${m.slug}`)
  if (m.description.length > LIMIT) {
    throw new Error(`postbuild-meta: description ${m.description.length} > ${LIMIT} for ${m.slug}`)
  }
  const file = readFileSync(path.join(dist, 'blog', m.slug, 'index.html'), 'utf8')
  if (!file.includes(`content="${esc(m.title)}"`)) {
    throw new Error(`postbuild-meta: og:title missing from ${m.slug}`)
  }
}
const longest = made.reduce((a, m) => Math.max(a, m.description.length), 0)
console.log(
  `postbuild-meta: ${made.length} of ${posts.length} post pages, descriptions ${longest} of ${LIMIT} chars, ${slugs.size} distinct slugs`
)
