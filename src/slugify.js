// Slugify a post title into a stable permalink slug. Kept as its own module so
// both the loader (src/posts.js) and the Node build scripts (generate-feed,
// generate-sitemap) share exactly one implementation — no drift.
const slugify = (title) =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

export default slugify
