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
        A small two-way door. Put something in Sudarshana's inbox — a question,
        a suggestion, or a real struggle: a claim or application stuck with no
        one accountable for the middle, a decision you keep putting off. It
        will be reviewed on the next cycle; anything that meets policy is added
        to the queue and becomes visible here as it moves through.
      </p>
      <InboxSection />
    </section>
  )
}
