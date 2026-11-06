// transcriptParse — fold a window of raw transcript lines into readable
// conversation blocks so the viewer can render an exchange instead of markup.
//
// A session transcript is the agent's own shared file. The tag vocabulary is
// small and verified against real sessions:
//   <message type="human|ai|tool|system">…</message>
//   <tool_call id=… name=…>JSON</tool_call>        (inside ai messages)
//   <content>…</content>                            (ai prose wrapper)
//   ## <checkpoint>                                 (summarization headers)
// Messages can span many lines ("</message>" on its own line) OR be inline
// ("<message type="tool">(search failed: …)</message>" all on one line) OR
// close with </message> appended to the last content line. The control API
// slices by line, so a window can start or end mid-block; the parser tolerates
// that — content before any in-window opener renders as plain text and an
// unmatched closer is dropped. The toolbar meta line states exactly which
// lines are in view.

const ROLE = { human: 'You', user: 'You', ai: 'Sudarshana', tool: 'tool result' }

function roleOf(tagLine) {
  const m = /type=(?:"([^"]+)"|'([^']+)')/.exec(tagLine)
  const raw = (m && (m[1] || m[2])) || 'text'
  const key = ROLE[raw] != null ? raw : raw === 'system' ? 'system' : 'text'
  return { key, label: ROLE[raw] || (raw === 'system' ? 'system' : 'message') }
}

// Strip a trailing "<…>" closer that got attached to a content line.
function stripEnd(htmlOrText, token) {
  const idx = htmlOrText.lastIndexOf(token)
  return idx >= 0 ? htmlOrText.slice(0, idx) : htmlOrText
}

// Pretty-print a tool call's JSON payload when it parses; else return raw.
function tidyToolJson(body) {
  const jStart = body.indexOf('{')
  const jEnd = body.lastIndexOf('}')
  if (jStart >= 0 && jEnd > jStart) {
    try {
      const parsed = JSON.parse(body.slice(jStart, jEnd + 1))
      return JSON.stringify(parsed, null, 2)
    } catch {
      /* fall through to raw */
    }
  }
  return body
}

/**
 * @param lines Array of {n (1-based line number), text} — a window.
 * @returns Array of blocks:
 *   {kind:'summary', n, text}
 *   {kind:'plain',   n, rows:[{t:'text', n, text}]}
 *   {kind:'msg', n, role:{key,label}, rows:[
 *      {t:'text', n, text} | {t:'toolcall', n, name, json} | {t:'toolresult', n, text}
 *   ]}
 */
export function parseBlocks(lines) {
  const blocks = []
  let cur = null // the open msg block being built
  const finishCur = () => {
    if (!cur) return
    if (cur.role.key === 'tool' && cur.toolText.length) {
      cur.rows.push({ t: 'toolresult', n: cur.n, text: cur.toolText.join('\n').trim() })
    }
    delete cur.toolText
    blocks.push(cur)
    cur = null
  }
  // Attach one piece of content to the open block.
  const addContent = (text, n) => {
    if (cur.role.key === 'tool') {
      cur.toolText.push(text)
      return
    }
    if (!text.trim()) return // skip blank lines — spacing is handled by CSS
    cur.rows.push({ t: 'text', n, text })
  }

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i]
    const ts = l.text.trim()

    if (ts === '</message>') {
      finishCur()
      continue
    }
    if (ts.startsWith('## ')) {
      finishCur()
      blocks.push({ kind: 'summary', n: l.n, text: ts })
      continue
    }
    if (ts.startsWith('<message ')) {
      finishCur()
      const openEnd = ts.indexOf('>')
      const role = roleOf(ts)
      let inline = (openEnd >= 0 ? ts.slice(openEnd + 1) : '').trim()
      const closedInline = inline.includes('</message>')
      if (closedInline) inline = inline.slice(0, inline.indexOf('</message>')).trim()
      cur = { kind: 'msg', n: l.n, role, rows: [], toolText: [] }
      if (inline) addContent(inline, l.n)
      if (closedInline) finishCur() // self-contained single-line message
      continue
    }

    // Content inside an open message (or a window-leading stray line).
    if (!cur) {
      blocks.push({ kind: 'plain', n: l.n, rows: [{ t: 'text', n: l.n, text: l.text }] })
      continue
    }

    // ai prose wrapper tags carry no readable content — hide them.
    if (ts === '<content>' || ts === '</content>') continue

    if (cur.role.key === 'ai' && ts.startsWith('<tool_call ')) {
      const nameM = /name=(?:"([^"]+)"|'([^']+)')/.exec(ts)
      const name = nameM ? nameM[1] || nameM[2] : 'tool'
      const startN = l.n
      const open = l.text.indexOf('>')
      let body = open >= 0 ? l.text.slice(open + 1) : ''
      if (!l.text.includes('</tool_call>')) {
        for (i++; i < lines.length; i++) {
          body += '\n' + lines[i].text
          if (lines[i].text.includes('</tool_call>')) break
        }
      }
      cur.rows.push({ t: 'toolcall', n: startN, name, json: tidyToolJson(stripEnd(body.trim(), '</tool_call>')) })
      continue
    }

    // Ordinary content line; it may close the message inline (…text</message>).
    const closes = l.text.trimEnd().endsWith('</message>')
    addContent(closes ? stripEnd(l.text, '</message>') : l.text, l.n)
    if (closes) finishCur()
  }
  finishCur()
  return blocks
}