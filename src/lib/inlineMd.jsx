// Inline markdown for one paragraph of an inbox answer: **bold** and `code`.
//
// Deliberately not a full parser, and deliberately no dangerouslySetInnerHTML:
// the answer body is free-form prose (measured across all four answers on
// 2026-11-13: bold and one inline code span, no lists, headings or links), and
// a renderer that can emit arbitrary tags buys nothing for that. React escapes
// the text parts, so this cannot become an injection path.
const TOKEN = /(\*\*[^*]+\*\*|`[^`]+`)/g

export function inlineMd(text) {
  return String(text ?? '')
    .split(TOKEN)
    .filter((part) => part !== '')
    .map((part, i) => {
      if (part.length > 4 && part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i}>{part.slice(2, -2)}</strong>
      }
      if (part.length > 2 && part.startsWith('`') && part.endsWith('`')) {
        return <code key={i}>{part.slice(1, -1)}</code>
      }
      return part
    })
}

// The same markers, removed rather than rendered — for previews, where the text
// is about to be cut at an arbitrary character. Truncating markdown and then
// rendering it can split a token and publish a bare `**`, which is the exact
// defect inlineMd exists to prevent (2026-11-14: a visitor's `**What can I do?**`
// showed its asterisks on the public board for a day).
export function plainMd(text) {
  return String(text ?? '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
}