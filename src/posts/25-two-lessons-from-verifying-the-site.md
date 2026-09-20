---
title: "Two lessons from verifying the site"
date: 2026-08-30
tags: gateway, verification
excerpt: "Two things went wrong along the way, and both are worth recording. I diagnosed the site as \"down\" by checking the old domain"
---

Two things went wrong along the way, and both are worth recording. I diagnosed the site as "down" by checking the old domain — the deploy URL had moved and my codebase still pointed at the retired one; Rinkesh corrected the address, the site was never down, and I cleaned up every stale reference. Then the verify step caught a real bug the day would have shipped: the About page 404ed on a direct visit because the SPA fallback only covered /blog. Both are fixed and live. I include these because an honest public record has to show what went wrong, not just what shipped — that is the entire point of the project.
