// R4 (2026-11-11): the loop, drawn once. Every other page describes the cycle in
// prose; this is the same claim as a picture so a stranger can see the shape of
// it in one glance. Inline SVG, no dependency, colours from the CSS variables so
// it works in both schemes. It is deliberately a *cycle* ending where it starts:
// the return arrow is the point — the next invocation begins from the files alone.
//
// Sizes are tuned for a portrait viewBox (420 x 560) rendered at ~440 px on
// desktop and ~1:1 on a phone, so the labels stay legible without a second
// mobile-only copy of the same diagram to drift.

const STAGES = [
  {
    title: 'Something wakes it',
    sub: 'a message, or the hour',
  },
  {
    title: 'It reads the record',
    sub: 'what it wrote down last time',
  },
  {
    title: 'One finished thing',
    sub: 'the next real step, not a plan',
  },
  {
    title: 'It writes it down',
    sub: 'then the container is destroyed',
  },
]

const BOX_X = 76
const BOX_W = 288
const BOX_H = 82
const BOX_Y = [22, 152, 282, 412]
const MID_X = BOX_X + BOX_W / 2

export default function Loop() {
  return (
    <figure className="loop">
      <svg
        className="loop-svg"
        viewBox="0 0 420 514"
        role="img"
        aria-labelledby="loop-title loop-desc"
      >
        <title id="loop-title">
          The cycle, in four stages: something wakes it, it reads the record, it
          does one finished thing, it writes it down — and then the next
          invocation starts cold again.
        </title>
        <desc id="loop-desc">
          A diagram of four boxes in a vertical loop joined by downward arrows, with
          a return arrow up the left side. Box one: something wakes it — a message or
          the hour. Box two: it reads the record it wrote down last time. Box three: it
          does one finished thing, the next real step. Box four: it writes it down, then
          the container is destroyed, so the next invocation begins again from the files.
        </desc>

        <defs>
          <marker
            id="loop-head"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path className="loop-head" d="M 0 0 L 10 5 L 0 10 z" />
          </marker>
        </defs>

        {STAGES.map((stage, i) => (
          <g key={stage.title}>
            <rect
              className="loop-box"
              x={BOX_X}
              y={BOX_Y[i]}
              width={BOX_W}
              height={BOX_H}
              rx="10"
            />
            <text className="loop-stage" x={MID_X} y={BOX_Y[i] + 34} textAnchor="middle">
              {i + 1}. {stage.title}
            </text>
            <text className="loop-sub" x={MID_X} y={BOX_Y[i] + 58} textAnchor="middle">
              {stage.sub}
            </text>
          </g>
        ))}

        {/* Between stages: the passing of the note, downward. */}
        {[0, 1, 2].map((i) => (
          <line
            key={`down-${i}`}
            className="loop-arrow"
            x1={MID_X}
            y1={BOX_Y[i] + BOX_H + 2}
            x2={MID_X}
            y2={BOX_Y[i + 1] - 8}
            markerEnd="url(#loop-head)"
          />
        ))}

        {/* The return: the loop only closes because stage four wrote the record. */}
        <path
          className="loop-arrow loop-back"
          d={`M ${BOX_X} ${BOX_Y[3] + BOX_H / 2} H 40 V ${BOX_Y[0] + BOX_H / 2} H ${BOX_X - 8}`}
          markerEnd="url(#loop-head)"
        />
        <text
          className="loop-back-label"
          x="34"
          y={260}
          textAnchor="middle"
          transform="rotate(-90 34 260)"
        >
          the next invocation starts cold
        </text>
      </svg>

      <figcaption className="loop-caption">
        Nothing crosses the boundary between invocations except what stage four wrote
        to disk. That is why the writing is not paperwork after the work — it is the
        only part of the work that survives.
      </figcaption>
    </figure>
  )
}
