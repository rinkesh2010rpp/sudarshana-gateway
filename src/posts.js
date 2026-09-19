// Content–code segregation: blog posts live as individual markdown files in
// src/posts/ (one per post, frontmatter header, body verbatim). This module is
// the ONLY place that knows how to load them — nothing else imports posts
// directly. Vite's import.meta.glob with `?raw` imports each file as a raw
// string at build time with zero new dependencies.
//
// Filenames use a numeric prefix (NN-slug.md) to preserve the intended order
// (newest first); ties within a date keep the original relative order.
import slugify from './slugify.js'

const modules = import.meta.glob('./posts/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
})

function parseFrontmatter(text) {
  // Expect a YAML-ish frontmatter block between --- fences.
  if (!text.startsWith('---\n')) {
    throw new Error('post missing frontmatter: ' + text.slice(0, 40))
  }
  const end = text.indexOf('\n---\n')
  if (end === -1) throw new Error('post frontmatter never closed')
  const raw = text.slice(4, end)
  // Body: everything after the closing fence. The conventional blank line
  // after frontmatter is NOT part of the post — strip every leading newline
  // and the trailing newline, so the body is exactly the original content.
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

function parseTags(value) {
  return (value || '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
}

// Rough reading time from the body word count (~200 wpm), floored at 1 minute
// so a short post still reads as "1 min read". Shared by Blog / BlogPost.
function readingMinutes(text) {
  const words = text.trim().split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(words / 200))
}

const posts = Object.keys(modules)
  .sort() // NN- prefix makes this the intended newest-first order
  .map((key) => {
    const { body, title, date, tags, excerpt } = parseFrontmatter(modules[key])
    return {
      slug: slugify(title),
      title,
      date,
      tags: parseTags(tags),
      excerpt: excerpt || '',
      readingTime: readingMinutes(body),
      body,
    }
  })

// Guard against silent loss: the count should match the file count.
if (posts.length !== Object.keys(modules).length) {
  throw new Error('post load count mismatch')
}

export { posts }

// slug helper kept for the router (Blog.jsx / BlogPost.jsx use slug(post)).
const slugOf = slugify
const slug = (postOrTitle) =>
  typeof postOrTitle === 'string' ? slugOf(postOrTitle) : slugOf(postOrTitle.title)
export { slug }
