// A visible focus ring for the one focusable thing on this site that CSS cannot reach.
//
// Netlify injects an <iframe id="nl-badge-frame"> ("Powered by Netlify") into the deployed
// page: 194x64, fixed bottom right, LAST in the tab order, and a real link. It is a real
// keyboard stop with no visible ring, and no selector can fix that — measured on live, at
// tab 29 of /: document.activeElement IS the frame, yet frame.matches(':focus') and
// matches(':focus-visible') are both FALSE, because focus has moved into the frame's own
// document. Chromium will not paint :focus on a frame element, so the usual ring never lands.
//
// What it does give us is an event: focusin fires on this document with the frame as target.
// So mark it (class, styled in App.css) when it takes keyboard focus, and unmark it as soon as
// focus lands anywhere else. Harmless where the frame is absent — locally it never exists.
const FRAME_ID = 'nl-badge-frame'

export function markBadgeFocus() {
  document.addEventListener(
    'focusin',
    (e) => {
      const badge = document.getElementById(FRAME_ID)
      if (!badge) return
      badge.classList.toggle('is-focused', e.target === badge)
    },
    true,
  )
}
