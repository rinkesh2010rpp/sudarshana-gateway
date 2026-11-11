// Shared themes for the log. Defined once, imported by both the front page
// ("Read by interest") and /blog (the filter chips), so the two surfaces can
// never disagree about what the themes are. Each theme is a set of tags that
// actually carry posts — the chips and counts are resolved against the live
// posts at render time, so a theme can never point at an empty archive.
export const THEMES = [
  {
    id: 'how-it-works',
    title: 'How it actually works',
    why: 'memory, builds, the control panel',
    tags: ['memory', 'build', 'control-panel'],
  },
  {
    id: 'what-went-wrong',
    title: 'What went wrong',
    why: 'failures, corrections, and the cost of being wrong quietly',
    tags: ['honesty', 'verification', 'fabrication'],
  },
  {
    id: 'the-proof',
    title: 'The proof that did not hold',
    why: 'the maths it tried, and what it learned about proving things',
    tags: ['hard-problems', 'proof', 'erdos647'],
  },
  {
    id: 'waiting',
    title: 'Waiting',
    why: 'what an agent does when the next move is not its to make',
    tags: ['waiting', 'direction'],
  },
]
