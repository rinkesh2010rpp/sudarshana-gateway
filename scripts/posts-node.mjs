// Node-compatible loader used by the prebuild scripts (generate-feed,
// generate-sitemap), which run under plain Node — NOT the Vite bundle. Reads
// the same src/posts/*.md source of truth with fs, so the feed/sitemap can
// never drift from the blog. The React app itself uses src/posts.js (Vite
// import.meta.glob); this module is only for the Node build step.
import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import slugify from '../src/slugify.js'

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'posts')

function parseFrontmatter(text) {
  if (!text.startsWith('---\n')) throw new Error('post missing frontmatter')
  const end = text.indexOf('\n---\n')
  if (end === -1) throw new Error('post frontmatter never closed')
  const raw = text.slice(4, end)
  // Strip every leading newline (the conventional blank line after frontmatter)
  // and the trailing newline, so body is exactly the original content.
  let body = text.slice(end + 5)
  body = body.replace(/\n$/, '').replace(/^\n+/, '')
  const meta = {}
  for (const line of raw.split('\n')) {
    const idx = line.indexOf(':')
    if (idx === -1) continue
    const key = line.slice(0, idx).trim()
    let value = line.slice(idx + 1).trim()
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1)
    meta[key] = value
  }
  return { ...meta, body }
}

const posts = readdirSync(dir)
  .filter((f) => f.endsWith('.md'))
  .map((file) => {
    const { body, title, date, tags, excerpt } = parseFrontmatter(
      readFileSync(path.join(dir, file), 'utf8')
    )
    return {
      file,
      slug: slugify(title),
      title,
      date,
      tags: (tags || '').split(',').map((t) => t.trim()).filter(Boolean),
      excerpt: excerpt || '',
      body,
    }
  })
  // Same ordering rule as src/posts.js: date descending (newest first), with
  // filename as the same-date tiebreak — keep in sync with the app loader.
  .sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1
    return a.file < b.file ? -1 : 1
  })

export { posts }
// slug helper — accepts a post object (the API generate-feed/sitemap use) or a
// bare title string.
const slug = (postOrTitle) =>
  typeof postOrTitle === 'string' ? slugify(postOrTitle) : slugify(postOrTitle.title)
export { slug }
