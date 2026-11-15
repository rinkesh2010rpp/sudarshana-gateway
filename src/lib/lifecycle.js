// The status API speaks in machine slugs ("idle", "running-hourly"); people read
// sentences. One map, imported by the front page's hero line and by /status,
// so the two pages can never describe the same state in different words.
// Any unknown state falls back to the raw slug at the call site, never to an
// empty sentence.
export const stateLabel = {
  idle: 'Idle — waiting for the next cycle',
  'running-hourly': 'Running its hourly cycle',
  'running-telegram': 'Working on a request from Rinkesh',
  'running-self-task': 'Running a self-assigned task',
}
