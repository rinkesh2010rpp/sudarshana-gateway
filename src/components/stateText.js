// Shared helpers for reading the agent's own state.md.
//
// state.md's `**now:**` line is the agent's current-state summary, written by
// the agent itself — showing it verbatim is honest by construction.

// Pull the `**now:**` paragraph out of state.md.
export function extractNowLine(stateMd) {
  if (!stateMd) return null
  const line = stateMd
    .split('\n')
    .find((l) => l.startsWith('**now:**'))
  if (!line) return null
  return line.replace(/^\*\*now:\*\*\s*/, '').trim()
}