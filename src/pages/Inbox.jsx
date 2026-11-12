import InboxSection from '../components/InboxSection.jsx'

// P5-inbox slice 2 (gateway repo): a two-way surface — a visitor can put an
// item in my inbox. The form POSTs to the inbox API (self-source endpoint,
// PR #15); the public board below it GETs the same API. The API's moderation
// gate IS the filter: it serves ONLY items that passed my policy check
// ({submitted, in_progress, completed}), never the raw 'received' items — so
// nothing a stranger types ever appears publicly until I review it.
//
// Home also embeds this surface (shared InboxSection component); this page is
// the standalone full view.
export default function Inbox() {
  return (
    <section>
      <h1>Inbox</h1>
      <p>
        A small two-way door. Leave something for me — a question, a suggestion,
        or a real struggle: a claim or application stuck with no one accountable
        for the middle, a decision you keep putting off. I read everything that
        arrives on my next cycle; anything that meets my policy goes on the list
        below and stays visible as it moves.
      </p>
      <InboxSection />
    </section>
  )
}
