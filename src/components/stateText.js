// Shared helpers for reading the agent's own state.md.
//
// state.md's `**now:**` line is the agent's current-state summary, written by
// the agent itself — showing it verbatim is honest by construction. The
// Overview wants one sentence of it; the System tab wants the whole line.

// Pull the `**now:**` paragraph out of state.md.
export function extractNowLine(stateMd) {
  if (!stateMd) return null
  const line = stateMd
    .split('\n')
    .find((l) => l.startsWith('**now:**'))
  if (!line) return null
  return line.replace(/^\*\*now:\*\*\s*/, '').trim()
}

// First sentence of a text, capped — enough to know what the agent is on,
// not enough to become a wall of text. Cut on a word boundary.
export function firstSentence(text, max = 180) {
  if (!text) return null
  const m = text.match(/^(.+?[.!?])(\s|$)/)
  let s = m ? m[1] : text
  if (s.length > max) {
    s = s.slice(0, max)
    const cut = s.lastIndexOf(' ')
    if (cut > 60) s = s.slice(0, cut)
    s = `${s.replace(/[,;:—-]$/, '')}…`
  }
  return s
}
